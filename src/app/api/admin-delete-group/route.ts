import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

async function buildReport(groupId: string) {
  const groupRef = adminDb.collection("groups").doc(groupId);
  const groupSnap = await groupRef.get();
  if (!groupSnap.exists) {
    return { error: "No group found with this ID", groupId } as const;
  }
  const groupData = groupSnap.data() as any;

  const membersSnap = await adminDb.collection("members").where("groupId", "==", groupId).get();
  const memberIds = membersSnap.docs.map((d) => d.id);

  let paymentDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  if (memberIds.length > 0) {
    const batches: string[][] = [];
    for (let i = 0; i < memberIds.length; i += 30) batches.push(memberIds.slice(i, i + 30));
    for (const batch of batches) {
      const snap = await adminDb.collection("payments").where("memberId", "in", batch).get();
      paymentDocs.push(...snap.docs);
    }
  }

  const gridId = groupId + "_current";
  const gridRef = adminDb.collection("paymentGrids").doc(gridId);
  const gridSnap = await gridRef.get();
  let memberViewsCount = 0;
  if (gridSnap.exists) {
    const viewsSnap = await gridRef.collection("memberViews").get();
    memberViewsCount = viewsSnap.size;
  }

  return {
    groupRef, groupData, membersSnap, memberIds, paymentDocs, gridRef, gridSnap, memberViewsCount,
    groupId,
    groupName: groupData.name || null,
    organizerId: groupData.organizerId || groupData.adminId || null,
    willDelete: {
      group: 1,
      members: memberIds.length,
      payments: paymentDocs.length,
      paymentGrid: gridSnap.exists ? 1 : 0,
      memberViews: memberViewsCount,
    },
  } as const;
}

// GET ?groupId=...&confirm=true - lets an admin trigger this by just pasting
// a link in the browser address bar, no console/POST needed.
// Without &confirm=true it is a pure dry run (nothing is deleted).
export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get("groupId");
    const confirm = req.nextUrl.searchParams.get("confirm") === "true";
    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const result = await buildReport(groupId);
    if ("error" in result) return NextResponse.json(result, { status: 404 });

    const { groupRef, membersSnap, paymentDocs, gridRef, gridSnap, ...report } = result;

    if (!confirm) {
      return NextResponse.json({ dryRun: true, ...report });
    }

    const batch = adminDb.batch();
    batch.delete(groupRef);
    membersSnap.docs.forEach((d) => batch.delete(d.ref));
    paymentDocs.forEach((d) => batch.delete(d.ref));
    if (gridSnap.exists) {
      const viewsSnap = await gridRef.collection("memberViews").get();
      viewsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(gridRef);
    }
    await batch.commit();

    return NextResponse.json({ deleted: true, ...report });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}

// POST body: { groupId: string, confirm?: boolean } - same logic, for anyone
// who prefers calling this from the browser console instead.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const groupId = body.groupId;
    const confirm = body.confirm === true;

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const result = await buildReport(groupId);
    if ("error" in result) return NextResponse.json(result, { status: 404 });

    const { groupRef, membersSnap, paymentDocs, gridRef, gridSnap, ...report } = result;

    if (!confirm) {
      return NextResponse.json({ dryRun: true, ...report });
    }

    const batch = adminDb.batch();
    batch.delete(groupRef);
    membersSnap.docs.forEach((d) => batch.delete(d.ref));
    paymentDocs.forEach((d) => batch.delete(d.ref));
    if (gridSnap.exists) {
      const viewsSnap = await gridRef.collection("memberViews").get();
      viewsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(gridRef);
    }
    await batch.commit();

    return NextResponse.json({ deleted: true, ...report });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
