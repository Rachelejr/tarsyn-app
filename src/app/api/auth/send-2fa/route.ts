export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await resend.emails.send({
      from: 'TARSYN <noreply@tarsyn-app.com>',
      to: email,
      subject: 'Code de verification TARSYN',
      html: '<p>' + code + '</p>',
    });
    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
