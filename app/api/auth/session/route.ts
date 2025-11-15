import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/lastfm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : null;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const session = await getSession(token);
    return NextResponse.json({
      sessionKey: session.session.key,
      username: session.session.name
    });
  } catch (error) {
    console.error("Failed to create Last.fm session", error);
    return NextResponse.json(
      { error: "Unable to complete Last.fm authentication" },
      { status: 500 }
    );
  }
}
