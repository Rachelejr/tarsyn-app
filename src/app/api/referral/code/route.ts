/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';

// Gives a registered member their personal referral link (creating the
// code the first time) and the list of requests they have sent.
// The member is identified by the verified token, never by the body alone.

const CLOSED_STATUSES = ['closed', 'archived', 'deleted'];

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = 'R' + Math.random().toString(36).slice(2, 9).toUpperCase();
    if (code.length < 8) continue;
    const clash = await adminDb.collection('members').where('referralCode', '==', code).limit(1).get();
    if (clash.empty) return code;
  }
  throw new Error('Could not generate a referral code');
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;

    const { memberId } = await req.json();
    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    const member = memberSnap.data() as Record<string, any>;
    if (member.userId !== uid) return forbidden('You can only invite people from your own membership.');

    const groupSnap = await adminDb.collection('groups').doc(String(member.groupId || 'none')).get();
    if (!groupSnap.exists) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    const group = groupSnap.data() as Record<string, any>;
    if (CLOSED_STATUSES.includes(String(group.status || '').toLowerCase())) {
      return NextResponse.json({ error: 'This group is not accepting new members.' }, { status: 409 });
    }
    if (member.referralDisabled) {
      return NextResponse.json({ disabled: true, groupName: group.name || '' });
    }

    let code = typeof member.referralCode === 'string' ? member.referralCode : '';
    if (!code) {
      code = await uniqueReferralCode();
      await memberRef.update({ referralCode: code });
    }

    // Requests this member sent (the internal decline reason is never returned).
    const reqSnap = await adminDb.collection('joinRequests').where('referrerMemberId', '==', memberId).limit(100).get();
    const requests = reqSnap.docs
      .map(d => {
        const r = d.data() as Record<string, any>;
        return {
          id: d.id,
          firstName: r.firstName || '',
          lastName: r.lastName || '',
          status: r.status || 'pending',
          createdAt: r.createdAt?.toMillis ? r.createdAt.toMillis() : null,
        };
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 20);

    return NextResponse.json({
      code,
      link: 'https://unimunity.com/refer/' + code,
      groupName: group.name || '',
      requests,
    });
  } catch (err) {
    console.error('referral/code error:', err);
    return NextResponse.json({ error: 'Could not load your invitation link.' }, { status: 500 });
  }
}
