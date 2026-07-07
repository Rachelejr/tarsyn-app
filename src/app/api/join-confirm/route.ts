import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { memberId, userId, name, email } = await req.json();

    if (!memberId || !userId) {
      return NextResponse.json({ error: 'Missing memberId or userId' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      userId,
      status: 'active',
    };
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    await memberRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('join-confirm error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}