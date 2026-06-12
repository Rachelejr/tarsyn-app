import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    await resend.emails.send({
      from: "TARSYN <noreply@tarsyn-app.com>",
      to: email,
      subject: "Your TARSYN verification code",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#FAF0E6;border-radius:16px;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <div style="display:inline-block;background:#6B2D4E;color:#D4AF7A;width:48px;height:48px;border-radius:10px;font-size:1.5rem;font-weight:900;line-height:48px;text-align:center;">T</div>
            <h2 style="color:#6B2D4E;margin:0.5rem 0 0;">TARSYN</h2>
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