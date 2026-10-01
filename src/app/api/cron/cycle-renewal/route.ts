import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { askMembersAboutNextCycle } from "@/lib/cycle-renewal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS_BEFORE_END = 30;

// Runs automatically once a day (vercel.json "crons"). For every group whose
// current cycle ends within 30 days (or has already ended), it asks ALL members
// at once - continue, pause or leave - unless they were already asked for
// that next cycle. Nothing to do for the organizer.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date(new Date().toISOString().split("T")[0]).getTime();
  const snap = await adminDb.collection("paymentGrids").get();
  const results: Record<string, unknown>[] = [];

  for (const docSnap of snap.docs) {
    if (!docSnap.id.endsWith("_current")) continue;
    const g = docSnap.data();
    if (!g.cycleEndDate || !g.groupId) continue;
    const nextNo = Number(g.cycleNumber || 1) + 1;
    if (Number(g.renewalAskedFor || 0) >= nextNo) continue;
    const daysToEnd = Math.ceil((new Date(g.cycleEndDate).getTime() - today) / 86400000);
    if (daysToEnd > DAYS_BEFORE_END) continue;
    try {
      const r = await askMembersAboutNextCycle(String(g.groupId), "system");
      results.push({ groupId: g.groupId, ...r });
    } catch (e) {
      console.error("cron cycle-renewal failed for", g.groupId, e);
      results.push({ groupId: g.groupId, error: true });
    }
  }

  return NextResponse.json({ ok: true, asked: results.length, results });
}
