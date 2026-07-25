import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET ?groupId=...&hidden=true|false - toggles whether a group is visible
// to its members in the member portal (/member). The admin dashboard is
// never affected by this flag - it only filters the member-facing view.
export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get("groupId");
    const hiddenParam = req.nextUrl.searchParams.get("hidden");
    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }
    if (hiddenParam !== "true" && hiddenParam !== "false") {
      return NextResponse.json({ error: "Missing or invalid hidden param - use hidden=true or hidden=false" }, { status: 400 });
    }
    const hidden = hiddenParam === "true";

    const groupRef = adminDb.collection("groups").doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      return NextResponse.json({ error: "No group found with this ID", groupId }, { status: 404 });
    }

    await groupRef.update({ hiddenFromMembers: hidden });

    return NextResponse.json({
      updated: true,
      groupId,
      groupName: groupSnap.data()?.name || null,
      hiddenFromMembers: hidden,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
