import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const gridId = groupId + "_current";
    const gridSnap = await adminDb.collection("paymentGrids").doc(gridId).get();
    if (!gridSnap.exists) {
      return NextResponse.json({ found: false });
    }
    const grid = gridSnap.data() as any;
    const currentSlotCount = Object.keys(grid.slots || {}).length;
    const paymentSlotKeys = Object.keys(grid.payments || {});

    const byGroupId = await adminDb.collection("members").where("groupId", "==", groupId).get();
    const byOrganizerId = grid.organizerId
      ? await adminDb.collection("members").where("organizerId", "==", grid.organizerId).get()
      : null;

    return NextResponse.json({
      found: true,
      gridId,
      organizerId: grid.organizerId || null,
      currentSlotCountInGrid: currentSlotCount,
      paymentSlotKeysInGrid: paymentSlotKeys,
      membersFoundByGroupId: byGroupId.docs.map((d) => ({ id: d.id, name: d.data().fullName || d.data().name, groupId: d.data().groupId })),
      membersFoundByOrganizerId: byOrganizerId ? byOrganizerId.docs.map((d) => ({ id: d.id, name: d.data().fullName || d.data().name, groupId: d.data().groupId })) : [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const groupId = body.groupId;
    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const gridId = groupId + "_current";
    const gridRef = adminDb.collection("paymentGrids").doc(gridId);
    const gridSnap = await gridRef.get();
    if (!gridSnap.exists) {
      return NextResponse.json({ error: "Grid not found" }, { status: 404 });
    }
    const grid = gridSnap.data() as any;

    const membersSnap = grid.organizerId
      ? await adminDb.collection("members").where("organizerId", "==", grid.organizerId).get()
      : await adminDb.collection("members").where("groupId", "==", groupId).get();

    const slots: Record<string, any> = {};
    let slotCounter = 1;
    membersSnap.docs.forEach((m) => {
      const data = m.data();
      const memberShares = Math.max(1, parseInt(data.shares) || 1);
      const displayName = data.fullName || data.name || "(no name)";
      for (let s = 0; s < memberShares; s++) {
        slots[String(slotCounter)] = {
          slotNumber: String(slotCounter),
          memberId: m.id,
          memberName: memberShares > 1 ? displayName + " (part " + (s + 1) + "/" + memberShares + ")" : displayName,
        };
        slotCounter++;
      }
    });

    await gridRef.set({ slots }, { merge: true });

    return NextResponse.json({ success: true, restoredSlotCount: Object.keys(slots).length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}