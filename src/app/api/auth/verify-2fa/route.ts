import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/firebase-admin';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'tarsyn-secret-key');

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    const token = req.cookies.get('otp_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No code found. Please request a new one.' }, { status: 400 });
    }

    const { payload } = await jwtVerify(token, secret);

    if (String(payload.code) !== String(code)) {
      return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 });
    }

    // Récupérer le rôle depuis Firestore
    const email = payload.email as string;
    const userSnap = await db.collection('members').where('email', '==', email).limit(1).get();
    
    let role = 'member'; // défaut
    if (!userSnap.empty) {
      role = userSnap.docs[0].data().role || 'member';
    }

    // Redirection selon le rôle
    const redirectTo = role === 'admin' ? '/dashboard' : '/member';

    const res = NextResponse.json({ success: true, redirectTo });
    res.cookies.delete('otp_token');
    return res;
  } catch {
    return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
  }
}