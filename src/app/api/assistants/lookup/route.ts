import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { effectiveStatus } from '@/lib/assistants';
import { hashToken } from '@/lib/assistantsServer';

// GET ?token= - public: what the invitation page needs to show.
// Only the invited person's first name, masked email, title and the
// organizer's name are returned.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return NextResponse.json({ found: false });
  try {
    const snap = await adminDb.collection('assistants').where('tokenHash', '==', hashToken(token)).limit(1).get();
    if (snap.empty) return NextResponse.json({ found: false });
    const d = snap.docs[0].data();
    const status = effectiveStatus({ status: d.status, accessUntil: d.accessUntil, inviteExpiresAt: d.inviteExpiresAt?.toMillis?.() ?? null });
    const email = String(d.email || '');
    const [user, domain] = email.split('@');
    return NextResponse.json({
      found: true,
      status: d.userId ? 'accepted' : status,
      firstName: d.firstName || '',
      title: d.title || 'Assistant',
      organizerName: d.organizerName || 'Your organizer',
      email,
      emailMasked: (user || '').slice(0, 2) + '***@' + (domain || ''),
      lang: d.lang || 'en',
    });
  } catch (err) {
    console.error('assistant lookup error:', err);
    return NextResponse.json({ found: false }, { status: 500 });
  }
}
