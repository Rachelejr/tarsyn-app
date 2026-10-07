/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';
import { analyzeGrid, gridNeedsRepair } from '@/lib/gridHealth';
import { normalizeFrequency } from '@/lib/dues';

// Repairs the damaged columns of a group's CURRENT payment grid (see
// lib/gridHealth). Only the group's organizer can run it. The whole grid is
// copied to paymentGridBackups first, and the members' read-only views are
// rebuilt so their portal shows the repaired grid.
//   POST { groupId, apply?: boolean }  - without apply: report only.
export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;

    const { groupId, apply } = await req.json().catch(() => ({}));
    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    const groupSnap = await adminDb.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    const group = groupSnap.data() as any;
    if (group.organizerId !== uid) return forbidden('Only the organizer of this group can repair its grid.');

    const gridId = groupId + '_current';
    const gridRef = adminDb.collection('paymentGrids').doc(gridId);
    const gridSnap = await gridRef.get();
    if (!gridSnap.exists) return NextResponse.json({ error: 'This group has no payment grid' }, { status: 404 });
    const grid = gridSnap.data() as any;

    const health = analyzeGrid(grid, { weekly: normalizeFrequency(group.frequency || group.paymentFrequency) === 'Weekly' });
    const report = {
      outOfCycle: health.outOfCycle.length,
      offCadence: health.offCadence.length,
      duplicates: health.duplicates.length,
      movedTicks: health.movedTicks.length,
      droppedTicks: health.droppedTicks.length,
      keptWeeks: Object.keys(health.weeks).length,
    };
    if (!apply || !gridNeedsRepair(health)) {
      return NextResponse.json({ needsRepair: gridNeedsRepair(health), report });
    }

    // 1. Full backup, never deleted automatically.
    const backupRef = adminDb.collection('paymentGridBackups').doc();
    await backupRef.set({
      ...grid,
      backupOf: gridId,
      groupId,
      organizerId: uid,
      reason: 'grid-repair',
      report,
      backedUpAt: FieldValue.serverTimestamp(),
    });

    // 2. Repaired grid: weeks and payments replaced as a whole.
    await gridRef.update({ weeks: health.weeks, payments: health.payments, lastRepairAt: FieldValue.serverTimestamp(), lastRepairBackupId: backupRef.id });

    // 3. Rebuild every registered member's read-only view (full overwrite,
    //    so removed columns disappear from their portal too).
    const slots: Record<string, any> = grid.slots || {};
    const slotsByMember: Record<string, string[]> = {};
    Object.entries(slots).forEach(([n, sl]: [string, any]) => {
      if (!sl?.memberId) return;
      (slotsByMember[sl.memberId] = slotsByMember[sl.memberId] || []).push(n);
    });
    const memberIds = Object.keys(slotsByMember);
    const memberDocs = await Promise.all(memberIds.map(id => adminDb.collection('members').doc(id).get()));
    await Promise.all(memberDocs.map(async (m) => {
      const userId = m.exists ? m.data()?.userId : null;
      if (!userId) return;
      const nums = slotsByMember[m.id];
      const memberPayments: Record<string, Record<string, boolean>> = {};
      nums.forEach(n => { memberPayments[n] = health.payments[n] || {}; });
      await gridRef.collection('memberViews').doc(userId).set({
        memberName: slots[nums[0]]?.memberName || m.data()?.fullName || '',
        slots: nums,
        weeks: health.weeks,
        payments: memberPayments,
        cycleNumber: grid.cycleNumber || 1,
        cycleStart: grid.startDate || '',
        cycleEnd: grid.cycleEndDate || null,
        cycleHistory: grid.cycleHistory || [],
      });
    }));

    await adminDb.collection('audit_logs').add({
      organizerId: uid, groupId, category: 'Group', action: 'Repaired payment grid',
      user: '', details: `${report.outOfCycle} out-of-cycle, ${report.offCadence} wrong-weekday, ${report.duplicates} duplicate columns removed; ${report.movedTicks} payments moved, ${report.droppedTicks} out-of-cycle ticks removed (backup ${backupRef.id})`,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);

    return NextResponse.json({ repaired: true, report, backupId: backupRef.id });
  } catch (err) {
    console.error('grid-repair error:', err);
    return NextResponse.json({ error: 'Could not repair this grid.' }, { status: 500 });
  }
}
