import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ranges = ["short_term", "medium_term", "long_term"];
const demo = JSON.parse(readFileSync(new URL("../src/data/demo-dashboard.json", import.meta.url), "utf8"));

test("public demo data is anonymized and complete", () => {
  assert.deepEqual(demo.profile, { id: "demo", display_name: "Demo Listener", images: [] });
  assert.deepEqual(demo.warnings, []);
  for (const range of ranges) {
    assert.ok(demo.windows[range].artists.length > 0, `${range} artists`);
    for (const artist of demo.windows[range].artists) {
      assert.equal(typeof artist.id, "string");
      assert.equal(typeof artist.name, "string");
      assert.ok(Array.isArray(artist.images));
    }
  }
});

function run(raw) {
  const dir = mkdtempSync(join(tmpdir(), "tastegraph-demo-"));
  const input = join(dir, "raw.json");
  const output = join(dir, "demo.json");
  writeFileSync(input, JSON.stringify(raw));
  try {
    execFileSync(process.execPath, ["scripts/make-demo.mjs", input, output], { stdio: "pipe" });
    return { ok: true, data: JSON.parse(readFileSync(output, "utf8")) };
  } catch {
    return { ok: false, written: existsSync(output) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const item = (id, name) => ({
  id, name, genres: ["jazz"], popularity: 80, uri: `spotify:artist:${id}`, href: `https://api.spotify.com/v1/artists/${id}`,
  images: [{ url: "https://i.scdn.co/image/abc", width: 640, height: 640 }, { url: "https://evil.example/x.png" }],
  external_urls: { spotify: `https://open.spotify.com/artist/${id}` },
});
const raw = (artistName = "Some Artist") => ({
  profile: { id: "private-user-123", display_name: "Private Person", images: [{ url: "https://i.scdn.co/image/me" }], external_urls: { spotify: "https://open.spotify.com/user/private-user-123" } },
  windows: Object.fromEntries(ranges.map((range) => [range, { artists: [item("a1", artistName)], tracks: [] }])),
  warnings: ["x"], updatedAt: "2026-09-01T10:11:12.000Z",
});

test("sanitizer removes the account identity and unused Spotify fields", () => {
  const result = run(raw());
  assert.ok(result.ok);
  const text = JSON.stringify(result.data);
  for (const secret of ["private-user-123", "Private Person", "image/me", "api.spotify.com", "spotify:artist", "evil.example", "popularity"])
    assert.ok(!text.includes(secret), secret);
  assert.equal(result.data.profile.display_name, "Demo Listener");
  assert.equal(result.data.windows.short_term.artists[0].images.length, 1);
});

test("sanitizer refuses to write when an identifier would survive", () => {
  const result = run(raw("Private Person"));
  assert.equal(result.ok, false);
  assert.equal(result.written, false);
});
