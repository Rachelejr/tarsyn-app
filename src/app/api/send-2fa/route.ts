import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from:    'TARSYN Security <onboarding@resend.dev>',
      to:      email,
      subject: 'Your TARSYN Security Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
          <div style="background:#6B2D4E;padding:24px;text-align:center;">
            <div style="color:#D4AF7A;font-size:22px;font-weight:800;">✦ TARSYN</div>
          </div>
          <div style="padding:36px;text-align:center;background:#FAF0E6;">
            <h2 style="color:#6B2D4E;">Your Security Code</h2>
            <p style="color:#7A5068;">Valid for 10 minutes</p>
            <div style="background:white;border:2px solid #D4AF7A;border-radius:12px;padding:20px;margin:20px 0;">
              <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#6B2D4E;">${code}</div>
            </div>
            <p style="color:#C4748E;font-size:13px;">Do not share this code with anyone.</p>
          </div>
          <div style="background:#6B2D4E;padding:14px;text-align:center;">
            <p style="color:rgba(250,240,230,0.6);font-size:12px;margin:0;">TARSYN — © 2026</p>
          </div>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });

  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
