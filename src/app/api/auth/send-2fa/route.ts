import { NextResponse } from "next/server";
import { Resend } from "resend";
import { randomInt } from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { hashOtp } from "@/lib/otp";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const CODE_TTL_MS = 10 * 60 * 1000; // code valid 10 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // at most one email every 30 seconds

// Sends a 2FA code to the email of the account that is signed in.
// The caller must send its Firebase ID token; the email address and the code
// are decided here on the server, never taken from the request body.
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const uid = decoded.uid;
    const email = decoded.email;
    if (!email) {
      return NextResponse.json({ error: "No email on this account." }, { status: 400 });
    }

    const ref = adminDb.collection("otp_codes").doc(uid);
    const existing = await ref.get();
    const lastSentAt = existing.exists ? Number(existing.data()?.lastSentAt || 0) : 0;
    if (Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
      return NextResponse.json({ error: "Please wait a moment before requesting a new code." }, { status: 429 });
    }

    const code = String(randomInt(100000, 1000000));

    // Full overwrite (no merge): also removes the old plain-text "otp" field.
    await ref.set({
      otpHash: hashOtp(uid, code),
      expires: Date.now() + CODE_TTL_MS,
      attempts: 0,
      lastSentAt: Date.now(),
      email,
    });

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
            <p style="font-size:2.5rem;font-weight:900;color:#6B2D4E;letter-spacing:0.4em;margin:0;">${code}</p>
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