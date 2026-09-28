import { NextRequest, NextResponse } from "next/server";
import { exchangeToken, SpotifyError, spotifyGet } from "@/lib/spotify/api";
import {
  clearSession,
  cookieNames,
  privateResponse,
  setTokens,
  type TokenSet,
} from "@/lib/spotify/session";
import {
  ranges,
  rangeLabels,
  type Artist,
  type Track,
  type Profile,
  type DashboardData,
  type TimeRange,
  type WindowData,
} from "@/lib/spotify/types";

export async function GET(request: NextRequest) {
  let token = request.cookies.get(cookieNames.access)?.value;
  const refresh = request.cookies.get(cookieNames.refresh)?.value;
  let rotated: TokenSet | undefined;
  const finish = (response: NextResponse) => {
    if (rotated) setTokens(response, rotated);
    return privateResponse(response);
  };
  const unauthenticated = () => {
    const response = privateResponse(
      NextResponse.json(
        {
          error: "Your Spotify session has expired. Connect again to continue.",
          reconnect: true,
        },
        { status: 401 },
      ),
    );
    clearSession(response);
    return response;
  };
  async function refreshAccess() {
    if (!refresh) throw new SpotifyError(401);
    rotated = await exchangeToken(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh,
      }),
    );
    token = rotated.access_token;
  }
  try {
    if (!token) await refreshAccess();
    let profile: Profile;
    try {
      profile = await spotifyGet<Profile>("/me", token!);
    } catch (error) {
      if (!(error instanceof SpotifyError) || error.status !== 401) throw error;
      await refreshAccess();
      profile = await spotifyGet<Profile>("/me", token!);
    }
    const warnings: string[] = [];
    const entries = await Promise.all(
      ranges.map(async (range) => {
        const results = await Promise.allSettled([
          spotifyGet<{ items: Artist[] }>(
            `/me/top/artists?time_range=${range}&limit=50`,
            token!,
          ),
          spotifyGet<{ items: Track[] }>(
            `/me/top/tracks?time_range=${range}&limit=50`,
            token!,
          ),
        ]);
        for (const result of results) {
          if (
            result.status === "rejected" &&
            result.reason instanceof SpotifyError &&
            result.reason.status === 401
          )
            throw result.reason;
        }
        const [artists, tracks] = results;
        if (artists.status === "rejected")
          warnings.push(
            `${rangeLabels[range]} artists could not be loaded. ${failureHint(artists.reason)}`,
          );
        if (tracks.status === "rejected")
          warnings.push(
            `${rangeLabels[range]} tracks could not be loaded. ${failureHint(tracks.reason)}`,
          );
        return [
          range,
          {
            artists:
              artists.status === "fulfilled" ? artists.value.items : null,
            tracks: tracks.status === "fulfilled" ? tracks.value.items : null,
          },
        ] as const;
      }),
    );
    const data: DashboardData = {
      profile: {
        id: profile.id,
        display_name: profile.display_name,
        images: profile.images ?? [],
        external_urls: profile.external_urls,
      },
      windows: Object.fromEntries(entries) as Record<TimeRange, WindowData>,
      warnings,
      updatedAt: new Date().toISOString(),
    };
    return finish(NextResponse.json(data));
  } catch (error) {
    if (error instanceof SpotifyError && [400, 401].includes(error.status))
      return unauthenticated();
    const status =
      error instanceof SpotifyError && [403, 429].includes(error.status)
        ? error.status
        : 503;
    const response = NextResponse.json(
      { error: failureHint(error), reconnect: status === 403 },
      { status },
    );
    if (error instanceof SpotifyError && error.retryAfter)
      response.headers.set("Retry-After", String(error.retryAfter));
    return finish(response);
  }
}
function failureHint(error: unknown) {
  if (error instanceof SpotifyError && error.status === 403)
    return "Spotify denied access. Reconnect with listening-history permission and confirm your account is allowed in the Spotify developer app.";
  if (error instanceof SpotifyError && error.status === 429)
    return `Spotify is receiving too many requests. Try again ${error.retryAfter ? `in ${error.retryAfter} seconds` : "in a little while"}.`;
  return "Spotify is temporarily unavailable. Please try again.";
}
