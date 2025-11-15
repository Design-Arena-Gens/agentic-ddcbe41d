import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/lastfm";

export async function GET() {
  try {
    const { token } = await getRequestToken();
    const apiKey = process.env.LASTFM_API_KEY;
    if (!apiKey) {
      throw new Error("LASTFM_API_KEY is not configured");
    }
    const authUrl = `https://www.last.fm/api/auth/?api_key=${apiKey}&token=${token}`;
    return NextResponse.json({ token, authUrl });
  } catch (error) {
    console.error("Failed to fetch Last.fm token", error);
    return NextResponse.json(
      { error: "Unable to request Last.fm token" },
      { status: 500 }
    );
  }
}
