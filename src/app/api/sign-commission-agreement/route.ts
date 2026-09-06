import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Lets an already-registered member sign the organizer's commission
// agreement after logging in - for members whose account was created
// before this consent step existed, or who join without hitting the
// /join/[code] signature step. The caller must own the member record
// they are signing for.
export async function POST(req: NextRequest) {
  try {
    const { memberId, userId, name } = await req.json();
    if (!memberId || !userId || !name || !String(name).trim()) {
      return NextResponse.json({ error: 'Missing memberId, userId or name' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberData = memberSnap.data() as any;
    if (memberData.userId !== userId) {
      return NextResponse.json({ error: 'Not authorized to sign for this member' }, { status: 403 });
    }

    await memberRef.update({
      commissionAgreement: {
        member: { name: String(name).trim(), signedAt: new Date() },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('sign-commission-agreement error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
