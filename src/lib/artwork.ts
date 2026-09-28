import type { SpotifyImage } from "./spotify/types";

/** Prefer an adequate resolution, then the largest available image. Local art is supported too. */
export function artworkSource(images: SpotifyImage[] | undefined, size = 240) {
  const safe = (images ?? []).filter(({ url }) => url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")));
  const sized = [...safe].sort((a, b) => (a.width ?? Infinity) - (b.width ?? Infinity));
  return (sized.find((image) => (image.width ?? Infinity) >= size) ?? sized.at(-1))?.url;
}
