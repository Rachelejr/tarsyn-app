import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { emails, tontineName, region, regionFlag, contribution, currency, frequency, startDate, tontineId } = await req.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'Aucun email fourni' }, { status: 400 });
    }

    const results = [];
    for (const email of emails) {
      const result = await resend.emails.send({
        from: 'TARSYN <noreply@tarsyn-app.com>',
        to: email,
        subject: `${regionFlag} Invitation à rejoindre ${tontineName} — TARSYN`,
        html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#FAF0E6;">
          <div style="background:#6B2D4E;padding:32px 40px;text-align:center;">
            <h1 style="color:#D4AF7A;font-size:28px;margin:0;letter-spacing:2px;">TARSYN</h1>
            <p style="color:#EDD9E5;margin:6px 0 0;font-size:13px;">YOUR COMMUNITY. YOUR POWER.</p>
          </div>
          <div style="padding:36px 40px;background:#fff;">
            <h2 style="color:#2C1A24;">${regionFlag} Rejoignez ${tontineName}</h2>
            <p style="color:#2C1A24;">Région: ${region}</p>
            <p style="color:#2C1A24;">Contribution: ${contribution} ${currency}</p>
            <p style="color:#2C1A24;">Fréquence: ${frequency}</p>
            <p style="color:#2C1A24;">Début: ${startDate}</p>
            <a href="https://tarsyn-app.com/register?tontineId=${tontineId}"
               style="display:inline-block;background:#6B2D4E;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:20px;">
              ✅ Accepter l'invitation
            </a>
          </div>
          <div style="background:#EDD9E5;padding:20px;text-align:center;">
            <p style="color:#7A5068;font-size:12px;margin:0;">© 2026 TARSYN — tarsyn-app.com</p>
          </div>
        </div>`,
      });
      results.push({ email, id: result.data?.id });
    }

    return NextResponse.json({ success: true, sent: results.length, results });
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}