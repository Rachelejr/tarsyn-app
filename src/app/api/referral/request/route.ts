/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendJoinRequestEmailToOrganizer } from '@/lib/referralEmails';

// Public: a person proposed by a member asks to join the group.
// It only files a pending request - it never creates a member and never
// returns group data. Duplicates answer exactly like a success, so the
// page cannot be used to learn who is already in a group.

const CLOSED_STATUSES = ['closed', 'archived', 'deleted'];
const MAX_PENDING_PER_LINK = 10;
const MAX_PER_IP_PER_HOUR = 5;
const LANGS = ['en', 'fr', 'ht', 'es', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi'];

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanMessage = (v: unknown) => String(v ?? '').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').trim().slice(0, 500);

function validate(body: Record<string, unknown>) {
  const firstName = clean(body.firstName, 60);
  const lastName = clean(body.lastName, 60);
  const email = clean(body.email, 120).toLowerCase();
  const address = clean(body.address, 200);
  const phone = clean(body.phone, 20);
  const message = cleanMessage(body.message);
  const lang = LANGS.includes(String(body.lang)) ? String(body.lang) : 'en';
  const errors: string[] = [];
  if (firstName.length < 2) errors.push('firstName');
  if (lastName.length < 2) errors.push('lastName');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push('email');
  if (address.length < 5) errors.push('address');
  if (!/^\+?[0-9 ]{7,20}$/.test(phone)) errors.push('phone');
  return { firstName, lastName, email, address, phone, message, lang, errors };
}

/** Counts this IP for the current hour; true when the limit is passed. */
async function overIpLimit(req: NextRequest): Promise<boolean> {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const hour = new Date().toISOString().slice(0, 13);
  const key = createHash('sha256').update(ip + '|' + hour).digest('hex').slice(0, 40);
  const ref = adminDb.collection('rateLimits').doc('joinreq_' + key);
  return adminDb.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const count = snap.exists ? Number(snap.data()?.count || 0) : 0;
    if (count >= MAX_PER_IP_PER_HOUR) return true;
    tx.set(ref, { count: count + 1, hour, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return false;
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = clean(body.code, 12).toUpperCase();
    const v = validate(body);
    if (!/^[A-Z0-9]{6,12}$/.test(code)) return NextResponse.json({ error: 'invalid-link' }, { status: 404 });
    if (v.errors.length) return NextResponse.json({ error: 'invalid-fields', fields: v.errors }, { status: 400 });

    if (await overIpLimit(req)) return NextResponse.json({ error: 'rate-limited' }, { status: 429 });

    // The referral link must belong to a registered member of an open group.
    const mSnap = await adminDb.collection('members').where('referralCode', '==', code).limit(1).get();
    if (mSnap.empty) return NextResponse.json({ error: 'invalid-link' }, { status: 404 });
    const referrerDoc = mSnap.docs[0];
    const referrer = referrerDoc.data() as Record<string, any>;
    if (!referrer.userId || referrer.referralDisabled) return NextResponse.json({ error: 'invalid-link' }, { status: 404 });

    const groupId = String(referrer.groupId || '');
    const groupSnap = await adminDb.collection('groups').doc(groupId || 'none').get();
    if (!groupSnap.exists) return NextResponse.json({ error: 'invalid-link' }, { status: 404 });
    const group = groupSnap.data() as Record<string, any>;
    if (CLOSED_STATUSES.includes(String(group.status || '').toLowerCase())) return NextResponse.json({ error: 'invalid-link' }, { status: 404 });
    const organizerId = String(group.organizerId || referrer.organizerId || '');
    if (!organizerId) return NextResponse.json({ error: 'invalid-link' }, { status: 404 });

    // Too many open requests on this link.
    const pendingOnLink = await adminDb.collection('joinRequests')
      .where('referrerMemberId', '==', referrerDoc.id).where('status', '==', 'pending').get();
    if (pendingOnLink.size >= MAX_PENDING_PER_LINK) return NextResponse.json({ error: 'too-many-pending' }, { status: 429 });

    // Already pending, or already a member: answer like a success, create nothing.
    const dup = await adminDb.collection('joinRequests')
      .where('groupId', '==', groupId).where('email', '==', v.email).where('status', '==', 'pending').limit(1).get();
    if (!dup.empty) return NextResponse.json({ ok: true });
    const groupMembers = await adminDb.collection('members').where('groupId', '==', groupId).get();
    if (groupMembers.docs.some(d => String(d.data().email || '').trim().toLowerCase() === v.email)) return NextResponse.json({ ok: true });

    const referrerName = String(referrer.fullName || referrer.name || '').slice(0, 80);
    await adminDb.collection('joinRequests').add({
      groupId,
      organizerId,
      referrerMemberId: referrerDoc.id,
      referrerName,
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      address: v.address,
      phone: v.phone,
      message: v.message,
      lang: v.lang,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    // Tell the organizer. A failed email never blocks the request.
    try {
      const orgUser = await adminAuth.getUser(organizerId);
      if (orgUser.email) {
        await sendJoinRequestEmailToOrganizer({
          to: orgUser.email, groupName: group.name || 'your group', referrerName,
          firstName: v.firstName, lastName: v.lastName, message: v.message,
        });
      }
    } catch (mailErr) {
      console.error('referral/request: organizer email failed:', mailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('referral/request error:', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
