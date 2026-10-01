import { createHash, timingSafeEqual } from "crypto";

// Shared by /api/auth/send-2fa and /api/auth/verify-2fa.
// Codes are never stored in plain text: only this hash is kept in Firestore.
export function hashOtp(uid: string, code: string): string {
  return createHash("sha256").update(uid + ":" + code).digest("hex");
}

export function sameHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}