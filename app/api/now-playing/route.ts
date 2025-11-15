import { NextRequest, NextResponse } from "next/server";
import { updateNowPlaying } from "@/lib/lastfm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const artist = normalize(body?.artist);
    const track = normalize(body?.track);
    const sessionKey = normalize(body?.sessionKey);

    if (!artist || !track || !sessionKey) {
      return NextResponse.json(
        { error: "Missing required now playing fields" },
        { status: 400 }
      );
    }

    const payload = {
      artist,
      track,
      sessionKey,
      album: normalize(body?.album),
      duration: normalize(body?.duration)
    };

    const data = await updateNowPlaying(payload);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to update now playing", error);
    return NextResponse.json(
      { error: "Unable to update now playing" },
      { status: 500 }
    );
  }
}

function normalize(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}
