import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getAuthedUid } from '@/lib/apiAuth';
import { effectiveStatus } from '@/lib/assistants';
import { hashToken, ORGANIZER_ROLES } from '@/lib/assistantsServer';

// POST {token} - the signed-in invited person accepts. The account email
// must be the invited email. Links the account to the organizer.
export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;
    const { token } = await req.json().catch(() => ({ token: '' }));
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,80}$/.test(token)) {
      return NextResponse.json({ error: 'This invitation link is not valid.' }, { status: 400 });
    }
    const snap = await adminDb.collection('assistants').where('tokenHash', '==', hashToken(token)).limit(1).get();
    if (snap.empty) return NextResponse.json({ error: 'This invitation link is not valid any more.' }, { status: 404 });
    const ref = snap.docs[0].ref;
    const a = snap.docs[0].data();
    const status = effectiveStatus({ status: a.status, accessUntil: a.accessUntil, inviteExpiresAt: a.inviteExpiresAt?.toMillis?.() ?? null });
    if (a.userId) return NextResponse.json({ error: 'This invitation was already accepted.' }, { status: 409 });
    if (status !== 'invited') return NextResponse.json({ error: 'This invitation has expired or was cancelled. Ask your organizer for a new one.' }, { status: 410 });

    const user = await adminAuth.getUser(uid);
    if ((user.email || '').toLowerCase() !== String(a.email).toLowerCase()) {
      return NextResponse.json({ error: 'Please sign in with the invited email address (' + a.email + ').' }, { status: 403 });
    }
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const role = String(userSnap.data()?.role || '');
    if (ORGANIZER_ROLES.includes(role)) {
      return NextResponse.json({ error: 'This account is an organizer account and cannot be an assistant.' }, { status: 409 });
    }
    // Already the assistant of another organizer?
    const other = await adminDb.collection('assistants').where('userId', '==', uid).get();
    if (other.docs.some(d => d.data().status !== 'removed')) {
      return NextResponse.json({ error: 'This account is already an assistant of another organizer.' }, { status: 409 });
    }

    await userRef.set({
      name: `${a.firstName} ${a.lastName}`.trim(),
      email: user.email,
      role: 'assistant',
      assistantOf: a.organizerId,
      assistantId: ref.id,
      ...(userSnap.exists ? {} : { createdAt: new Date().toISOString() }),
    }, { merge: true });
    await ref.update({ status: 'active', userId: uid, acceptedAt: FieldValue.serverTimestamp(), tokenHash: FieldValue.delete() });

    await adminDb.collection('audit_logs').add({
      organizerId: a.organizerId, category: 'Assistant', action: 'Assistant accepted the invitation',
      user: user.email, details: `${a.firstName} ${a.lastName} (${a.title})`,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, organizerName: a.organizerName || '' });
  } catch (err) {
    console.error('assistant accept error:', err);
    return NextResponse.json({ error: 'Could not accept the invitation. Please try again.' }, { status: 500 });
  }
}
