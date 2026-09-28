// Server routes and Proxy only. Never expose credentials in client props.
export function spotifyConfig() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri)
    throw new Error("Spotify configuration is incomplete");
  const url = new URL(redirectUri);
  const loopback = ["127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.pathname !== "/api/auth/callback" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("Spotify redirect configuration is invalid");
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    origin: url.origin,
    secure: url.protocol === "https:",
  };
}
