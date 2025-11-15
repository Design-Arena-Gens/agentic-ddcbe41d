import { NextRequest, NextResponse } from "next/server";
import { scrobbleTrack } from "@/lib/lastfm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const artist = normalize(body?.artist);
    const track = normalize(body?.track);
    const sessionKey = normalize(body?.sessionKey);
    const timestamp = Number(body?.timestamp);

    if (!artist || !track || !sessionKey || Number.isNaN(timestamp)) {
      return NextResponse.json(
        { error: "Missing required scrobble fields" },
        { status: 400 }
      );
    }

    const payload = {
      artist,
      track,
      sessionKey,
      timestamp: Math.trunc(timestamp),
      album: normalize(body?.album),
      trackNumber: normalize(body?.trackNumber),
      duration: normalize(body?.duration)
    };

    const data = await scrobbleTrack(payload);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to scrobble track", error);
    return NextResponse.json(
      { error: "Unable to scrobble track" },
      { status: 500 }
    );
  }
}

function normalize(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}
