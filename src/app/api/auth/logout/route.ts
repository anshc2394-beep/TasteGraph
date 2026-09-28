import { NextRequest, NextResponse } from "next/server";
import { spotifyConfig } from "@/lib/spotify/config";
import { clearSession, privateResponse } from "@/lib/spotify/session";

export async function POST(request: NextRequest) {
  const { origin } = spotifyConfig();
  if (request.headers.get("origin") !== origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const response = privateResponse(
    NextResponse.redirect(new URL("/", origin), 303),
  );
  clearSession(response);
  return response;
}
