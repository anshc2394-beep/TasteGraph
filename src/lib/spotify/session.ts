import { NextResponse } from "next/server";
import { spotifyConfig } from "./config";

// On HTTPS, `__Host-` makes browsers reject these cookies unless they are Secure,
// host-only, and path-wide, so a sibling subdomain cannot plant or overwrite them.
const hostPrefix = process.env.SPOTIFY_REDIRECT_URI?.startsWith("https://") ? "__Host-" : "";
export const cookieNames = {
  access: `${hostPrefix}spotify_access_token`,
  refresh: `${hostPrefix}spotify_refresh_token`,
  state: `${hostPrefix}spotify_auth_state`,
  verifier: `${hostPrefix}spotify_pkce_verifier`,
} as const;
export type TokenSet = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: spotifyConfig().secure,
    sameSite: "lax" as const,
    path: "/",
  };
}
export function privateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export function setTokens(response: NextResponse, tokens: TokenSet) {
  response.cookies.set(cookieNames.access, tokens.access_token, {
    ...cookieOptions(),
    maxAge: Math.max(1, tokens.expires_in - 30),
  });
  // A refresh response may omit refresh_token; retain the existing cookie then.
  if (tokens.refresh_token)
    response.cookies.set(cookieNames.refresh, tokens.refresh_token, {
      ...cookieOptions(),
      maxAge: 60 * 60 * 24 * 30,
    });
}
export function clearState(response: NextResponse) {
  for (const name of [cookieNames.state, cookieNames.verifier])
    response.cookies.set(name, "", { ...cookieOptions(), maxAge: 0 });
}
export function clearSession(response: NextResponse) {
  for (const name of Object.values(cookieNames))
    response.cookies.set(name, "", { ...cookieOptions(), maxAge: 0 });
}
