import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { emails, tontineName, region, contribution, currency, frequency, startDate, inviteLink } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      emails.map((email: string) =>
        resend.emails.send({
          from: 'TARSYN <noreply@tarsyn-app.com>',
          to: email,
          subject: `🎉 You've been invited to join ${tontineName} on TARSYN`,
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; background: #FAF0E6; padding: 32px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="background: #6B2D4E; display: inline-block; padding: 12px 24px; border-radius: 12px;">
                  <span style="color: #D4AF7A; font-weight: 800; font-size: 22px;">TARSYN</span>
                </div>
              </div>
              <h2 style="color: #6B2D4E; font-size: 22px; font-weight: 800; margin: 0 0 8px;">
                Hello 👋
              </h2>
              <p style="color: #7A5068; font-size: 15px; margin: 0 0 24px;">
                You've been invited to join <strong>${tontineName}</strong> on TARSYN.
              </p>
              <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #7A5068; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Group Details</p>
                <p style="color: #6B2D4E; font-size: 16px; font-weight: 700; margin: 0 0 6px;">${tontineName}</p>
                <p style="color: #7A5068; font-size: 13px; margin: 0 0 4px;">Region: ${region || '—'}</p>
                <p style="color: #7A5068; font-size: 13px; margin: 0 0 4px;">Contribution: ${contribution || '—'} ${currency || ''}</p>
                <p style="color: #7A5068; font-size: 13px; margin: 0 0 4px;">Frequency: ${frequency || '—'}</p>
                <p style="color: #7A5068; font-size: 13px; margin: 0;">Start Date: ${startDate || '—'}</p>
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
        })
      )
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error('Some invites failed:', failed);
    }

    return NextResponse.json({ success: true, sent: emails.length - failed.length, failed: failed.length });
  } catch (error) {
    console.error('send-invite error:', error);
    return NextResponse.json({ error: 'Failed to send invites' }, { status: 500 });
  }
}
