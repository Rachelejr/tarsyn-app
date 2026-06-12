import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { emails, tontineName, inviteLink } = await req.json();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}