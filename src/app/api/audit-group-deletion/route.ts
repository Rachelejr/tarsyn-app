import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Read-only diagnostic endpoint: for a given groupId, scans every collection
// that plausibly stores group-linked data and reports how many documents
// exist. Used BEFORE building a delete-group endpoint, so we know exactly
// which collections/subcollections need to be cleaned up and don't leave
// orphaned data behind.
export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get('groupId');
    if (!groupId) {
      return NextResponse.json({ error: 'groupId query param is required' }, { status: 400 });
    }

    const report: any = { groupId };

    // 1. The group document itself
    const groupDoc = await adminDb.collection('groups').doc(groupId).get();
    report.groupExists = groupDoc.exists;
    report.groupName = groupDoc.exists ? (groupDoc.data() as any)?.name || '(no name)' : null;

    // 2. Members linked by groupId field
    const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
    report.membersCount = membersSnap.size;
    report.memberIds = membersSnap.docs.map((d) => d.id);

    // Helper to safely count a collection filtered by groupId, without
    // throwing if the collection doesn't exist or the field isn't indexed.
    async function countByGroupId(collectionName: string) {
      try {
        const snap = await adminDb.collection(collectionName).where('groupId', '==', groupId).get();
        return snap.size;
      } catch (e: any) {
        return `error: ${e.message}`;
      }
    }

    // 3. Other plausible group-linked collections
    report.paymentsCount = await countByGroupId('payments');
    report.contributionsCount = await countByGroupId('contributions');
    report.documentsCount = await countByGroupId('documents');
    report.auditLogsCount = await countByGroupId('audit_logs');
    report.messagesCount = await countByGroupId('messages');
    report.chatCount = await countByGroupId('chats');
    report.testimonialsCount = await countByGroupId('testimonials');
    report.remindersCount = await countByGroupId('reminders');

    // 4. paymentGrids collection: doc id may equal groupId directly
    const paymentGridDoc = await adminDb.collection('paymentGrids').doc(groupId).get();
    report.paymentGridDocExists = paymentGridDoc.exists;
    if (paymentGridDoc.exists) {
      const memberViewsSnap = await adminDb
        .collection('paymentGrids')
        .doc(groupId)
        .collection('memberViews')
        .get();
      report.paymentGridMemberViewsCount = memberViewsSnap.size;
    }

    // 5. Invite codes, if stored in their own collection
    report.inviteCodesCount = await countByGroupId('inviteCodes');

    return NextResponse.json(report, { status: 200 });
  } catch (e: any) {
    console.error('audit-group-deletion error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
