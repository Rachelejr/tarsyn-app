import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';

// A member removes a document the organizer issued (receipt, contract...)
// from THEIR OWN list. The document itself is kept: it is the group's
// official record, and the organizer still sees it. Only the member's
// membership record remembers which documents they chose to hide.
export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;

    const { memberId, documentId } = await req.json();
    if (!memberId || !documentId || typeof memberId !== 'string' || typeof documentId !== 'string') {
      return NextResponse.json({ error: 'Missing memberId or documentId' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists || memberSnap.data()?.userId !== uid) return forbidden();

    await memberRef.update({ hiddenDocIds: FieldValue.arrayUnion(documentId) });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('member-hide-document error:', err);
    return NextResponse.json({ error: 'Could not remove this document from your list.' }, { status: 500 });
  }
}
