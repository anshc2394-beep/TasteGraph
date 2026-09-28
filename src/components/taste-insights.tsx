"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Movement, TasteAnalytics } from "@/lib/analytics";
import { Artwork, SpotifyLink } from "./ui";
import { RankJourney } from "./rank-journey";
import type { TimeRange, WindowData } from "@/lib/spotify/types";
import { RevealTitle, AnimatedNumber, Reveal, musicEase, revealGroup, revealItem, revealViewport } from "./music-motion";

function MovementList({
  items,
  type,
}: {
  items: Movement[];
  type: "rising" | "persistent" | "fading";
}) {
  if (!items.length)
    return <p className="empty-compact">No artists meet this pattern yet.</p>;
  return (
    <motion.ol className="movement-list" variants={revealGroup}>
      {items.slice(0, 4).map((item) => (
        <motion.li key={item.artist.id} variants={revealItem}>
          <SpotifyLink
            href={
              item.artist.external_urls?.spotify ??
              `https://open.spotify.com/artist/${item.artist.id}`
            }
          >
            <Artwork
              images={item.artist.images}
              name={item.artist.name}
              size={88}
            />
            <div>
              <h4>{item.artist.name}</h4>
              <p>
                {type === "persistent"
                  ? `#${item.longRank} → #${item.mediumRank} → #${item.shortRank}`
                  : item.shortRank === null
                    ? "Outside recent top 50"
                    : item.longRank === null
                      ? `New to recent top 50 · #${item.shortRank}`
                      : `#${item.longRank} → #${item.shortRank} recently`}
              </p>
            </div>
            <span className={`movement-tag ${type}`}>
              {type === "persistent"
                ? "♥"
                : item.change === null
                  ? type === "rising"
                    ? "NEW"
                    : "↘"
                  : `${item.change > 0 ? "↑" : "↓"}${Math.abs(item.change)}`}
            </span>
          </SpotifyLink>
        </motion.li>
      ))}
    </motion.ol>
  );
}
export function TasteInsights({
  analytics,
  windows,
  range,
}: {
  analytics: TasteAnalytics | null;
  windows: Record<TimeRange, WindowData>;
  range: TimeRange;
}) {
  const reduced = useReducedMotion();
  return (
    <section id="evolution" className="content-section">
      <div className="section-heading">
        <div>
          <span className="section-number">03</span>
          <h2><RevealTitle>Your taste, in motion.</RevealTitle></h2>
        </div>
        <span>THREE LISTENING WINDOWS / ONE YOU</span>
      </div>
      {analytics ? (
        <>
          {analytics.sampleSize < 10 && (
            <p className="notice">
              Your listening sample is small. Treat these early patterns as a
              starting point.
            </p>
          )}
          <Reveal><RankJourney windows={windows} range={range} /></Reveal>
          <motion.div className="insights-grid" variants={revealGroup} initial={reduced ? false : "hidden"} whileInView="shown" viewport={revealViewport}>
            {(
              [
                [
                  "rising",
                  "↗",
                  "On the rise",
                  "Finding a place in your rotation.",
                ],
                [
                  "persistent",
                  "✳",
                  "Here to stay",
                  "The through line in your listening.",
                ],
                [
                  "fading",
                  "↘",
                  "Taking a back seat",
                  "Old favorites making room for new ones.",
                ],
              ] as const
            ).map(([key, icon, title, subtitle]) => (
              <motion.article className="insight-card" key={key} variants={revealGroup}>
                <span className={`insight-icon ${key}`} aria-hidden="true">
                  {icon}
                </span>
                <motion.div className="insight-heading" variants={revealItem}><h3>{title}</h3><strong><AnimatedNumber value={analytics[key].length} /></strong></motion.div>
                <motion.p variants={revealItem}>{subtitle}</motion.p>
                <MovementList items={analytics[key]} type={key} />
              </motion.article>
            ))}
          </motion.div>
          <Reveal className="overlap-panel">
            <div>
              <p className="eyebrow">COMMON GROUND</p>
              <h3>
                Different eras.
                <br />
                Shared favorites.
              </h3>
              <p>How much your artist lists have in common.</p>
            </div>
            <div className="overlap-bars">
              {analytics.overlaps.map((item) => (
                <div key={item.label}>
                  <div className="overlap-label">
                    <span>{item.label}</span>
                    <strong>
                      {item.percent}% <small>· {item.shared} shared</small>
                    </strong>
                  </div>
                  <div
                    className="overlap-track"
                    role="meter"
                    aria-label={`Artist overlap: ${item.label}`}
                    aria-valuenow={item.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <motion.span style={{ width: `${item.percent}%`, originX: 0 }} initial={reduced ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: .2, ease: musicEase }} />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </>
      ) : (
        <div className="empty-state">
          <h3>Every story needs a little history.</h3>
          <p>
            We need non-empty artist lists from all three windows to compare
            your taste. Keep listening, or refresh if Spotify couldn’t load a
            window.
          </p>
        </div>
      )}
      <details id="methodology" className="methodology">
        <summary>
          How we read your listening patterns <span aria-hidden="true">+</span>
        </summary>
        <div>
          <p>
            Spotify ranks your top music by affinity, not play counts. We
            compare up to 50 artists per window: approximately 4 weeks, 6
            months, and 1 year. The windows overlap; this is a snapshot
            comparison, not a historical timeline.
          </p>
          <p>
            <strong>Taste Drift (0-100):</strong> Each selected window is
            compared with both other windows. The displayed score is the average
            of two rank-weighted Jaccard distances: 100 × (1 - weighted
            similarity). Artists receive a weight of 1 / log₂(rank + 1),
            normalized within each list. Zero means identical ranked artists in
            both comparisons; 100 means no shared artists. This is a TasteGraph
            estimate, not a Spotify metric.
          </p>
          <p>
            <strong>Rising:</strong> recent top 20 artists who climbed at least
            five places or are absent from the long-term top 50.{" "}
            <strong>Persistent:</strong> artists in the top 20 of every window,
            sorted by average rank. <strong>Fading:</strong> long-term top 20
            artists who dropped at least five places or are absent from the
            recent list. “New” means new to the compared list, not necessarily
            your first listen.
          </p>
          <p>
            <strong>Overlap:</strong> shared artist count divided by the number
            of unique artists in the two lists (Jaccard similarity). Missing or
            empty windows do not produce a score. A shorter history makes
            comparisons less reliable. Switching the time range changes the top
            artists and tracks; evolution insights always compare all three
            windows.
          </p>
        </div>
      </details>
    </section>
  );
}
