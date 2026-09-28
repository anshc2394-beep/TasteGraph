export const ranges = ["short_term", "medium_term", "long_term"] as const;
export type TimeRange = (typeof ranges)[number];
export const rangeLabels: Record<TimeRange, string> = {
  short_term: "4 weeks",
  medium_term: "6 months",
  long_term: "1 year",
};
export type SpotifyImage = { url: string; width?: number; height?: number };
export type Artist = {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres?: string[];
  external_urls?: { spotify: string };
};
export type Track = {
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: SpotifyImage[] };
  external_urls?: { spotify: string };
};
export type Profile = {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
  external_urls?: { spotify: string };
};
export type WindowData = { artists: Artist[] | null; tracks: Track[] | null };
export type DashboardData = {
  profile: Profile;
  windows: Record<TimeRange, WindowData>;
  warnings: string[];
  updatedAt: string;
};
