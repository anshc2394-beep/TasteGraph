import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./load-ts.mjs";

// Loaded in its own process: cookie names are fixed when the session module loads.
process.env.SPOTIFY_CLIENT_ID = "test-client";
process.env.SPOTIFY_CLIENT_SECRET = "test-secret";
process.env.SPOTIFY_REDIRECT_URI = "https://tastegraph.example/api/auth/callback";
const { NextRequest } = load("next/server");
const { GET: login } = load("../src/app/api/auth/login/route.ts");
const { proxy } = load("../src/proxy.ts");

test("HTTPS deployments use __Host- prefixed, Secure cookies", async () => {
  const response = await login();
  for (const name of ["__Host-spotify_auth_state", "__Host-spotify_pkce_verifier"]) {
    const cookie = response.cookies.get(name);
    assert.ok(cookie, name);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.path, "/");
    assert.equal(cookie.domain, undefined);
  }
});
test("HTTPS deployments send HSTS and upgrade insecure requests", () => {
  const response = proxy(new NextRequest("https://tastegraph.example/", { headers: { host: "tastegraph.example" } }));
  assert.match(response.headers.get("strict-transport-security"), /max-age=63072000/);
  assert.match(response.headers.get("content-security-policy"), /upgrade-insecure-requests/);
});
