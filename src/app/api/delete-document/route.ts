import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { documentId, userId } = await req.json();

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

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized to delete this document' }, { status: 403 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
