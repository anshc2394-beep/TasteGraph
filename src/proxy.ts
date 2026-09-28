import { NextRequest, NextResponse } from "next/server";
import { spotifyConfig } from "./lib/spotify/config";

/** Spotify serves profile and cover artwork from these CDNs; nothing else may load images. */
const spotifyImages = "https://i.scdn.co https://*.scdn.co https://*.spotifycdn.com";

export function contentSecurityPolicy(nonce: string, https: boolean, isDev = process.env.NODE_ENV === "development") {
  return [
    "default-src 'self'",
    // Nonces bind scripts to this response; React needs eval only for dev error overlays.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Motion and next/font write inline style attributes, which cannot carry a nonce.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${spotifyImages}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function secure(response: NextResponse, policy: string, https: boolean) {
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (https) response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  let https = false;
  let policy = contentSecurityPolicy(nonce, https);
  try {
    const { origin } = spotifyConfig();
    const canonical = new URL(origin);
    https = canonical.protocol === "https:";
    policy = contentSecurityPolicy(nonce, https);
    // Host reflects the browser origin even when Next normalizes request.url to localhost.
    if (request.headers.get("host") !== canonical.host || request.nextUrl.protocol !== canonical.protocol) {
      const target = new URL(request.nextUrl.pathname + request.nextUrl.search, origin);
      const response = NextResponse.redirect(target, 307);
      response.headers.set("Cache-Control", "no-store");
      return secure(response, policy, https);
    }
  } catch {
    /* Routes display a safe configuration error. */
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return secure(response, policy, https);
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|covers/|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
