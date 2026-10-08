/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';
import {
  buildTynId, generateUniqueInviteCode, groupContributionAmount, memberLimitError, nextPositionForGroup,
} from '@/lib/memberCreate';
import { sendAcceptedInviteEmail } from '@/lib/referralEmails';
import {
  MAX_PARTS, MEMBER_COLOR_TAGS, MEMBER_ROLES, MEMBER_STATUSES, MEMBER_TYPES,
} from '@/lib/memberOptions';

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(v)) ? (String(v) as T) : fallback;
const isoDateOrEmpty = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) ? String(v) : '');

// Organizer accepts or declines a join request on one of their groups.
// Accept creates the member exactly like Add Member (same fields, TYN-ID,
// position rule, personal invite code and plan limit) and records the
// referrer in referredBy. Nothing else can create a member from a request.

export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;

    const body = await req.json().catch(() => ({}));
    const requestId = String(body.requestId || '');
    const action = body.action;
    if (!requestId || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 });
    }

    const reqRef = adminDb.collection('joinRequests').doc(requestId);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    const jr = reqSnap.data() as Record<string, any>;
    if (jr.organizerId !== uid) return forbidden();
    if (jr.status !== 'pending') return NextResponse.json({ error: 'This request was already handled.' }, { status: 409 });

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const organizerEmail = String(userSnap.data()?.email || '');

    if (action === 'decline') {
      await reqRef.update({
        status: 'declined', decidedAt: FieldValue.serverTimestamp(), decidedBy: uid,
        declineReason: String(body.reason || '').slice(0, 300),
      });
      await adminDb.collection('audit_logs').add({
        organizerId: uid, category: 'Member', action: 'Declined join request',
        user: organizerEmail, details: `${jr.firstName} ${jr.lastName}`.trim() + ' - proposed by ' + (jr.referrerName || 'a member'),
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
      return NextResponse.json({ ok: true, status: 'declined' });
    }

    // ---- accept ----
    const groupSnap = await adminDb.collection('groups').doc(String(jr.groupId || 'none')).get();
    if (!groupSnap.exists) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    const group = groupSnap.data() as Record<string, any>;
    if (group.organizerId && group.organizerId !== uid) return forbidden();

    const limitMsg = await memberLimitError(uid);
    if (limitMsg) return NextResponse.json({ error: limitMsg }, { status: 403 });

    // Position: the organizer's choice when free, otherwise the next one.
    const nextPos = await nextPositionForGroup(jr.groupId);
    let position = nextPos;
    const wanted = parseInt(String(body.position ?? ''), 10);
    if (Number.isFinite(wanted) && wanted > 0 && wanted !== nextPos) {
      const taken = await adminDb.collection('members').where('groupId', '==', jr.groupId).where('position', '==', wanted).limit(1).get();
      if (!taken.empty) return NextResponse.json({ error: `Position ${wanted} is already used in this group.` }, { status: 409 });
      position = wanted;
    }

    const defaultAmount = groupContributionAmount(group) ?? 0;
    const amountIn = parseFloat(String(body.expectedAmount ?? ''));
    const expectedAmount = Number.isFinite(amountIn) && amountIn >= 0 ? amountIn : defaultAmount;
    const currency = String(body.currency || group.currency || 'USD').slice(0, 8).toUpperCase();

    // The organizer's settings from the Accept window - the same ones as the
    // "Contribution & Rotation" part of Add Member.
    const shares = Math.min(MAX_PARTS, Math.max(1, parseInt(String(body.shares ?? '1'), 10) || 1));
    const datesIn: unknown[] = Array.isArray(body.payoutDates) ? body.payoutDates : [];
    const payoutDates = Array.from({ length: shares }, (_, i) => isoDateOrEmpty(datesIn[i]));
    const status = pick(body.status, MEMBER_STATUSES.map(x => x.value), 'pending');
    const memberType = pick(body.memberType, MEMBER_TYPES, 'Regular');
    const role = pick(body.role, MEMBER_ROLES.map(x => x.value), 'member');
    const colorTag = pick(body.colorTag, ['', ...MEMBER_COLOR_TAGS], '');
    const notes = String(body.notes ?? '').slice(0, 500);

    const firstName = String(jr.firstName || '');
    const lastName = String(jr.lastName || '');
    const fullName = `${firstName} ${lastName}`.trim();
    const tynId = buildTynId(firstName, lastName, position);
    const inviteCode = await generateUniqueInviteCode();
    const memberRef = adminDb.collection('members').doc();

    // Re-check the request inside the transaction so two clicks cannot create two members.
    await adminDb.runTransaction(async tx => {
      const fresh = await tx.get(reqRef);
      if (!fresh.exists || fresh.data()?.status !== 'pending') throw new Error('ALREADY_HANDLED');
      tx.set(memberRef, {
        // Same fields as the Add Member form.
        firstName, lastName, address: jr.address || '', phone: jr.phone || '', email: jr.email || '',
        country: jr.country || '', nationality: jr.nationality || '', gender: jr.gender || '',
        memberType, colorTag, role,
        position, payoutDate: payoutDates[0] || '', payoutDates, expectedAmount, currency, status, notes, shares,
        fullName, tynId, groupId: jr.groupId, organizerId: uid, inviteCode,
        referredBy: jr.referrerMemberId || '', referredByName: jr.referrerName || '',
        source: 'join-request', joinRequestId: requestId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(reqRef, { status: 'accepted', decidedAt: FieldValue.serverTimestamp(), decidedBy: uid, memberId: memberRef.id });
    });

    const inviteLink = 'https://unimunity.com/join/' + inviteCode;
    let emailSent = false;
    try {
      if (jr.email) {
        await sendAcceptedInviteEmail({ to: jr.email, firstName, groupName: group.name || 'UNIMUNITY', inviteLink });
        emailSent = true;
      }
    } catch (mailErr) {
      console.error('referral/decide: invite email failed:', mailErr);
    }

    await adminDb.collection('audit_logs').add({
      organizerId: uid, category: 'Member', action: 'Accepted join request',
      user: organizerEmail, details: `${fullName} - ${tynId} - proposed by ${jr.referrerName || 'a member'}`,
      createdAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true, status: 'accepted', memberId: memberRef.id, fullName, tynId, inviteCode, inviteLink,
      groupName: group.name || '', emailSent,
    });
  } catch (err: any) {
    if (err?.message === 'ALREADY_HANDLED') {
      return NextResponse.json({ error: 'This request was already handled.' }, { status: 409 });
    }
    console.error('referral/decide error:', err);
    return NextResponse.json({ error: 'Could not process this request.' }, { status: 500 });
  }
}
