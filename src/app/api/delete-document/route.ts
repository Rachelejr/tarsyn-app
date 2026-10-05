import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const { documentId, userId } = await req.json();
    // The caller must be signed in, and can only act for their own account.
    const authedUid = await getAuthedUid(req);
    if (typeof authedUid !== 'string') return authedUid;
    if (userId !== authedUid) return forbidden('You can only do this for your own account.');

    if (!documentId || !userId) {
      return NextResponse.json({ error: 'Missing documentId or userId' }, { status: 400 });
    }

    const docRef = adminDb.collection('documents').doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const data = docSnap.data() as any;
    const visibleTo: string[] = Array.isArray(data.visibleTo) ? data.visibleTo : [];
    const isAuthorized = data.uploadedBy === userId || visibleTo.includes(userId);

    // Admin-issued documents (e.g. official receipts) are never deletable
    // by a member through this route, even if they are the member the
    // receipt was issued to - only the organizer can remove those.
    if (data.source === 'admin') {
      return NextResponse.json({ error: 'Admin-issued documents cannot be deleted by members' }, { status: 403 });
    }

    // Admin-issued documents (e.g. official receipts) are never deletable
    // by a member through this route, even if they are the member the
    // receipt was issued to - only the organizer can remove those.
    if (data.source === 'admin') {
      return NextResponse.json({ error: 'Admin-issued documents cannot be deleted by members' }, { status: 403 });
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized to delete this document' }, { status: 403 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
