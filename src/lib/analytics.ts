import type { Artist, TimeRange, WindowData } from "./spotify/types";

export type Movement = {
  artist: Artist;
  shortRank: number | null;
  mediumRank: number | null;
  longRank: number | null;
  change: number | null;
};
export type Overlap = {
  label: string;
  shared: number;
  union: number;
  percent: number;
};
export type TasteAnalytics = {
  drift: number;
  driftByRange: Record<TimeRange, number>;
  rising: Movement[];
  persistent: Movement[];
  fading: Movement[];
  overlaps: Overlap[];
  sampleSize: number;
};

function unique(artists: Artist[]) {
  return [
    ...new Map(artists.map((artist) => [artist.id, artist])).values(),
  ].slice(0, 50);
}
function overlap(a: Artist[], b: Artist[], label: string): Overlap {
  const ids = new Set(a.map((artist) => artist.id));
  const shared = b.filter((artist) => ids.has(artist.id)).length;
  const union = new Set([...a, ...b].map((artist) => artist.id)).size;
  return {
    label,
    shared,
    union,
    percent: union ? Math.round((shared / union) * 100) : 0,
  };
}
/** Rank-weighted Jaccard distance. Missing/empty windows have insufficient evidence, not zero drift. */
export function analyzeTaste(
  windows: Record<TimeRange, WindowData>,
): TasteAnalytics | null {
  const lists = [
    windows.short_term.artists,
    windows.medium_term.artists,
    windows.long_term.artists,
  ];
  if (lists.some((list) => !list?.length)) return null;
  const [short, medium, long] = lists.map((list) => unique(list!));
  const rank = (list: Artist[]) =>
    new Map(list.map((artist, index) => [artist.id, index + 1]));
  const [s, m, l] = [short, medium, long].map(rank);
  const all = new Map(
    [...short, ...medium, ...long].map((artist) => [artist.id, artist]),
  );
  const movements = [...all.values()].map((artist): Movement => ({
    artist,
    shortRank: s.get(artist.id) ?? null,
    mediumRank: m.get(artist.id) ?? null,
    longRank: l.get(artist.id) ?? null,
    change:
      s.has(artist.id) && l.has(artist.id)
        ? l.get(artist.id)! - s.get(artist.id)!
        : null,
  }));
  // Normalized reciprocal-log rank weights prevent list-length differences from changing total mass.
  const weights = (list: Artist[]) => {
    const total = list.reduce((sum, _, i) => sum + 1 / Math.log2(i + 2), 0);
    return new Map(
      list.map((artist, i) => [artist.id, 1 / Math.log2(i + 2) / total]),
    );
  };
  const weightedDistance = (first: Artist[], second: Artist[]) => {
    const a = weights(first);
    const b = weights(second);
    let intersection = 0;
    let union = 0;
    for (const id of new Set([...a.keys(), ...b.keys()])) {
      intersection += Math.min(a.get(id) ?? 0, b.get(id) ?? 0);
      union += Math.max(a.get(id) ?? 0, b.get(id) ?? 0);
    }
    return 100 * (1 - intersection / union);
  };
  const shortMedium = weightedDistance(short, medium);
  const mediumLong = weightedDistance(medium, long);
  const shortLong = weightedDistance(short, long);
  return {
    drift: Math.round(shortLong),
    // Each lens is compared with both other lenses; this makes the selected
    // period meaningful while preserving the original short-vs-long metric.
    driftByRange: {
      short_term: Math.round((shortMedium + shortLong) / 2),
      medium_term: Math.round((shortMedium + mediumLong) / 2),
      long_term: Math.round((shortLong + mediumLong) / 2),
    },
    rising: movements
      .filter(
        (a) =>
          a.shortRank !== null &&
          a.shortRank <= 20 &&
          (a.longRank === null || a.change! >= 5),
      )
      .sort(
        (a, b) =>
          (b.change ?? 51 - b.shortRank!) - (a.change ?? 51 - a.shortRank!),
      ),
    persistent: movements
      .filter(
        (a) =>
          a.shortRank !== null &&
          a.mediumRank !== null &&
          a.longRank !== null &&
          Math.max(a.shortRank, a.mediumRank, a.longRank) <= 20,
      )
      .sort(
        (a, b) =>
          a.shortRank! +
          a.mediumRank! +
          a.longRank! -
          (b.shortRank! + b.mediumRank! + b.longRank!),
      ),
    fading: movements
      .filter(
        (a) =>
          a.longRank !== null &&
          a.longRank <= 20 &&
          (a.shortRank === null || a.change! <= -5),
      )
      .sort(
        (a, b) =>
          (a.change ?? a.longRank! - 51) - (b.change ?? b.longRank! - 51),
      ),
    overlaps: [
      overlap(short, medium, "4 weeks / 6 months"),
      overlap(medium, long, "6 months / 1 year"),
      overlap(short, long, "4 weeks / 1 year"),
    ],
    sampleSize: Math.min(short.length, medium.length, long.length),
  };
}
