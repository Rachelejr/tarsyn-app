import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Mirrors /api/join-lookup but reads the isolated churchMembers collection
// instead of members, and returns only the fields the public join screen
// actually needs — never the full document (no organizerId, no phone, etc.).
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const codeStr = code.trim().toUpperCase();
    const snap = await adminDb
      .collection('churchMembers')
      .where('inviteCode', '==', codeStr)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ found: false });
    }

    const memberDoc = snap.docs[0];
    const data = memberDoc.data();

    let churchName = '';
    if (data.churchId) {
      const churchSnap = await adminDb.collection('churches').doc(data.churchId).get();
      if (churchSnap.exists) churchName = churchSnap.data()?.churchName || '';
    }

    return NextResponse.json({
      found: true,
      memberId: memberDoc.id,
      fullName: data.fullName || '',
      email: data.email || '',
      churchId: data.churchId || null,
      churchName,
      role: data.role || 'Member',
      status: data.status || 'pending',
      alreadyRegistered: !!data.userId,
    });
  } catch (err: any) {
    console.error('join-church-lookup error:', err);
    return NextResponse.json({ error: err?.message || 'Lookup failed' }, { status: 500 });
  }
}
