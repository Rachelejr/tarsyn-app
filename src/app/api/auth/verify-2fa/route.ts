import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { hashOtp, sameHash } from "@/lib/otp";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

// Checks the 2FA code on the server. On success it returns a Firebase custom
// token carrying { mfa: true }; the login page signs in with it, so the
// session itself records that 2FA was passed.
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    let uid: string;
    try {
      uid = (await adminAuth.verifyIdToken(idToken)).uid;
    } catch {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "");
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
    }

    const ref = adminDb.collection("otp_codes").doc(uid);

    // Transaction: attempt counting stays correct even with parallel requests.
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || !snap.data()?.otpHash) {
        return { ok: false, status: 400, error: "Code expired. Request a new code." };
      }
      const data = snap.data()!;
      if (Date.now() > Number(data.expires || 0)) {
        tx.delete(ref);
        return { ok: false, status: 400, error: "Code expired. Request a new code." };
      }
      const attempts = Number(data.attempts || 0);
      if (attempts >= MAX_ATTEMPTS) {
        tx.delete(ref);
        return { ok: false, status: 429, error: "Too many attempts. Request a new code." };
      }
      if (!sameHash(hashOtp(uid, code), String(data.otpHash))) {
        const left = MAX_ATTEMPTS - attempts - 1;
        if (left <= 0) tx.delete(ref);
        else tx.update(ref, { attempts: attempts + 1 });
        return {
          ok: false,
          status: 401,
          error: left > 0
            ? `Incorrect code. ${left} attempt${left > 1 ? "s" : ""} left.`
            : "Too many attempts. Request a new code.",
        };
      }
      tx.delete(ref); // a code can only be used once
      return { ok: true, status: 200, error: "" };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const token = await adminAuth.createCustomToken(uid, { mfa: true });
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Verify 2FA error:", error);
    return NextResponse.json({ error: "Verification error. Please try again." }, { status: 500 });
  }
}