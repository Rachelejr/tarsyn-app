import { NextResponse } from "next/server";
import { Resend } from "resend";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LABELS: Record<string, string> = {
  yes: "Continue - joins the next cycle",
  pause: "Pause - skips the next cycle, stays in the group",
  no: "No - leaves the group",
};

// A member answers "continue / pause / no" for the next cycle from their page,
// with an optional message. Saved on their member record (shown live on the
// organizer's dashboard and in the Renew Cycle panel) + an email to the organizer.
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    let uid: string;
    try {
      uid = (await adminAuth.verifyIdToken(idToken)).uid;
    } catch {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const memberId = String(body?.memberId || "");
    const answer = String(body?.answer || "");
    const note = String(body?.note || "").trim().slice(0, 500);
    if (!memberId || memberId.includes("/") || !LABELS[answer]) {
      return NextResponse.json({ error: "Invalid answer." }, { status: 400 });
    }

    const memberRef = adminDb.collection("members").doc(memberId);
    const mSnap = await memberRef.get();
    const m = mSnap.data();
    if (!m || m.userId !== uid) {
      return NextResponse.json({ error: "This member record is not yours." }, { status: 403 });
    }

    const groupId = String(m.groupId || "");
    const gridSnap = groupId ? await adminDb.collection("paymentGrids").doc(groupId + "_current").get() : null;
    const nextNo = Number(gridSnap?.data()?.cycleNumber || 1) + 1;

    await memberRef.update({
      nextCycleResponse: answer,
      nextCycleFor: nextNo,
      nextCycleNote: note,
      nextCycleRespondedAt: FieldValue.serverTimestamp(),
    });

    // Email the organizer (never blocks the answer).
    try {
      const groupSnap = groupId ? await adminDb.collection("groups").doc(groupId).get() : null;
      const group = groupSnap?.data() || {};
      const organizerId = String(group.organizerId || m.organizerId || "");
      const organizerEmail = organizerId ? (await adminAuth.getUser(organizerId)).email : "";
      if (organizerEmail) {
        const name = String(m.fullName || m.name || "A member");
        const groupName = String(group.name || "your group");
        await resend.emails.send({
          from: "UNIMUNITY <noreply@unimunity.com>",
          to: organizerEmail,
          subject: name + " answered for cycle " + nextNo + " (" + groupName + ")",
          html: `
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#FAF0E6;border-radius:16px;color:#3A2F1F;">
              <h3 style="color:#6B2D4E;">${esc(name)} answered for cycle ${nextNo}</h3>
              <p><strong>Group:</strong> ${esc(groupName)}</p>
              <p><strong>Answer:</strong> ${esc(LABELS[answer])}</p>
              ${note ? `<p><strong>Message:</strong><br/><em>${esc(note)}</em></p>` : ""}
              <div style="text-align:center;margin:1.5rem 0;">
                <a href="https://unimunity.com/dashboard" style="background:#6B2D4E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;">Open my dashboard</a>
              </div>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error("cycle answer: organizer email failed", e);
    }

    return NextResponse.json({ ok: true, nextCycle: nextNo });
  } catch (error) {
    console.error("cycle answer error:", error);
    return NextResponse.json({ error: "Your answer could not be saved. Please try again." }, { status: 500 });
  }
}
