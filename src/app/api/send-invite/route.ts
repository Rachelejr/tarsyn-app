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
      html: `<div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:32px;background:#FAF0E6;">
        <h2 style="color:#6B2D4E;">Code de verification</h2>
        <p style="font-size:32px;font-weight:700;color:#6B2D4E;letter-spacing:8px;">${code}</p>
        <p style="color:#7A5068;font-size:13px;">Ce code expire dans 10 minutes.</p>
      </div>`,
    });
    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error('Erreur send-2fa:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}