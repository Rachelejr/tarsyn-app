import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    // The caller must be signed in, and can only act for their own account.
    const authedUid = await getAuthedUid(req);
    if (typeof authedUid !== 'string') return authedUid;
    if (userId !== authedUid) return forbidden('You can only do this for your own account.');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    await adminAuth.revokeRefreshTokens(userId);

    await adminDb.collection('login_history').add({
      userId,
      action: 'Signed out of all devices',
      device: 'System action',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to revoke sessions' }, { status: 500 });
  }
}
