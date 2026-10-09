import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';

// A member organizes the documents the organizer issued (receipts,
// contracts...) in THEIR OWN list. The documents themselves are never
// touched: they are the group's official records and the organizer still
// sees them. Only the member's membership record remembers the choice.
//   action "hide"      -> removed from the member's list
//   action "archive"   -> moved to the member's Archive
//   action "unarchive" -> back to the member's active list
// Accepts one id (documentId) or several (documentIds, max 200).
export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;

    const body = await req.json().catch(() => ({}));
    const memberId = body.memberId;
    const action = body.action === 'archive' || body.action === 'unarchive' ? body.action : 'hide';
    const ids: string[] = (Array.isArray(body.documentIds) ? body.documentIds : [body.documentId])
      .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length < 200)
      .slice(0, 200);
    if (!memberId || typeof memberId !== 'string' || ids.length === 0) {
      return NextResponse.json({ error: 'Missing memberId or document ids' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists || memberSnap.data()?.userId !== uid) return forbidden();

    if (action === 'hide') {
      // Dated, so a receipt issued again later shows up again.
      const now = Date.now();
      const dated: Record<string, number> = {};
      ids.forEach(id => { dated['hiddenDocAt.' + id] = now; });
      await memberRef.update({ hiddenDocIds: FieldValue.arrayUnion(...ids), archivedDocIds: FieldValue.arrayRemove(...ids), ...dated });
    } else if (action === 'archive') {
      await memberRef.update({ archivedDocIds: FieldValue.arrayUnion(...ids) });
    } else {
      await memberRef.update({ archivedDocIds: FieldValue.arrayRemove(...ids) });
    }
    return NextResponse.json({ success: true, action, count: ids.length });
  } catch (err) {
    console.error('member-hide-document error:', err);
    return NextResponse.json({ error: 'Could not update your document list.' }, { status: 500 });
  }
}
