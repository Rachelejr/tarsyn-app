import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Callable directly from the browser address bar:
// /api/backfill-register?groupId=XXX&confirm=true
export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get('groupId');
    const confirm = req.nextUrl.searchParams.get('confirm');

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId. Usage: ?groupId=XXX&confirm=true' }, { status: 400 });
    }
    if (confirm !== 'true') {
      return NextResponse.json({
        error: 'This will write historical payment records to the Register. Add &confirm=true to proceed.',
      }, { status: 400 });
    }

    const gridSnap = await adminDb.collection('paymentGrids').doc(groupId + '_current').get();
    if (!gridSnap.exists) {
      return NextResponse.json({ error: 'No payment grid found for this group.' }, { status: 404 });
    }
    const grid = gridSnap.data() as any;
    const slots: Record<string, any> = grid.slots || {};
    const weeks: Record<string, string> = grid.weeks || {};
    const payments: Record<string, Record<string, boolean>> = grid.payments || {};

    const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
    const membersById: Record<string, any> = {};
    membersSnap.docs.forEach(d => { membersById[d.id] = { id: d.id, ...d.data() }; });

    let written = 0;
    const writes: Promise<any>[] = [];

    Object.entries(slots).forEach(([slotNum, slot]: [string, any]) => {
      const memberId = slot.memberId;
      const member = membersById[memberId];
      Object.entries(weeks).forEach(([weekIdx, weekDate]) => {
        const isPaid = payments[slotNum]?.[weekIdx];
        if (!isPaid) return;
        const cycleNumber = parseInt(weekIdx, 10) + 1;
        const registerDocId = memberId + '_cycle' + cycleNumber;
        writes.push(
          adminDb.collection('payments').doc(registerDocId).set({
            organizerId: grid.organizerId || '',
            memberId,
            memberName: slot.memberName || member?.fullName || member?.name || '',
            amount: member?.expectedAmount || 0,
            currency: member?.currency || 'USD',
            paymentDate: weekDate,
            paymentMethod: 'Grid',
            status: 'confirmed',
            cycle: 'Cycle ' + cycleNumber,
            contributionType: 'Weekly Contribution',
            notes: 'Backfilled from Payment Grid history (W' + weekIdx + ')',
            recordedBy: 'system-backfill',
            createdAt: new Date(),
          }, { merge: true })
        );
        written++;
      });
    });

    await Promise.all(writes);

    return NextResponse.json({
      success: true,
      groupId,
      recordsWritten: written,
      message: 'Backfill complete. Existing records were merged, not duplicated.',
    });
  } catch (e: any) {
    console.error('backfill-register error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
