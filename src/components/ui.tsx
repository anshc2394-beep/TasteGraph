import Image from "next/image";
import Link from "next/link";
import type { SpotifyImage } from "@/lib/spotify/types";
import { artworkSource } from "@/lib/artwork";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="TasteGraph home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      TasteGraph<span className="brand-dot">.</span>
    </Link>
  );
}
export function Artwork({
  images,
  name,
  size = 240,
  className = "",
  decorative = false,
}: {
  images?: SpotifyImage[];
  name: string;
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const src = artworkSource(images, size);
  return (
    <span className={`artwork ${className}`}>
      {src ? (
        <Image src={src} alt={decorative ? "" : name} width={size} height={size} unoptimized />
      ) : (
        <span className="artwork-fallback" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : name} aria-hidden={decorative || undefined}>
          {name.slice(0, 1).toUpperCase() || "♪"}
        </span>
      )}
    </span>
  );
}
export function SpotifyLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const safeHref = href.startsWith("https://open.spotify.com/")
    ? href
    : "https://open.spotify.com";
  return (
    <a
      className={className}
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
