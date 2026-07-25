import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// POST body: { groupId: string, confirm?: boolean }
// Without confirm:true, this only REPORTS what would be deleted (dry run).
// With confirm:true, it actually deletes: the group doc, its members,
// their payments, and the paymentGrids doc + memberViews subcollection.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const groupId = body.groupId;
    const confirm = body.confirm === true;

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const groupRef = adminDb.collection("groups").doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return NextResponse.json({ error: "No group found with this ID", groupId }, { status: 404 });
    }
    const groupData = groupSnap.data() as any;

    const membersSnap = await adminDb.collection("members").where("groupId", "==", groupId).get();
    const memberIds = membersSnap.docs.map((d) => d.id);

    let paymentsSnap: FirebaseFirestore.QuerySnapshot | null = null;
    let paymentCount = 0;
    if (memberIds.length > 0) {
      // Firestore 'in' queries are capped at 30 - batch if needed.
      const batches: string[][] = [];
      for (let i = 0; i < memberIds.length; i += 30) batches.push(memberIds.slice(i, i + 30));
      const allPaymentDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      for (const batch of batches) {
        const snap = await adminDb.collection("payments").where("memberId", "in", batch).get();
        allPaymentDocs.push(...snap.docs);
      }
      paymentCount = allPaymentDocs.length;
      paymentsSnap = { docs: allPaymentDocs } as any;
    }

    const gridId = groupId + "_current";
    const gridRef = adminDb.collection("paymentGrids").doc(gridId);
    const gridSnap = await gridRef.get();
    let memberViewsCount = 0;
    if (gridSnap.exists) {
      const viewsSnap = await gridRef.collection("memberViews").get();
      memberViewsCount = viewsSnap.size;
    }

    const report = {
      groupId,
      groupName: groupData.name || null,
      organizerId: groupData.organizerId || groupData.adminId || null,
      willDelete: {
        group: 1,
        members: memberIds.length,
        payments: paymentCount,
        paymentGrid: gridSnap.exists ? 1 : 0,
        memberViews: memberViewsCount,
      },
    };

    if (!confirm) {
      return NextResponse.json({ dryRun: true, ...report });
    }

    // ACTUAL DELETION - only runs if confirm:true was explicitly sent.
    const batch = adminDb.batch();
    batch.delete(groupRef);
    membersSnap.docs.forEach((d) => batch.delete(d.ref));
    if (paymentsSnap) {
      paymentsSnap.docs.forEach((d) => batch.delete(d.ref));
    }
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
