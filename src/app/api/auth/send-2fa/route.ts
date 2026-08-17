import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    await resend.emails.send({
      from: "UNIMUNITY <noreply@unimunity.com>",
      to: email,
      subject: "Your UNIMUNITY verification code",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#FAF0E6;border-radius:16px;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <img src="https://unimunity.com/unimunity-logo.png" alt="UNIMUNITY" style="height:48px;width:auto;max-width:220px;" />
          </div>
          <h3 style="color:#6B2D4E;text-align:center;">Your verification code</h3>
          <div style="background:#fff;border-radius:12px;padding:1.5rem;text-align:center;margin:1rem 0;">
            <p style="font-size:2.5rem;font-weight:900;color:#6B2D4E;letter-spacing:0.4em;margin:0;">${otp}</p>
          </div>
          <p style="color:#888;font-size:0.85rem;text-align:center;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send 2FA error:", error);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}