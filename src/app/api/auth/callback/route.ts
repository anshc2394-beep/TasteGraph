import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { spotifyConfig } from "@/lib/spotify/config";
import { exchangeToken, SpotifyError } from "@/lib/spotify/api";
import {
  clearState,
  cookieNames,
  privateResponse,
  setTokens,
} from "@/lib/spotify/session";

export async function GET(request: NextRequest) {
  let config: ReturnType<typeof spotifyConfig>;
  try {
    config = spotifyConfig();
  } catch {
    return privateResponse(
      NextResponse.json(
        { error: "Spotify configuration is unavailable." },
        { status: 503 },
      ),
    );
  }
  const fail = (error: string) => {
    const response = privateResponse(
      NextResponse.redirect(new URL(`/?error=${error}`, config.origin), 303),
    );
    clearState(response);
    return response;
  };
  const state = request.nextUrl.searchParams.get("state");
  const stored = request.cookies.get(cookieNames.state)?.value;
  if (
    !state ||
    !stored ||
    !/^[a-f0-9]{64}$/.test(state) ||
    !/^[a-f0-9]{64}$/.test(stored) ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(stored))
  )
    return fail("state");
  if (request.nextUrl.searchParams.has("error")) return fail("denied");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return fail("code");
  const verifier = request.cookies.get(cookieNames.verifier)?.value;
  if (!verifier || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) return fail("state");
  try {
    const tokens = await exchangeToken(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      }),
    );
    if (!tokens.refresh_token) return fail("token");
    const response = privateResponse(
      NextResponse.redirect(new URL("/dashboard", config.origin), 303),
    );
    setTokens(response, tokens);
    clearState(response);
    return response;
  } catch (error) {
    return fail(error instanceof SpotifyError ? "token" : "connection");
  }
}
