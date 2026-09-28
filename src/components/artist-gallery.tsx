"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { Artist } from "@/lib/spotify/types";
import { Artwork, SpotifyLink } from "./ui";
import { musicEase, musicSpring } from "./music-motion";

/** Portraits wipe open as they enter, then drift against the scroll for depth. */
function ArtistPortrait({ artist, index }: { artist: Artist; index: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], index === 0 ? [36, -36] : [60, -60]);
  return (
    <motion.div ref={ref} className="artist-portrait" style={reduced ? undefined : { y: drift }}
      whileHover={reduced ? undefined : { rotate: index % 2 ? 1.5 : -1.5 }} transition={musicSpring}>
      <motion.div className="artist-reveal"
        initial={reduced ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
        whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.1, ease: musicEase }}>
        <motion.div className="artist-zoom" initial={reduced ? false : { scale: 1.25 }} whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.3 }} transition={{ duration: 1.4, ease: musicEase }}>
          <Artwork images={artist.images} name={artist.name} size={560} />
        </motion.div>
      </motion.div>
      <span className="image-link" aria-hidden="true">↗</span>
    </motion.div>
  );
}

/** 21st.dev's image-focus idea, adapted to ranked Spotify artwork and keyboard focus. */
export function ArtistGallery({ artists }: { artists: Artist[] }) {
  const reduced = useReducedMotion();
  return (
    <div className="editorial-artists">
      <AnimatePresence initial={false} mode="popLayout">
        {artists.slice(0, 5).map((artist, i) => (
          <motion.div
            key={artist.id}
            className={`artist-entry ${i === 0 ? "featured" : ""}`}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
            transition={reduced ? { duration: 0 } : { layout: musicSpring, opacity: { duration: 0.2 } }}
          >
            <SpotifyLink className="artist-link" href={artist.external_urls?.spotify ?? `https://open.spotify.com/artist/${artist.id}`}>
              <ArtistPortrait artist={artist} index={i} />
              <motion.div className="artist-caption" layout={reduced ? false : "position"}
                initial={reduced ? false : { opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.9, delay: 0.15, ease: musicEase }}>
                <span className="artist-position">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{artist.name}</h3>
                  <p>{artist.genres?.[0] || "In your rotation"}</p>
                </div>
              </motion.div>
            </SpotifyLink>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
