import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    await resend.emails.send({
      from: 'TARSYN <noreply@tarsyn-app.com>',
      to: email,
      subject: '🔐 Your TARSYN verification code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#FAF0E6;border-radius:16px;">
          <h2 style="color:#6B2D4E;text-align:center;">Your verification code</h2>
          <div style="background:#6B2D4E;color:#D4AF7A;font-size:36px;font-weight:700;text-align:center;padding:24px;border-radius:12px;letter-spacing:8px;">
            ${code}
          </div>
          <p style="color:#7A5068;text-align:center;margin-top:16px;font-size:13px;">
            This code expires in 10 minutes. Do not share it with anyone.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send 2FA error:', error);
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
  }
}