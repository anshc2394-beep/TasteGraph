// Turns a private dashboard snapshot into the anonymized public demo dataset.
// Usage: npm run demo:build  (reads snapshot.raw.json, which is gitignored)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const RANGES = ["short_term", "medium_term", "long_term"];
const OUTPUT = resolve(process.argv[3] ?? "src/data/demo-dashboard.json");
const IMAGE_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(scdn\.co|spotifycdn\.com)\//;
const SPOTIFY_PAGE = /^https:\/\/open\.spotify\.com\/(artist|track)\/[A-Za-z0-9]+$/;

function fail(message) {
  console.error(`demo:build failed: ${message}`);
  process.exit(1);
}
const text = (value, field) => {
  if (typeof value !== "string" || !value.trim()) fail(`missing ${field}`);
  return value;
};
const images = (list = []) => list
  .filter((image) => typeof image?.url === "string" && IMAGE_HOSTS.test(image.url))
  .map(({ url, width, height }) => ({ url, width, height }));
const link = (urls) => (SPOTIFY_PAGE.test(urls?.spotify ?? "") ? { spotify: urls.spotify } : undefined);

const artist = (item) => ({
  id: text(item.id, "artist id"),
  name: text(item.name, "artist name"),
  images: images(item.images),
  genres: Array.isArray(item.genres) ? item.genres.filter((genre) => typeof genre === "string").slice(0, 3) : [],
  external_urls: link(item.external_urls),
});
const track = (item) => ({
  id: text(item.id, "track id"),
  name: text(item.name, "track name"),
  duration_ms: Number.isFinite(item.duration_ms) ? item.duration_ms : 0,
  artists: (item.artists ?? []).map((credit) => ({ name: text(credit.name, "track artist") })),
  album: { name: text(item.album?.name, "album name"), images: images(item.album?.images) },
  external_urls: link(item.external_urls),
});

const source = process.argv[2];
if (!source) fail("pass the raw snapshot path, e.g. snapshot.raw.json");
let raw;
try {
  raw = JSON.parse(readFileSync(source, "utf8"));
} catch {
  fail(`could not read ${source}. Save http://127.0.0.1:3000/api/spotify/dashboard there while signed in.`);
}
if (!raw?.profile?.id || !raw?.windows) fail("the file is not a TasteGraph dashboard response");

const windows = Object.fromEntries(RANGES.map((range) => {
  const window = raw.windows[range];
  if (!window?.artists?.length) fail(`${range} has no artists; the demo needs all three windows`);
  return [range, { artists: window.artists.map(artist), tracks: window.tracks ? window.tracks.map(track) : null }];
}));

const demo = {
  profile: { id: "demo", display_name: "Demo Listener", images: [] },
  windows,
  warnings: [],
  updatedAt: `${String(raw.updatedAt ?? new Date().toISOString()).slice(0, 10)}T12:00:00.000Z`,
};

// Nothing that identifies the account may survive, including the profile photo or page.
const output = JSON.stringify(demo, null, 2);
const identifiers = [raw.profile.id, raw.profile.display_name, raw.profile.external_urls?.spotify, ...(raw.profile.images ?? []).map((image) => image?.url)]
  .filter((value) => typeof value === "string" && value.length >= 3);
for (const identifier of identifiers)
  if (output.toLowerCase().includes(identifier.toLowerCase())) fail("an account identifier survived sanitizing; nothing was written");

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${output}\n`);
console.log(`Wrote ${OUTPUT}: ${RANGES.map((range) => `${windows[range].artists.length} artists`).join(" / ")}.`);
console.log(`You can now delete ${source}.`);
