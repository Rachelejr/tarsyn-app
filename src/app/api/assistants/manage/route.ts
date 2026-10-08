/* eslint-disable @typescript-eslint/no-explicit-any -- request body is untyped JSON. */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';
import { INVITE_VALID_DAYS } from '@/lib/assistants';
import { cleanRights, newInviteToken, organizerIdentity, ORGANIZER_ROLES, toPublic } from '@/lib/assistantsServer';
import { sendAssistantInviteEmail } from '@/lib/assistantEmails';

// POST - the organizer manages one of their assistants:
//   suspend | resume | remove | resend | update (rights, end date)
export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;
    const me = await organizerIdentity(uid);
    if (!ORGANIZER_ROLES.includes(me.role)) return forbidden();

    const b = await req.json().catch(() => ({} as any));
    const id = String(b.id || '');
    const action = String(b.action || '');
    if (!id || !['suspend', 'resume', 'remove', 'resend', 'update'].includes(action)) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }
    const ref = adminDb.collection('assistants').doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.organizerId !== uid) return forbidden();
    const a = snap.data() as any;
    if (a.status === 'removed') return NextResponse.json({ error: 'This assistant was removed.' }, { status: 409 });

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    let link = '';
    let label = '';
    if (action === 'suspend') { updates.status = 'suspended'; label = 'Suspended an assistant'; }
    if (action === 'resume') { updates.status = a.userId ? 'active' : 'invited'; label = 'Restored an assistant'; }
    if (action === 'remove') {
      updates.status = 'removed'; updates.tokenHash = FieldValue.delete(); updates.removedAt = FieldValue.serverTimestamp();
      label = 'Removed an assistant';
      if (a.userId) await adminDb.collection('users').doc(a.userId).set({ assistantOf: FieldValue.delete() }, { merge: true }).catch(() => undefined);
    }
    if (action === 'update') {
      updates.rights = cleanRights(b.rights);
      const until = /^\d{4}-\d{2}-\d{2}$/.test(String(b.accessUntil || '')) ? String(b.accessUntil) : null;
      updates.accessUntil = until;
      label = 'Updated an assistant\u2019s rights';
    }
    if (action === 'resend') {
      if (a.userId) return NextResponse.json({ error: 'This assistant already accepted the invitation.' }, { status: 409 });
      const t = newInviteToken();
      updates.tokenHash = t.hash;
      updates.inviteExpiresAt = Timestamp.fromMillis(Date.now() + INVITE_VALID_DAYS * 864e5);
      updates.status = 'invited';
      link = 'https://unimunity.com/assistant/accept/' + t.token;
      label = 'Resent an assistant invitation';
    }
    await ref.update(updates);

    let emailSent = false;
    if (action === 'resend') {
      try {
        await sendAssistantInviteEmail({ to: a.email, firstName: a.firstName, organizerName: me.name, title: a.title, lang: a.lang, message: a.message, link, validDays: INVITE_VALID_DAYS });
        emailSent = true;
      } catch (e) { console.error('assistant resend email failed:', e); }
    }

    await adminDb.collection('audit_logs').add({
      organizerId: uid, category: 'Assistant', action: label,
      user: me.email, details: `${a.firstName} ${a.lastName} - ${a.email}`,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);

    const fresh = await ref.get();
    return NextResponse.json({ ok: true, emailSent, link: link || undefined, assistant: toPublic(id, fresh.data()) });
  } catch (err) {
    console.error('assistant manage error:', err);
    return NextResponse.json({ error: 'Could not update this assistant.' }, { status: 500 });
  }
}
