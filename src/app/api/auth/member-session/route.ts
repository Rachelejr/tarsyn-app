import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Lets an organizer who is ALSO a member of one or more groups open the
// member portal with the same account (same email, same password).
// The member portal signs in on its own Firebase instance (memberAuth), so
// it needs its own session: this route hands back a short-lived custom
// token for the SAME uid, only when
//   - the caller's ID token is valid and already passed 2FA (mfa: true), and
//   - that uid is linked to at least one member record.
// It never grants access to anyone else's account.

export async function POST(req: NextRequest) {
  try {
    const header = req.headers.get('authorization') || '';
    const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!idToken) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired session. Please sign in again.' }, { status: 401 });
    }
    if (decoded.mfa !== true) {
      return NextResponse.json({ error: 'Please sign in again with your verification code.' }, { status: 403 });
    }

    const memberships = await adminDb.collection('members').where('userId', '==', decoded.uid).limit(1).get();
    if (memberships.empty) {
      return NextResponse.json({ error: 'This account is not a member of any group.' }, { status: 404 });
    }

    const token = await adminAuth.createCustomToken(decoded.uid, { mfa: true });
    return NextResponse.json({ token });
  } catch (err) {
    console.error('member-session error:', err);
    return NextResponse.json({ error: 'Could not open your member space.' }, { status: 500 });
  }
}
