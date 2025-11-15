import md5 from "md5";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";

type HttpMethod = "GET" | "POST";

type LastfmParams = Record<string, string>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function createSignature(params: LastfmParams, sharedSecret: string) {
  const keys = Object.keys(params).sort();
  const signatureBase = keys.reduce((acc, key) => acc + key + params[key], "");
  return md5(signatureBase + sharedSecret);
}

async function executeRequest(
  method: HttpMethod,
  params: LastfmParams,
  signed: boolean
) {
  const apiKey = requireEnv("LASTFM_API_KEY");
  const sharedSecret = requireEnv("LASTFM_SHARED_SECRET");

  const allParams: LastfmParams = {
    api_key: apiKey,
    format: "json",
    ...params
  };

  if (signed) {
    const sig = createSignature(allParams, sharedSecret);
    allParams.api_sig = sig;
  }

  if (method === "GET") {
    const url = new URL(LASTFM_API_BASE);
    url.search = new URLSearchParams(allParams).toString();
    const response = await fetch(url, {
      next: { revalidate: 0 }
    });
    if (!response.ok) {
      throw new Error(`Last.fm request failed with ${response.status}`);
    }
    const data = await response.json();
    ensureNoError(data);
    return data;
  }

  const formBody = new URLSearchParams(allParams);
  const response = await fetch(LASTFM_API_BASE, {
    method: "POST",
    body: formBody.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Last.fm request failed with ${response.status}`);
  }

  const data = await response.json();
  ensureNoError(data);

  return data;
}

function ensureNoError(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error != null
  ) {
    const record = data as { error: number; message?: string };
    const message = record.message ?? "Unknown Last.fm error";
    throw new Error(`Last.fm error ${record.error}: ${message}`);
  }
}

export async function getRequestToken() {
  const data = await executeRequest(
    "GET",
    {
      method: "auth.getToken"
    },
    false
  );
  return data as { token: string };
}

export async function getSession(token: string) {
  const data = await executeRequest(
    "GET",
    {
      method: "auth.getSession",
      token
    },
    true
  );
  return data as { session: { key: string; name: string; subscriber: number } };
}

export type ScrobblePayload = {
  artist: string;
  track: string;
  timestamp: number;
  album?: string;
  sessionKey: string;
  trackNumber?: string;
  duration?: string;
};

export async function scrobbleTrack(payload: ScrobblePayload) {
  const params: LastfmParams = {
    method: "track.scrobble",
    artist: payload.artist,
    track: payload.track,
    timestamp: String(payload.timestamp),
    sk: payload.sessionKey
  };

  if (payload.album) {
    params.album = payload.album;
  }
  if (payload.trackNumber) {
    params.trackNumber = payload.trackNumber;
  }
  if (payload.duration) {
    params.duration = payload.duration;
  }

  const data = await executeRequest("POST", params, true);
  return data;
}

export type NowPlayingPayload = {
  artist: string;
  track: string;
  album?: string;
  sessionKey: string;
  duration?: string;
};

export async function updateNowPlaying(payload: NowPlayingPayload) {
  const params: LastfmParams = {
    method: "track.updateNowPlaying",
    artist: payload.artist,
    track: payload.track,
    sk: payload.sessionKey
  };

  if (payload.album) {
    params.album = payload.album;
  }
  if (payload.duration) {
    params.duration = payload.duration;
  }

  const data = await executeRequest("POST", params, true);
  return data;
}
