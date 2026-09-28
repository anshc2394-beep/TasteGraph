import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./load-ts.mjs";

process.env.SPOTIFY_CLIENT_ID = "test-client";
process.env.SPOTIFY_CLIENT_SECRET = "test-secret";
process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/callback";
const { NextRequest } = load("next/server");
const { GET: login } = load("../src/app/api/auth/login/route.ts");
const { GET: callback } = load("../src/app/api/auth/callback/route.ts");
const { GET: dashboard } = load("../src/app/api/spotify/dashboard/route.ts");
const { POST: logout } = load("../src/app/api/auth/logout/route.ts");
const { proxy } = load("../src/proxy.ts");
const origin = "http://127.0.0.1:3000";
const state = "a".repeat(64);
const verifier = "v".repeat(64);
function request(path, cookies = "", extra = {}) {
  return new NextRequest(origin + path, {
    ...extra,
    headers: { host: "127.0.0.1:3000", cookie: cookies, ...extra.headers },
  });
}
const json = (data, status = 200) => Response.json(data, { status });
const profile = {
  id: "test-listener",
  display_name: "Test listener",
  images: [],
};
const realFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = realFetch;
});
test("login goes to Spotify with secure state and the configured callback", async () => {
  const response = await login();
  const url = new URL(response.headers.get("location"));
  assert.equal(url.origin, "https://accounts.spotify.com");
  assert.equal(url.pathname, "/authorize");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    origin + "/api/auth/callback",
  );
  assert.equal(
    url.searchParams.get("state"),
    response.cookies.get("spotify_auth_state").value,
  );
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(response.headers.get("set-cookie"), /SameSite=lax/i);
  assert.equal(response.cookies.get("spotify_auth_state").maxAge, 600);
});
test("login sends an S256 PKCE challenge derived from a private verifier", async () => {
  const { createHash } = await import("node:crypto");
  const response = await login();
  const url = new URL(response.headers.get("location"));
  const stored = response.cookies.get("spotify_pkce_verifier");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge"), createHash("sha256").update(stored.value).digest("base64url"));
  assert.ok(!url.search.includes(stored.value));
  assert.equal(stored.httpOnly, true);
  assert.equal(stored.maxAge, 600);
});
test("callback without the PKCE verifier never exchanges the code", async () => {
  globalThis.fetch = async () => assert.fail("token endpoint must not be called");
  const response = await callback(request("/api/auth/callback?code=test-code&state=" + state, "spotify_auth_state=" + state));
  assert.equal(new URL(response.headers.get("location")).searchParams.get("error"), "state");
  assert.equal(response.cookies.get("spotify_pkce_verifier").maxAge, 0);
});
test("pages and APIs carry a nonce CSP and hardening headers", () => {
  for (const path of ["/", "/demo", "/dashboard", "/api/spotify/dashboard"]) {
    const response = proxy(request(path));
    const policy = response.headers.get("content-security-policy");
    assert.match(policy, /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.match(policy, /object-src 'none'/);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match(response.headers.get("permissions-policy"), /camera=\(\)/);
  }
  const first = proxy(request("/")).headers.get("content-security-policy");
  const second = proxy(request("/")).headers.get("content-security-policy");
  assert.notEqual(first, second, "each response needs a fresh nonce");
});
test("wrong browser origin is redirected before a state cookie is created", () => {
  const response = proxy(
    new NextRequest("http://localhost:3000/api/auth/login", {
      headers: { host: "localhost:3000" },
    }),
  );
  assert.equal(response.headers.get("location"), origin + "/api/auth/login");
  assert.equal(response.headers.get("set-cookie"), null);
});
test("state mismatch is rejected without exchanging a code or leaking inputs", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw Error("must not fetch");
  };
  const response = await callback(
    request(
      "/api/auth/callback?code=private-code&state=" + "b".repeat(64),
      "spotify_auth_state=" + state,
    ),
  );
  assert.equal(
    new URL(response.headers.get("location")).search,
    "?error=state",
  );
  assert.equal(called, false);
  assert.equal(response.cookies.get("spotify_auth_state").maxAge, 0);
  assert.ok(!JSON.stringify([...response.headers]).includes("private-code"));
});
test("successful callback sets both httpOnly tokens and redirects to the canonical dashboard", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://accounts.spotify.com/api/token");
    assert.equal(init.body.get("redirect_uri"), origin + "/api/auth/callback");
    assert.equal(init.body.get("code_verifier"), verifier);
    return json({
      access_token: "test-access",
      refresh_token: "test-refresh",
      expires_in: 3600,
    });
  };
  const response = await callback(
    request(
      "/api/auth/callback?code=test-code&state=" + state,
      "spotify_auth_state=" + state + "; spotify_pkce_verifier=" + verifier,
    ),
  );
  assert.equal(response.headers.get("location"), origin + "/dashboard");
  for (const name of ["spotify_access_token", "spotify_refresh_token"]) {
    const cookie = response.cookies.get(name);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, "lax");
    assert.equal(cookie.path, "/");
    assert.equal(cookie.secure, false);
  }
  assert.equal(response.cookies.get("spotify_auth_state").maxAge, 0);
  assert.match(response.headers.get("cache-control"), /no-store/);
});
test("denial and missing code clear transient state", async () => {
  for (const [query, error] of [
    ["error=access_denied", "denied"],
    ["", "code"],
  ]) {
    const response = await callback(
      request(
        "/api/auth/callback?state=" + state + "&" + query,
        "spotify_auth_state=" + state,
      ),
    );
    assert.equal(
      new URL(response.headers.get("location")).searchParams.get("error"),
      error,
    );
    assert.equal(response.cookies.get("spotify_auth_state").maxAge, 0);
  }
});
test("refresh on expiry preserves an omitted refresh token and returns no credentials in JSON", async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("/api/token")) {
      refreshes++;
      assert.equal(init.body.get("refresh_token"), "test-refresh");
      return json({ access_token: "renewed-test-access", expires_in: 3600 });
    }
    assert.equal(init.headers.Authorization, "Bearer renewed-test-access");
    return json(String(url).endsWith("/me") ? profile : { items: [] });
  };
  const response = await dashboard(
    request("/api/spotify/dashboard", "spotify_refresh_token=test-refresh"),
  );
  assert.equal(response.status, 200);
  assert.equal(refreshes, 1);
  assert.equal(
    response.cookies.get("spotify_access_token").value,
    "renewed-test-access",
  );
  assert.equal(response.cookies.get("spotify_refresh_token"), undefined);
  const body = await response.text();
  assert.ok(
    !body.includes("test-refresh") && !body.includes("renewed-test-access"),
  );
});
test("revoked access token is refreshed once before loading the dashboard", async () => {
  let refreshes = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("/api/token")) {
      refreshes++;
      return json({
        access_token: "new",
        refresh_token: "rotated",
        expires_in: 3600,
      });
    }
    if (init.headers.Authorization === "Bearer old") return json({}, 401);
    return json(String(url).endsWith("/me") ? profile : { items: [] });
  };
  const response = await dashboard(
    request(
      "/api/spotify/dashboard",
      "spotify_access_token=old; spotify_refresh_token=valid",
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(refreshes, 1);
  assert.equal(response.cookies.get("spotify_refresh_token").value, "rotated");
});
test("invalid refresh clears credentials and asks to reconnect", async () => {
  globalThis.fetch = async () => json({ error: "invalid_grant" }, 400);
  const response = await dashboard(
    request("/api/spotify/dashboard", "spotify_refresh_token=expired"),
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).reconnect, true);
  assert.equal(response.cookies.get("spotify_refresh_token").maxAge, 0);
});
test("one unavailable window remains null without suppressing successful sections", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes("artists?time_range=long_term"))
      return json({}, 429);
    return json(String(url).endsWith("/me") ? profile : { items: [] });
  };
  const response = await dashboard(
    request("/api/spotify/dashboard", "spotify_access_token=valid"),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.windows.long_term.artists, null);
  assert.deepEqual(body.windows.short_term.artists, []);
  assert.equal(body.warnings.length, 1);
});
test("HTTPS configuration makes auth cookies Secure", async () => {
  process.env.SPOTIFY_REDIRECT_URI =
    "https://tastegraph.example/api/auth/callback";
  try {
    assert.equal(
      (await login()).cookies.get("spotify_auth_state").secure,
      true,
    );
  } finally {
    process.env.SPOTIFY_REDIRECT_URI = origin + "/api/auth/callback";
  }
});
test("network failures in the callback report a connection issue without leaking error details", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("private network detail");
  };
  const response = await callback(
    request(
      "/api/auth/callback?code=test-code&state=" + state,
      "spotify_auth_state=" + state + "; spotify_pkce_verifier=" + verifier,
    ),
  );
  assert.equal(
    new URL(response.headers.get("location")).searchParams.get("error"),
    "connection",
  );
  assert.equal(response.cookies.get("spotify_auth_state").maxAge, 0);
});
test("rate limiting preserves the session and forwards Retry-After", async () => {
  globalThis.fetch = async () =>
    new Response("{}", { status: 429, headers: { "Retry-After": "12" } });
  const response = await dashboard(
    request("/api/spotify/dashboard", "spotify_access_token=valid"),
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "12");
  assert.equal(response.cookies.get("spotify_access_token"), undefined);
});
test("logout requires same-origin POST and clears the session", async () => {
  const rejected = await logout(
    request("/api/auth/logout", "", {
      method: "POST",
      headers: { origin: "https://other.example" },
    }),
  );
  assert.equal(rejected.status, 403);
  const accepted = await logout(
    request("/api/auth/logout", "", { method: "POST", headers: { origin } }),
  );
  assert.equal(accepted.status, 303);
  assert.equal(accepted.cookies.get("spotify_access_token").maxAge, 0);
});
