import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Read-only diagnostic endpoint: compares each member's expectedAmount
// against the group's normal per-part contribution amount, flagging
// anything that looks like a data-entry mistake (e.g. 6200 instead of 200).
// Nothing is modified - call this by pasting the URL in a browser.
export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'Missing groupId query parameter' }, { status: 400 });
  }

  try {
    const groupSnap = await adminDb.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    const groupData = groupSnap.data() as any;
    const groupName = groupData?.name || 'Unknown';
    const normalAmount =
      groupData?.contributionSettings?.amount ??
      groupData?.contribution ??
      groupData?.amountPerMember ??
      null;

    const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    const flagged: any[] = [];
    const ok: any[] = [];

    for (const m of members) {
      const shares = Math.max(1, parseInt(m.shares) || 1);
      const expected = typeof m.expectedAmount === 'number' ? m.expectedAmount : null;
      const expectedNormal = normalAmount != null ? normalAmount * shares : null;

      const entry = {
        memberId: m.id,
        name: m.fullName || m.name || '(no name)',
        expectedAmount: expected,
        shares,
        groupNormalAmountPerShare: normalAmount,
        expectedIfNormal: expectedNormal,
      };

      if (expected == null) {
        flagged.push({ ...entry, reason: 'No expectedAmount field set' });
      } else if (expectedNormal != null && expectedNormal > 0) {
        const ratio = expected / expectedNormal;
        if (ratio > 3 || ratio < 0.34) {
          flagged.push({ ...entry, reason: 'expectedAmount is ' + ratio.toFixed(1) + 'x the group normal amount' });
        } else {
          ok.push(entry);
        }
      } else {
        ok.push(entry);
      }
    }

    return NextResponse.json({
      groupId,
      groupName,
      groupNormalAmountPerShare: normalAmount,
      totalMembers: members.length,
      flaggedCount: flagged.length,
      flagged,
      ok,
    });
  } catch (e: any) {
    console.error('audit-member-amounts error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}