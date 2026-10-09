import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { askMembersAboutNextCycle } from "@/lib/cycle-renewal";

export const runtime = "nodejs";

// Organizer's "Ask members" button (manual reminder). The same question is
// also sent automatically 30 days before the cycle ends (/api/cron/cycle-renewal).
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
    const groupId = String(body?.groupId || "");
    if (!groupId || groupId.includes("/")) return NextResponse.json({ error: "Missing group." }, { status: 400 });

    const groupSnap = await adminDb.collection("groups").doc(groupId).get();
    if (!groupSnap.exists) return NextResponse.json({ error: "Group not found." }, { status: 404 });
    const group = groupSnap.data() || {};
    let allowed = uid === group.organizerId || uid === group.adminId;
    if (!allowed) {
      const userSnap = await adminDb.collection("users").doc(uid).get();
      allowed = String(userSnap.data()?.role || "") === "superadmin"; // platform admin only
    }
    if (!allowed) return NextResponse.json({ error: "Only the organizer of this group can do this." }, { status: 403 });

    const gridSnap = await adminDb.collection("paymentGrids").doc(groupId + "_current").get();
    if (!gridSnap.exists) return NextResponse.json({ error: "Payment grid not found." }, { status: 404 });

    const result = await askMembersAboutNextCycle(groupId, uid);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("ask-renewal error:", error);
    return NextResponse.json({ error: "Could not send the question. Please try again." }, { status: 500 });
  }
}
