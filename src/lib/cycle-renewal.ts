import { Resend } from "resend";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface AskResult {
  emailed: number;
  inApp: number;
  noAccount: number;
  nextCycle: number;
}

// Asks EVERY member of a group's current cycle, at the same time, whether they
// continue, pause, or leave for the next cycle: one email each + the question
// on their member page. Used by the automatic daily job and by the
// organizer's "Ask members" button.
export async function askMembersAboutNextCycle(groupId: string, actorId: string): Promise<AskResult> {
  const groupSnap = await adminDb.collection("groups").doc(groupId).get();
  const group = groupSnap.data() || {};
  const gridRef = adminDb.collection("paymentGrids").doc(groupId + "_current");
  const gridSnap = await gridRef.get();
  const grid = gridSnap.data() || {};

  const cycleNumber = Number(grid.cycleNumber || 1);
  const nextNo = cycleNumber + 1;
  const cycleEnd: string = grid.cycleEndDate || "";
  const groupName: string = group.name || "your group";
  const askedAt = new Date().toISOString();

  await gridRef.set({ renewalAskedFor: nextNo, renewalAskedAt: askedAt }, { merge: true });

  const memberIds = Array.from(
    new Set(Object.values((grid.slots || {}) as Record<string, { memberId?: string }>).map((s) => s.memberId || ""))
  ).filter(Boolean);

  const members = await Promise.all(
    memberIds.map(async (id) => {
      const snap = await adminDb.collection("members").doc(id).get();
      return snap.exists ? ({ id, ...snap.data() } as Record<string, unknown>) : null;
    })
  );

  let emailed = 0;
  let inApp = 0;
  let noAccount = 0;

  // All members in parallel: everyone receives the question at the same time.
  await Promise.all(
    members.map(async (m) => {
      if (!m) return;
      const name = String(m.fullName || m.name || "");
      if (m.userId) {
        await gridRef.collection("memberViews").doc(String(m.userId)).set(
          { renewalAskedFor: nextNo, renewalAskedAt: askedAt },
          { merge: true }
        );
        inApp++;
      } else {
        noAccount++;
      }
      const email = typeof m.email === "string" ? m.email.trim() : "";
      if (!email.includes("@")) return;
      try {
        await resend.emails.send({
          from: "UNIMUNITY <noreply@unimunity.com>",
          to: email,
          subject: groupName + ": will you join cycle " + nextNo + "?",
          html: `
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:2rem;background:#FAF0E6;border-radius:16px;color:#3A2F1F;">
              <div style="text-align:center;margin-bottom:1.5rem;">
                <img src="https://unimunity.com/unimunity-logo.png" alt="UNIMUNITY" style="height:48px;width:auto;max-width:220px;" />
              </div>
              <h3 style="color:#6B2D4E;">Hello${name ? " " + esc(name) : ""},</h3>
              <p>Cycle ${cycleNumber} of <strong>${esc(groupName)}</strong>${cycleEnd ? " ends on <strong>" + esc(cycleEnd) + "</strong>" : " is coming to an end"}.</p>
              <p>Please tell your organizer your plans for <strong>cycle ${nextNo}</strong>:</p>
              <ul>
                <li><strong>Continue</strong> - I join the next cycle</li>
                <li><strong>Pause</strong> - I skip this cycle but stay in the group</li>
                <li><strong>No</strong> - I leave the group</li>
              </ul>
              <div style="text-align:center;margin:1.5rem 0;">
                <a href="https://unimunity.com/member" style="background:#6B2D4E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;">Answer on my member page</a>
              </div>
              <p style="color:#888;font-size:0.8rem;">No member account yet? Simply reply to your organizer directly.</p>
            </div>
          `,
        });
        emailed++;
      } catch (e) {
        console.error("cycle renewal email failed for member", m.id, e);
      }
    })
  );

  try {
    await adminDb.collection("audit_logs").add({
      organizerId: group.organizerId || actorId,
      actorId,
      category: "Group",
      action: "Renewal question sent",
      details: groupName + ": members asked about cycle " + nextNo + " (" + emailed + " email(s), " + inApp + " in-app)" +
        (actorId === "system" ? " - automatic, 30 days before the end" : ""),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch { /* never block on logging */ }

  return { emailed, inApp, noAccount, nextCycle: nextNo };
}
