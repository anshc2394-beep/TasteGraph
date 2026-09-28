import { spotifyConfig } from "./config";
import type { TokenSet } from "./session";

export class SpotifyError extends Error {
  constructor(
    public status: number,
    public retryAfter?: number,
  ) {
    super("Spotify request failed");
  }
}
export async function exchangeToken(
  params: URLSearchParams,
): Promise<TokenSet> {
  const { clientId, clientSecret } = spotifyConfig();
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: params,
  });
  if (!response.ok)
    throw new SpotifyError(response.status, retryDelay(response));
  const data = await response.json();
  if (
    typeof data.access_token !== "string" ||
    !data.access_token ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0 ||
    (data.refresh_token !== undefined &&
      (typeof data.refresh_token !== "string" || !data.refresh_token))
  )
    throw new SpotifyError(502);
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token,
  };
}
function retryDelay(response: Response) {
  const raw = response.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds)) : undefined;
}
export async function spotifyGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new SpotifyError(response.status, retryDelay(response));
  return response.json() as Promise<T>;
}
