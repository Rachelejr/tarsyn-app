import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Bulk-fix endpoint: resets expectedAmount to the group's normal per-share
// contribution amount for any member whose expectedAmount looks corrupted
// (more than 3x or less than 0.34x the expected value based on shares).
// Without &confirm=true, this only PREVIEWS the changes - nothing is written.
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
      null;

    if (normalAmount == null) {
      return NextResponse.json({ error: 'Could not determine the group normal contribution amount' }, { status: 400 });
    }

    const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    const toFix: any[] = [];

    for (const m of members) {
      const shares = Math.max(1, parseInt(m.shares) || 1);
      const expected = typeof m.expectedAmount === 'number' ? m.expectedAmount : null;
      const correctAmount = normalAmount * shares;

      const isCorrupted =
        expected == null ||
        (correctAmount > 0 && (expected / correctAmount > 3 || expected / correctAmount < 0.34));

      if (isCorrupted) {
        toFix.push({
          memberId: m.id,
          name: m.fullName || m.name || '(no name)',
          oldExpectedAmount: expected,
          newExpectedAmount: correctAmount,
        });
      }
    }

    if (!confirm) {
      return NextResponse.json({
        preview: true,
        message: 'This is a preview only. Add &confirm=true to apply these changes.',
        groupId,
        groupNormalAmountPerShare: normalAmount,
        wouldFixCount: toFix.length,
        wouldFix: toFix,
      });
    }

    for (const item of toFix) {
      await adminDb.collection('members').doc(item.memberId).update({
        expectedAmount: item.newExpectedAmount,
      });
    }

    try {
      await adminDb.collection('audit_logs').add({
        organizerId: groupData.organizerId || null,
        category: 'System',
        action: 'Bulk-fixed corrupted expectedAmount values',
        user: 'system (fix-member-amounts endpoint)',
        details: 'Fixed ' + toFix.length + ' member(s) in group ' + groupId,
        createdAt: new Date(),
      });
    } catch (auditErr) { /* silent - audit logging must never block the fix */ }

    return NextResponse.json({
      success: true,
      groupId,
      fixedCount: toFix.length,
      fixed: toFix,
    });
  } catch (e: any) {
    console.error('fix-member-amounts error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}