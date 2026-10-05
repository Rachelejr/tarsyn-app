/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Public: lets /refer/[code] show who is inviting and to which group.
// Returns ONLY the group name and the referrer's first name - no amounts,
// members, dates or organizer details.

const CLOSED_STATUSES = ['closed', 'archived', 'deleted'];

export async function GET(req: NextRequest) {
  try {
    const code = (req.nextUrl.searchParams.get('code') || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(code)) return NextResponse.json({ found: false });

    const snap = await adminDb.collection('members').where('referralCode', '==', code).limit(1).get();
    if (snap.empty) return NextResponse.json({ found: false });
    const member = snap.docs[0].data() as Record<string, any>;
    if (!member.userId || member.referralDisabled) return NextResponse.json({ found: false });

    const groupSnap = await adminDb.collection('groups').doc(String(member.groupId || 'none')).get();
    if (!groupSnap.exists) return NextResponse.json({ found: false });
    const group = groupSnap.data() as Record<string, any>;
    if (CLOSED_STATUSES.includes(String(group.status || '').toLowerCase())) return NextResponse.json({ found: false });

    const referrerFirstName = String(member.firstName || String(member.fullName || member.name || '').split(' ')[0] || '').slice(0, 40);
    return NextResponse.json({ found: true, groupName: group.name || '', referrerFirstName });
  } catch (err) {
    console.error('referral/lookup error:', err);
    return NextResponse.json({ found: false }, { status: 500 });
  }
}
