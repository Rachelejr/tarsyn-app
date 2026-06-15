import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, name, tynId, groupName, inviteCode } = await req.json();
    const joinUrl = `https://tarsyn-app.com/join/${inviteCode}`;

    await resend.emails.send({
      from: "TARSYN <noreply@tarsyn-app.com>",
      to: email,
      subject: `You've been invited to join ${groupName} on TARSYN`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#FAF0E6;border-radius:16px;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <div style="display:inline-block;background:#6B2D4E;color:#D4AF7A;width:48px;height:48px;border-radius:10px;font-size:1.5rem;font-weight:900;line-height:48px;text-align:center;">T</div>
            <h2 style="color:#6B2D4E;margin:0.5rem 0 0;">TARSYN</h2>
          </div>
          <h3 style="color:#6B2D4E;text-align:center;">You've been invited!</h3>
          <div style="background:#fff;border-radius:12px;padding:1.5rem;margin:1rem 0;">
            <p style="color:#7A5068;margin:0 0 8px;">Hello <strong style="color:#6B2D4E;">${name}</strong>,</p>
            <p style="color:#7A5068;margin:0 0 16px;">You have been added to <strong style="color:#6B2D4E;">${groupName}</strong> as a member.</p>
            <p style="color:#7A5068;margin:0 0 8px;">Your TYN-ID: <strong style="color:#6B2D4E;font-family:monospace;">${tynId}</strong></p>
          </div>
          <div style="text-align:center;margin:1.5rem 0;">
            <a href="${joinUrl}" style="background:#6B2D4E;color:#FAF0E6;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">
              View My Profile
            </a>
          </div>
          <p style="color:#888;font-size:0.85rem;text-align:center;">If you have questions, contact your group organizer.</p>
        </div>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}