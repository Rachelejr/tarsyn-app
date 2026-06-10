export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'tarsyn-secret-key');

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    const token = req.cookies.get('otp_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No code found. Please request a new one.' }, { status: 400 });
    }

    const { payload } = await jwtVerify(token, secret);

    if (payload.code !== code) {
      return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.delete('otp_token');
    return res;
  } catch {
    return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
  }
}
