import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const groupSnap = await adminDb.collection("groups").doc(groupId).get();
    const groupData = groupSnap.exists ? groupSnap.data() : null;

    const membersSnap = await adminDb.collection("members").where("groupId", "==", groupId).get();
    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      groupId,
      groupExists: groupSnap.exists,
      groupName: groupData?.name || null,
      hiddenFromMembers: groupData?.hiddenFromMembers ?? null,
      members,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
