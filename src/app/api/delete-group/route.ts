import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Deletes a group and its members. Defaults to PREVIEW mode (no writes) —
// pass &confirm=true to actually perform the deletion.
// Only deletes: the group doc itself, and members with matching groupId.
// Other group-linked collections (payments, documents, chat, paymentGrids,
// etc.) are NOT touched by this endpoint — confirmed empty for all 5 known
// test groups via /api/audit-group-deletion before this was built. If used
// on a group with real data in those collections, extend this endpoint
// first rather than assuming it's safe.
export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get('groupId');
    const confirm = req.nextUrl.searchParams.get('confirm') === 'true';

    if (!groupId) {
      return NextResponse.json({ error: 'groupId query param is required' }, { status: 400 });
    }

    const groupRef = adminDb.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return NextResponse.json({ error: 'Group not found', groupId }, { status: 404 });
    }

    const groupName = (groupDoc.data() as any)?.name || '(no name)';

    const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
    const memberIds = membersSnap.docs.map((d) => d.id);

    if (!confirm) {
      return NextResponse.json({
        preview: true,
        message: 'Preview only. Add &confirm=true to actually delete.',
        groupId,
        groupName,
        membersToDelete: memberIds.length,
        memberIds,
      });
    }

    // Actually delete: members first, then the group doc.
    const batch = adminDb.batch();
    membersSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(groupRef);
    await batch.commit();

    return NextResponse.json({
      deleted: true,
      groupId,
      groupName,
      membersDeleted: memberIds.length,
      memberIds,
    });
  } catch (e: any) {
    console.error('delete-group error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
