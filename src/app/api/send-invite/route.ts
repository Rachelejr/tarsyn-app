import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const {
      emails,
      tontineName,
      region,
      regionFlag,
      contribution,
      currency,
      frequency,
      startDate,
      tontineId,
    } = await req.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'Aucun email fourni' }, { status: 400 });
    }

    const results = [];

    for (const email of emails) {
      const result = await resend.emails.send({
        from: 'TARSYN <noreply@tarsyn-app.com>',
        to: email,
        subject: `${regionFlag} Invitation à rejoindre ${tontineName} — TARSYN`,
        html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Invitation TARSYN</title>
</head>
<body style="margin:0;padding:0;background:#FAF0E6;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF0E6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #D9C0CC;">
          <tr>
            <td style="background:#6B2D4E;padding:32px 40px;text-align:center;">
              <h1 style="color:#D4AF7A;font-size:28px;margin:0;letter-spacing:2px;">TARSYN</h1>
              <p style="color:#EDD9E5;margin:6px 0 0;font-size:13px;">YOUR COMMUNITY. YOUR POWER.</p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#6B2D4E,#D4AF7A);"></td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#7A5068;font-size:14px;margin:0 0 8px;">Vous avez reçu une invitation</p>
              <h2 style="color:#2C1A24;font-size:22px;margin:0 0 24px;">${regionFlag} Rejoignez <strong>${tontineName}</strong></h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF0E6;border-radius:12px;border:1px solid #D9C0CC;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:8px 0;border-bottom:1px solid #EDD9E5;">
                        <span style="color:#7A5068;font-size:13px;">🌍 Région</span>
                        <span style="color:#2C1A24;font-weight:700;float:right;">${region}</span>
                      </td></tr>
                      <tr><td style="padding:8px 0;border-bottom:1px solid #EDD9E5;">
                        <span style="color:#7A5068;font-size:13px;">💰 Contribution</span>
                        <span style="color:#2C1A24;font-weight:700;float:right;">${contribution} ${currency}</span>
                      </td></tr>
                      <tr><td style="padding:8px 0;border-bottom:1px solid #EDD9E5;">
                        <span style="color:#7A5068;font-size:13px;">🔄 Fréquence</span>
                        <span style="color:#2C1A24;font-weight:700;float:right;">${frequency}</span>
                      </td></tr>
                      <tr><td style="padding:8px 0;">
                        <span style="color:#7A5068;font-size:13px;">📅 Début</span>
                        <span style="color:#2C1A24;font-weight:700;float:right;">${startDate}</span>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="color:#2C1A24;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Vous avez été invité(e) à rejoindre ce groupe d'épargne sur <strong>TARSYN</strong>.
                Créez votre compte ou connectez-vous pour accepter.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#6B2D4E;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://tarsyn-app.com/register?tontineId=${tontineId}"
                       style="color:#fff;font-size:15px;font-weight:700;text-decoration:none;">
                      ✅ Accepter l'invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#7A5068;font-size:12px;text-align:center;margin:0;">
                Si vous ne connaissez pas l'expéditeur, ignorez cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#EDD9E5;padding:20px 40px;text-align:center;border-top:1px solid #D9C0CC;">
              <p style="color:#7A5068;font-size:12px;margin:0;">© 2026 TARSYN — <a href="https://tarsyn-app.com" style="color:#6B2D4E;">tarsyn-app.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      });
      results.push({ email, id: result.data?.id });
    }

    return NextResponse.json({ success: true, sent: results.length, results });
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}