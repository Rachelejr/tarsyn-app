import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';

const resend = new Resend(process.env.RESEND_API_KEY);

// Dedicated to the Church module so its invitation emails never show
// tontine-specific fields (contribution, frequency, start date) that would
// make no sense in a church context. Deliberately kept separate from
// /api/send-invite rather than adding a lot of conditional branching to it.
//
// Branding: the email carries the CHURCH's identity, not UNIMUNITY's.
//  - The church logo (churches/{churchId}.logoUrl) is at the top. It is
//    read here on the server from churchId, never taken from the request,
//    so nobody can make the email show someone else's image.
//  - No logo yet: the church name is shown as a title instead.
//  - Sender name is "<Church> via UNIMUNITY"; UNIMUNITY only appears as a
//    small "Powered by" line at the bottom.
//  - Church pastel palette (pink / cream / green, gold button).

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Display names in the From header cannot contain quotes or angle brackets.
function safeSenderName(v: string): string {
  return v.replace(/["<>\r\n]/g, '').trim().slice(0, 60);
}

function isHttpsUrl(v: string): boolean {
  return /^https:\/\/[^\s"'<>]+$/.test(v);
}

export async function POST(req: NextRequest) {
  try {
    const { emails, churchName: bodyChurchName, inviteLink, churchId } = await req.json();
    // Only the church's organizer may send its invitations.
    const authedUid = await getAuthedUid(req);
    if (typeof authedUid !== 'string') return authedUid;
    if (churchId && typeof churchId === 'string') {
      const ownerSnap = await adminDb.collection('churches').doc(churchId).get();
      if (!ownerSnap.exists || ownerSnap.data()?.organizerId !== authedUid) return forbidden();
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
    }

    let churchName: string = bodyChurchName || '';
    let logoUrl = '';
    if (churchId && typeof churchId === 'string') {
      try {
        const snap = await adminDb.collection('churches').doc(churchId).get();
        if (snap.exists) {
          const data = snap.data() || {};
          churchName = data.name || data.churchName || churchName;
          logoUrl = typeof data.logoUrl === 'string' && isHttpsUrl(data.logoUrl) ? data.logoUrl : '';
        }
      } catch (lookupErr) {
        console.error('send-church-invite: church lookup failed (sending without logo):', lookupErr);
      }
    }

    const displayName = churchName || 'your church';
    const nameHtml = escapeHtml(displayName);
    const safeLink = typeof inviteLink === 'string' && isHttpsUrl(inviteLink) ? inviteLink : '';
    const sender = safeSenderName(churchName) ? safeSenderName(churchName) + ' via UNIMUNITY' : 'UNIMUNITY';

    const brandBlock = logoUrl
      ? `<img src="${logoUrl}" alt="${nameHtml}" style="max-height: 88px; max-width: 220px; width: auto; height: auto; display: inline-block;" />`
      : `<div style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 700; color: #24324A;">${nameHtml}</div>`;

    const html = `
      <div style="background: #FBF8F1; padding: 24px 12px; font-family: Inter, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 18px; overflow: hidden; border: 1px solid #F0E6D2;">
          <div style="background: linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%); background-color: #F6EFDD; padding: 28px 24px; text-align: center;">
            ${brandBlock}
          </div>
          <div style="padding: 28px 32px 32px;">
            <h2 style="color: #24324A; font-size: 22px; font-weight: 800; margin: 0 0 8px;">Hello \ud83d\udc4b</h2>
            <p style="color: #68758A; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              You've been invited to join <strong style="color: #24324A;">${nameHtml}</strong>. Create your account to stay connected with your community.
            </p>
            ${safeLink ? `
            <div style="text-align: center; margin-bottom: 22px;">
              <a href="${safeLink}" style="background: #D8B15A; color: #24324A; padding: 14px 34px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                Join Now
              </a>
            </div>
            <p style="color: #68758A; font-size: 12px; text-align: center; margin: 0;">
              Or copy this link: <a href="${safeLink}" style="color: #8A6D1F;">${safeLink}</a>
            </p>
            ` : ''}
            <p style="color: #68758A; font-size: 13px; text-align: center; margin: 24px 0 0;">
              Welcome to the community! \ud83c\udf89
            </p>
          </div>
          <div style="border-top: 1px solid #F0E6D2; padding: 14px 24px; text-align: center; color: #A3ABB8; font-size: 11px;">
            ${nameHtml} uses UNIMUNITY to manage its community.
          </div>
        </div>
      </div>
    `;

    const results = await Promise.allSettled(
      emails.map((email: string) =>
        resend.emails.send({
          from: `${sender} <noreply@unimunity.com>`,
          to: email,
          subject: `\ud83c\udf89 You've been invited to join ${displayName}`,
          html,
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
