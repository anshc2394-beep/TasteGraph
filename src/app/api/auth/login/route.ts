import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { spotifyConfig } from "@/lib/spotify/config";
import {
  cookieNames,
  cookieOptions,
  privateResponse,
} from "@/lib/spotify/session";

export async function GET() {
  try {
    const { clientId, redirectUri } = spotifyConfig();
    const state = randomBytes(32).toString("hex");
    // PKCE binds the returned code to this browser, even if the code leaks from a log.
    const verifier = randomBytes(48).toString("base64url");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "user-read-private user-top-read",
      redirect_uri: redirectUri,
      state,
      code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    });
    const response = privateResponse(
      NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`),
    );
    for (const [name, value] of [[cookieNames.state, state], [cookieNames.verifier, verifier]])
      response.cookies.set(name, value, { ...cookieOptions(), maxAge: 600 });
    return response;
  } catch {
    return privateResponse(
      NextResponse.json(
        {
          error:
            "Spotify is not configured. Check the server environment and registered redirect URI.",
        },
        { status: 503 },
      ),
    );
  }
}
