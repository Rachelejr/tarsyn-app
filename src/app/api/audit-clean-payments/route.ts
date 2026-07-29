import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Read-only preview / delete endpoint: finds payment documents in the
// 'payments' collection for a given group whose amount looks corrupted
// (way above the group's normal per-share contribution amount, the same
// kind of corruption already fixed on the source members via
// fix-member-amounts). Without &confirm=true, this only PREVIEWS what
// would be deleted - nothing is touched.
export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get('groupId');
  const confirm = req.nextUrl.searchParams.get('confirm') === 'true';
  if (!groupId) {
    return NextResponse.json({ error: 'Missing groupId query parameter' }, { status: 400 });
  }

  try {
    const groupSnap = await adminDb.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    const groupData = groupSnap.data() as any;
    const normalAmount =
      groupData?.contributionSettings?.amount ??
      groupData?.contribution ??
      groupData?.amountPerMember ??
      groupData?.weeklyAmount ??
      null;

    if (normalAmount == null) {
      return NextResponse.json({ error: 'Could not determine the group normal contribution amount' }, { status: 400 });
    }

    // Get all members in this group to know each member's shares (some
    // members may have more than 1 slot, meaning a normal payment can
    // legitimately be a multiple of the base amount).
    const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
    const sharesByMemberId: Record<string, number> = {};
    membersSnap.docs.forEach((d) => {
      const data = d.data() as any;
      sharesByMemberId[d.id] = Math.max(1, parseInt(data.shares) || 1);
    });

    const paymentsSnap = await adminDb.collection('payments').where('organizerId', '==', groupData.organizerId || groupData.adminId).get();
    const toDelete: any[] = [];
    const ok: any[] = [];

    paymentsSnap.docs.forEach((d) => {
      const p = d.data() as any;
      // Only consider payments that came from the grid auto-sync, tied to
      // this group's members - not manually recorded payments, which a
      // human entered on purpose and should never be silently removed.
      if (p.paymentMethod !== 'Grid') return;
      const shares = sharesByMemberId[p.memberId];
      if (shares === undefined) return; // member not in this group

      const expectedNormal = normalAmount * shares;
      const amount = typeof p.amount === 'number' ? p.amount : 0;
      const ratio = expectedNormal > 0 ? amount / expectedNormal : 1;

      const entry = {
        paymentId: d.id,
        memberId: p.memberId,
        memberName: p.memberName,
        amount,
        expectedNormal,
        paymentDate: p.paymentDate,
        cycle: p.cycle,
      };

      if (ratio > 3 || ratio < 0.34) {
        toDelete.push({ ...entry, reason: 'amount is ' + ratio.toFixed(1) + 'x the expected normal amount for this member' });
      } else {
        ok.push(entry);
      }
    });

    if (!confirm) {
      return NextResponse.json({
        preview: true,
        message: 'This is a preview only. Add &confirm=true to delete these payment records.',
        groupId,
        groupName: groupData.name,
        groupNormalAmountPerShare: normalAmount,
        wouldDeleteCount: toDelete.length,
        wouldDelete: toDelete,
        okCount: ok.length,
      });
    }

    const batch = adminDb.batch();
    toDelete.forEach((item) => {
      batch.delete(adminDb.collection('payments').doc(item.paymentId));
    });
    if (toDelete.length > 0) {
      await batch.commit();
    }

    try {
      await adminDb.collection('audit_logs').add({
        organizerId: groupData.organizerId || groupData.adminId || null,
        category: 'System',
        action: 'Bulk-deleted corrupted payment records',
        user: 'system (audit-clean-payments endpoint)',
        details: 'Deleted ' + toDelete.length + ' corrupted payment record(s) for group ' + groupId,
        createdAt: new Date(),
      });
    } catch (auditErr) { /* silent */ }

    return NextResponse.json({
      success: true,
      groupId,
      deletedCount: toDelete.length,
      deleted: toDelete,
    });
  } catch (e: any) {
    console.error('audit-clean-payments error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
