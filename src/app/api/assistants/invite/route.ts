/* eslint-disable @typescript-eslint/no-explicit-any -- request body is untyped JSON. */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';
import { ASSISTANT_LANGS, ASSISTANT_TITLES, INVITE_VALID_DAYS, MAX_ASSISTANTS } from '@/lib/assistants';
import { cleanRights, listAssistants, newInviteToken, organizerIdentity, ORGANIZER_ROLES, toPublic } from '@/lib/assistantsServer';
import { sendAssistantInviteEmail } from '@/lib/assistantEmails';
import { isCountry, MEMBER_GENDERS } from '@/lib/memberOptions';

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// POST - the organizer invites an assistant (0, 1 or 2 places).
export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;
    const me = await organizerIdentity(uid);
    if (!ORGANIZER_ROLES.includes(me.role)) return forbidden('Only an organizer can invite assistants.');

    const b = await req.json().catch(() => ({} as any));
    const v = {
      firstName: clean(b.firstName, 60),
      lastName: clean(b.lastName, 60),
      gender: (MEMBER_GENDERS as readonly string[]).includes(String(b.gender)) ? String(b.gender) : '',
      email: clean(b.email, 120).toLowerCase(),
      phone: clean(b.phone, 20),
      country: clean(b.country, 60),
      title: (ASSISTANT_TITLES as readonly string[]).includes(String(b.title)) ? String(b.title) : '',
      titleOther: clean(b.titleOther, 40),
      lang: ASSISTANT_LANGS.some(l => l.value === b.lang) ? String(b.lang) : 'en',
      rights: cleanRights(b.rights),
      accessUntil: /^\d{4}-\d{2}-\d{2}$/.test(String(b.accessUntil || '')) ? String(b.accessUntil) : null,
      message: String(b.message ?? '').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').trim().slice(0, 500),
      confirmed: b.confirmed === true,
    };
    const errors: string[] = [];
    if (v.firstName.length < 2) errors.push('firstName');
    if (v.lastName.length < 2) errors.push('lastName');
    if (!v.gender) errors.push('gender');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.push('email');
    if (!/^\+?[0-9 ()-]{7,20}$/.test(v.phone)) errors.push('phone');
    if (!isCountry(v.country)) errors.push('country');
    if (!v.title || (v.title === 'Other' && v.titleOther.length < 2)) errors.push('title');
    if (v.accessUntil && v.accessUntil <= new Date().toISOString().slice(0, 10)) errors.push('accessUntil');
    if (!v.confirmed) errors.push('confirmed');
    if (errors.length) return NextResponse.json({ error: 'invalid-fields', fields: errors }, { status: 400 });

    if (me.email && v.email === me.email.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot invite yourself.' }, { status: 400 });
    }
    // An organizer account cannot also be someone's assistant.
    try {
      const existing = await adminAuth.getUserByEmail(v.email);
      const roleSnap = await adminDb.collection('users').doc(existing.uid).get();
      if (ORGANIZER_ROLES.includes(String(roleSnap.data()?.role || ''))) {
        return NextResponse.json({ error: 'This email already belongs to an organizer account. Please use another email.' }, { status: 409 });
      }
    } catch { /* no account yet: fine */ }

    const current = await listAssistants(uid);
    if (current.some(d => String(d.data().email || '').toLowerCase() === v.email)) {
      return NextResponse.json({ error: 'This person is already one of your assistants.' }, { status: 409 });
    }
    if (current.length >= MAX_ASSISTANTS) {
      return NextResponse.json({ error: `You already have ${MAX_ASSISTANTS} assistants. Remove one to invite someone else.` }, { status: 409 });
    }

    const { token, hash } = newInviteToken();
    const ref = adminDb.collection('assistants').doc();
    const title = v.title === 'Other' ? v.titleOther : v.title;
    await ref.set({
      organizerId: uid,
      organizerName: me.name,
      firstName: v.firstName, lastName: v.lastName, gender: v.gender,
      email: v.email, phone: v.phone, country: v.country,
      title, lang: v.lang, rights: v.rights, accessUntil: v.accessUntil,
      message: v.message,
      status: 'invited',
      tokenHash: hash,
      inviteExpiresAt: Timestamp.fromMillis(Date.now() + INVITE_VALID_DAYS * 864e5),
      invitedAt: FieldValue.serverTimestamp(),
      userId: null,
    });

    const link = 'https://unimunity.com/assistant/accept/' + token;
    let emailSent = false;
    try {
      await sendAssistantInviteEmail({ to: v.email, firstName: v.firstName, organizerName: me.name, title, lang: v.lang, message: v.message, link, validDays: INVITE_VALID_DAYS });
      emailSent = true;
    } catch (e) { console.error('assistant invite email failed:', e); }

    await adminDb.collection('audit_logs').add({
      organizerId: uid, category: 'Assistant', action: 'Invited an assistant',
      user: me.email, details: `${v.firstName} ${v.lastName} (${title}) - ${v.email}`,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);

    const saved = await ref.get();
    return NextResponse.json({ ok: true, emailSent, link, assistant: toPublic(ref.id, saved.data()) });
  } catch (err) {
    console.error('assistant invite error:', err);
    return NextResponse.json({ error: 'Could not send the invitation. Please try again.' }, { status: 500 });
  }
}
