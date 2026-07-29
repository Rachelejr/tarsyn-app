import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Read-only diagnostic endpoint: scans EVERY group on the platform and
// flags any member whose expectedAmount looks corrupted relative to that
// group's normal per-share contribution amount. This is the multi-group
// version of /api/audit-member-amounts, used to find out how widespread
// this data issue is instead of checking one group at a time.
export async function GET(req: NextRequest) {
  try {
    const groupsSnap = await adminDb.collection('groups').get();
    const results: any[] = [];
    let totalFlagged = 0;

    for (const groupDoc of groupsSnap.docs) {
      const groupId = groupDoc.id;
      const groupData = groupDoc.data() as any;
      const normalAmount =
        groupData?.contributionSettings?.amount ??
        groupData?.contribution ??
        groupData?.amountPerMember ??
        groupData?.weeklyAmount ??
        null;

      if (normalAmount == null) {
        results.push({
          groupId,
          groupName: groupData.name || '(no name)',
          skipped: true,
          reason: 'Could not determine group normal contribution amount',
        });
        continue;
      }

      const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
      const flagged: any[] = [];

      membersSnap.docs.forEach((m) => {
        const data = m.data() as any;
        const shares = Math.max(1, parseInt(data.shares) || 1);
        const expected = typeof data.expectedAmount === 'number' ? data.expectedAmount : null;
        const expectedNormal = normalAmount * shares;

        if (expected == null) {
          flagged.push({
            memberId: m.id,
            name: data.fullName || data.name || '(no name)',
            expectedAmount: null,
            reason: 'No expectedAmount field set',
          });
        } else if (expectedNormal > 0) {
          const ratio = expected / expectedNormal;
          if (ratio > 3 || ratio < 0.34) {
            flagged.push({
              memberId: m.id,
              name: data.fullName || data.name || '(no name)',
              expectedAmount: expected,
              expectedIfNormal: expectedNormal,
              reason: 'expectedAmount is ' + ratio.toFixed(1) + 'x the group normal amount',
            });
          }
        }
      });

      if (flagged.length > 0) {
        totalFlagged += flagged.length;
        results.push({
          groupId,
          groupName: groupData.name || '(no name)',
          totalMembers: membersSnap.size,
          groupNormalAmountPerShare: normalAmount,
          flaggedCount: flagged.length,
          flagged,
        });
      }
    }

    return NextResponse.json({
      totalGroupsScanned: groupsSnap.size,
      groupsWithIssues: results.length,
      totalFlaggedMembers: totalFlagged,
      results,
    });
  } catch (e: any) {
    console.error('audit-all-groups error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
