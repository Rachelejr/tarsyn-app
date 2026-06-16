import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { memberEmail, memberName, groupName, inviteLink, adminName } = await req.json();

    if (!memberEmail || !memberName || !groupName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'TARSYN <noreply@tarsyn-app.com>',
      to: memberEmail,
      subject: `🎉 You've been invited to join ${groupName} on TARSYN`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; background: #FAF0E6; padding: 32px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: #6B2D4E; display: inline-block; padding: 12px 24px; border-radius: 12px;">
              <span style="color: #D4AF7A; font-weight: 800; font-size: 22px;">TARSYN</span>
            </div>
          </div>
          <h2 style="color: #6B2D4E; font-size: 22px; font-weight: 800; margin: 0 0 8px;">
            Hello ${memberName} 👋
          </h2>
          <p style="color: #7A5068; font-size: 15px; margin: 0 0 24px;">
            <strong>${adminName}</strong> has invited you to join <strong>${groupName}</strong> on TARSYN.
          </p>
          <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #7A5068; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Group</p>
            <p style="color: #6B2D4E; font-size: 18px; font-weight: 700; margin: 0;">${groupName}</p>
          </div>
          ${inviteLink ? `
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${inviteLink}" style="background: #6B2D4E; color: #D4AF7A; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              Join Now →
            </a>
          </div>
          <p style="color: #7A5068; font-size: 12px; text-align: center; margin: 0;">
            Or copy this link: <a href="${inviteLink}" style="color: #6B2D4E;">${inviteLink}</a>
          </p>
          ` : ''}
          <p style="color: #7A5068; font-size: 13px; text-align: center; margin: 24px 0 0;">
            Welcome to the community! 🎉
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}