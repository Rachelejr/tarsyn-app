import { Resend } from 'resend';
import { escapeHtml } from '@/lib/referralEmails';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'UNIMUNITY <noreply@unimunity.com>';

const TEXT: Record<string, { subject: (o: string) => string; hello: (n: string) => string; body: (o: string, t: string) => string; cta: string; valid: (d: number) => string; ignore: string }> = {
  en: {
    subject: o => `${o} invites you to help manage their groups`,
    hello: n => `Hello ${n},`,
    body: (o, t) => `<strong>${o}</strong> invites you to join UNIMUNITY as their <strong>${t}</strong>. You will help manage their groups with your own account.`,
    cta: 'Accept the invitation',
    valid: d => `This link is valid for ${d} days.`,
    ignore: 'If you were not expecting this invitation, you can ignore this email.',
  },
  fr: {
    subject: o => `${o} vous invite à l'aider à gérer ses groupes`,
    hello: n => `Bonjour ${n},`,
    body: (o, t) => `<strong>${o}</strong> vous invite à rejoindre UNIMUNITY en tant que <strong>${t}</strong>. Vous l'aiderez à gérer ses groupes avec votre propre compte.`,
    cta: "Accepter l'invitation",
    valid: d => `Ce lien est valable ${d} jours.`,
    ignore: "Si vous n'attendiez pas cette invitation, ignorez cet email.",
  },
  ht: {
    subject: o => `${o} envite w ede l jere gwoup li yo`,
    hello: n => `Bonjou ${n},`,
    body: (o, t) => `<strong>${o}</strong> envite w antre nan UNIMUNITY kòm <strong>${t}</strong>. W ap ede l jere gwoup li yo ak pwòp kont ou.`,
    cta: 'Aksepte envitasyon an',
    valid: d => `Lyen sa a valab pandan ${d} jou.`,
    ignore: 'Si w pa t ap tann envitasyon sa a, pa okipe imèl sa a.',
  },
  es: {
    subject: o => `${o} te invita a ayudar a gestionar sus grupos`,
    hello: n => `Hola ${n},`,
    body: (o, t) => `<strong>${o}</strong> te invita a unirte a UNIMUNITY como <strong>${t}</strong>. Ayudarás a gestionar sus grupos con tu propia cuenta.`,
    cta: 'Aceptar la invitación',
    valid: d => `Este enlace es válido durante ${d} días.`,
    ignore: 'Si no esperabas esta invitación, ignora este correo.',
  },
  pt: {
    subject: o => `${o} convida você para ajudar a gerir os grupos`,
    hello: n => `Olá ${n},`,
    body: (o, t) => `<strong>${o}</strong> convida você para entrar no UNIMUNITY como <strong>${t}</strong>. Você ajudará a gerir os grupos com a sua própria conta.`,
    cta: 'Aceitar o convite',
    valid: d => `Este link é válido por ${d} dias.`,
    ignore: 'Se você não esperava este convite, ignore este e-mail.',
  },
};

/** Invitation email to a future assistant. All values are escaped. */
export async function sendAssistantInviteEmail(opts: {
  to: string; firstName: string; organizerName: string; title: string; lang: string;
  message?: string; link: string; validDays: number;
}) {
  const t = TEXT[opts.lang] || TEXT.en;
  const org = escapeHtml(opts.organizerName);
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: t.subject(opts.organizerName),
    html: `<div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FAF0E6; padding: 32px; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 20px;"><img src="https://unimunity.com/unimunity-logo.png" alt="UNIMUNITY" style="height: 44px; width: auto;" /></div>
  <h2 style="color: #6B2D4E; font-size: 20px; margin: 0 0 10px;">${t.hello(escapeHtml(opts.firstName))}</h2>
  <p style="color: #3A2F1F; font-size: 15px; line-height: 1.55; margin: 0 0 16px;">${t.body(org, escapeHtml(opts.title))}</p>
  ${opts.message ? `<div style="background: white; border-left: 3px solid #E9C77B; border-radius: 0 12px 12px 0; padding: 12px 16px; margin: 0 0 18px; color: #3A2F1F; font-size: 14px; font-style: italic; white-space: pre-wrap;">${escapeHtml(opts.message)}<br/><span style="font-style: normal; color: #8A7B6C; font-size: 12px;">- ${org}</span></div>` : ''}
  <a href="${escapeHtml(opts.link)}" style="display: block; text-align: center; background: #6B2D4E; color: #FBEEDD; padding: 13px; border-radius: 10px; font-weight: 700; text-decoration: none;">${t.cta}</a>
  <p style="color: #8A7B6C; font-size: 12.5px; text-align: center; margin: 14px 0 0;">${t.valid(opts.validDays)}<br/>${t.ignore}</p>
  <p style="color: #8A7B6C; font-size: 12px; text-align: center; margin: 24px 0 0;">UNIMUNITY - Your Community. Your Power.</p>
</div>`,
  });
}
