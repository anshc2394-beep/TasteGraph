import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./load-ts.mjs";
const { analyzeTaste } = load("../src/lib/analytics.ts");
const artist = (id) => ({ id, name: id, images: [] });
const list = (prefix, length = 20) =>
  Array.from({ length }, (_, i) => artist(prefix + i));
function windows(s, m, l) {
  return {
    short_term: { artists: s, tracks: [] },
    medium_term: { artists: m, tracks: [] },
    long_term: { artists: l, tracks: [] },
  };
}
test("identical ranked lists have zero drift and complete overlap", () => {
  const a = list("a");
  const result = analyzeTaste(windows(a, a, a));
  assert.equal(result.drift, 0);
  assert.deepEqual(result.driftByRange, {
    short_term: 0,
    medium_term: 0,
    long_term: 0,
  });
  assert.equal(result.overlaps[2].percent, 100);
  assert.equal(result.persistent.length, 20);
  assert.equal(result.rising.length, 0);
});
test("disjoint lists produce maximum drift with rising and fading artists", () => {
  const result = analyzeTaste(windows(list("a"), list("b"), list("c")));
  assert.equal(result.drift, 100);
  assert.deepEqual(result.driftByRange, {
    short_term: 100,
    medium_term: 100,
    long_term: 100,
  });
  assert.equal(result.overlaps[2].shared, 0);
  assert.equal(result.rising.length, 20);
  assert.equal(result.fading.length, 20);
  assert.equal(result.persistent.length, 0);
});
test("rank changes affect drift even with identical membership", () => {
  const a = list("a");
  const result = analyzeTaste(windows([...a].reverse(), a, a));
  assert.ok(result.drift > 0 && result.drift < 100);
  assert.equal(result.overlaps[2].percent, 100);
  assert.equal(
    result.rising.find((item) => item.artist.id === "a19").change,
    19,
  );
  assert.equal(
    result.fading.find((item) => item.artist.id === "a0").change,
    -19,
  );
});
test("missing and empty windows never fabricate scores", () => {
  assert.equal(analyzeTaste(windows([], list("b"), list("c"))), null);
  assert.equal(analyzeTaste(windows(list("a"), null, list("c"))), null);
});
test("overlap uses union and handles unequal lists and duplicate IDs", () => {
  const a = list("a", 2);
  const b = [a[0], artist("b")];
  const result = analyzeTaste(windows([...a, a[0]], a, b));
  assert.equal(result.overlaps[2].shared, 1);
  assert.equal(result.overlaps[2].union, 3);
  assert.equal(result.overlaps[2].percent, 33);
  assert.ok(result.drift >= 0 && result.drift <= 100);
});
