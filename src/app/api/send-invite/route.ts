export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';



export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { emails, tontineName, contribution, currency, frequency, startDate, tontineId } = await req.json();
    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'Aucun email fourni' }, { status: 400 });
    }
    const results = [];
    for (const email of emails) {
      const result = await resend.emails.send({
        from: 'TARSYN <noreply@tarsyn-app.com>',
        to: email,
        subject: 'Invitation TARSYN',
        html: '<p>Rejoignez ' + tontineName + '</p>',
      });
      results.push({ email, id: result.data?.id });
    }
    return NextResponse.json({ success: true, sent: results.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

