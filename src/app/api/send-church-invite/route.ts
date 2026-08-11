import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Dedicated to the Church module so its invitation emails never show
// tontine-specific fields (contribution, frequency, start date) that would
// make no sense in a church context. Deliberately kept separate from
// /api/send-invite rather than adding a lot of conditional branching to it.
export async function POST(req: NextRequest) {
  try {
    const { emails, churchName, inviteLink } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      emails.map((email: string) =>
        resend.emails.send({
          from: 'TARSYN <noreply@tarsyn-app.com>',
          to: email,
          subject: `\ud83c\udf89 You've been invited to join ${churchName} on TARSYN`,
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; background: #FBF6F2; padding: 32px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <img src="https://tarsyn-app.com/tarsyn-logo.svg" alt="TARSYN" style="height: 40px; width: auto; max-width: 200px;" />
              </div>
              <h2 style="color: #1F4A46; font-size: 22px; font-weight: 800; margin: 0 0 8px;">
                Hello \ud83d\udc4b
              </h2>
              <p style="color: #7A9490; font-size: 15px; margin: 0 0 24px;">
                You've been invited to join <strong>${churchName}</strong> on TARSYN.
              </p>
              ${inviteLink ? `
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${inviteLink}" style="background: #4FB8AE; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                  Join Now \u2192
                </a>
              </div>
              <p style="color: #7A9490; font-size: 12px; text-align: center; margin: 0;">
                Or copy this link: <a href="${inviteLink}" style="color: #4FB8AE;">${inviteLink}</a>
              </p>
              ` : ''}
              <p style="color: #7A9490; font-size: 13px; text-align: center; margin: 24px 0 0;">
                Welcome to the community! \ud83c\udf89
              </p>
            </div>
          `,
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return NextResponse.json({ sent, total: emails.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to send invites' }, { status: 500 });
  }
}
