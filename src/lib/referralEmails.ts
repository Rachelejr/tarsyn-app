import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'UNIMUNITY <noreply@unimunity.com>';

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function frame(inner: string): string {
  return `<div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FAF0E6; padding: 32px; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 20px;"><img src="https://unimunity.com/unimunity-logo.png" alt="UNIMUNITY" style="height: 44px; width: auto;" /></div>
  ${inner}
  <p style="color: #8A7B6C; font-size: 12px; text-align: center; margin: 24px 0 0;">UNIMUNITY - Your Community. Your Power.</p>
</div>`;
}

/** Tells the organizer a member proposed someone. All values are escaped. */
export async function sendJoinRequestEmailToOrganizer(opts: {
  to: string; groupName: string; referrerName: string; firstName: string; lastName: string; message?: string;
}) {
  const name = `${opts.firstName} ${opts.lastName}`.trim();
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `New join request for ${opts.groupName}`,
    html: frame(`
  <h2 style="color: #6B2D4E; font-size: 20px; margin: 0 0 8px;">New join request</h2>
  <p style="color: #3A2F1F; font-size: 15px; margin: 0 0 16px;"><strong>${escapeHtml(opts.referrerName)}</strong> proposed <strong>${escapeHtml(name)}</strong> for <strong>${escapeHtml(opts.groupName)}</strong>.</p>
  ${opts.message ? `<div style="background: white; border-radius: 12px; padding: 14px 16px; margin: 0 0 16px; color: #3A2F1F; font-size: 14px; white-space: pre-wrap;">${escapeHtml(opts.message)}</div>` : ''}
  <p style="color: #3A2F1F; font-size: 14px; margin: 0 0 20px;">Nobody joins until you accept the request.</p>
  <a href="https://unimunity.com/dashboard" style="display: block; text-align: center; background: #6B2D4E; color: #FBEEDD; padding: 13px; border-radius: 10px; font-weight: 700; text-decoration: none;">Review the request</a>`),
  });
}

/** Personal invitation sent once the organizer accepts. Same link as Add Member. */
export async function sendAcceptedInviteEmail(opts: {
  to: string; firstName: string; groupName: string; inviteLink: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `You've been invited to join ${opts.groupName} on UNIMUNITY`,
    html: frame(`
  <h2 style="color: #6B2D4E; font-size: 20px; margin: 0 0 8px;">Hello ${escapeHtml(opts.firstName)}</h2>
  <p style="color: #3A2F1F; font-size: 15px; margin: 0 0 20px;">Your request to join <strong>${escapeHtml(opts.groupName)}</strong> was accepted. Create your account with your personal link:</p>
  <a href="${escapeHtml(opts.inviteLink)}" style="display: block; text-align: center; background: #6B2D4E; color: #FBEEDD; padding: 13px; border-radius: 10px; font-weight: 700; text-decoration: none;">Join ${escapeHtml(opts.groupName)}</a>
  <p style="color: #8A7B6C; font-size: 12px; margin: 16px 0 0; word-break: break-all;">${escapeHtml(opts.inviteLink)}</p>`),
  });
}
