"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { rangeLabels, type TimeRange, type WindowData } from "@/lib/spotify/types";
import { Artwork } from "./ui";
import { musicSpring } from "./music-motion";
import { artworkSource } from "@/lib/artwork";

const chronology: TimeRange[] = ["long_term", "medium_term", "short_term"];
const axes = [90, 450, 810];

export function RankJourney({ windows, range }: { windows: Record<TimeRange, WindowData>; range: TimeRange }) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const artists = windows[range].artists?.slice(0, 5) ?? [];
  const focused = artists.find((artist) => artist.id === focusId) ?? artists[0];
  const positions = artists.map((artist) => ({ artist, ranks: chronology.map((key) => (windows[key].artists ?? []).findIndex((item) => item.id === artist.id) + 1 || null) }));
  const maxRank = Math.max(10, ...positions.flatMap(({ ranks }) => ranks.filter((rank): rank is number => rank !== null)));
  const selectedRanks = positions.find(({ artist }) => artist.id === focused?.id)?.ranks;
  if (!focused || !selectedRanks) return null;
  return <div className="journey">
    <div className="journey-header"><h3>Follow the through line.</h3><p>Choose an artist to compare their rank. These listening windows overlap; they are not dated listening history.</p></div>
    <div className="journey-choices" role="group" aria-label="Artist to trace">
      {artists.map((artist, i) => <motion.button key={artist.id} layout={!reduced} className={artist.id === focused.id ? "selected" : ""} aria-pressed={artist.id === focused.id} onClick={() => setFocusId(artist.id)} transition={reduced ? { duration: 0 } : musicSpring}>
        <Artwork images={artist.images} name={artist.name} size={88} decorative /><span className="journey-index">{String(i + 1).padStart(2,"0")}</span><span>{artist.name}</span>
        {artist.id === focused.id && <motion.i layoutId="journey-indicator" transition={reduced ? { duration: 0 } : musicSpring} />}
      </motion.button>)}
    </div>
    <div className="journey-chart">
      <svg viewBox="0 0 900 440" role="img" aria-label={`Artist ranks across overlapping windows. ${focused.name}: ${selectedRanks.map((rank, i) => `${rangeLabels[chronology[i]]}, ${rank ? `rank ${rank}` : "not in the returned list"}`).join("; ")}`}>
        <motion.rect className="journey-window" y="8" width="128" height="396" rx="24" initial={false} animate={{ x: axes[chronology.indexOf(range)] - 64 }} transition={reduced ? { duration: 0 } : musicSpring} />
        {axes.map((x, i) => <g key={x}><line className="journey-guide" x1={x} y1="62" x2={x} y2="368" /><text className="journey-axis" x={x} y="40" textAnchor="middle">{rangeLabels[chronology[i]]}</text></g>)}
        <text className="journey-scale-label" x="24" y="86">#1</text><text className="journey-scale-label" x="24" y="355">#{maxRank}</text>
        <AnimatePresence initial={false}>
          {positions.map(({ artist, ranks }) => {
            const active = artist.id === focused.id;
            const points = ranks.map((rank, i) => rank ? { x: axes[i], y: 85 + (rank - 1) / (maxRank - 1) * 266 } : null);
            const image = artworkSource(artist.images, 100);
            return <motion.g key={artist.id} className={active ? "journey-artist active" : "journey-artist"} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: active ? 1 : .18 }} exit={{ opacity: 0 }}>
              {points.slice(0, 2).map((point, i) => {
                const next = points[i + 1];
                const path = point && next ? `M ${point.x} ${point.y} C ${point.x + 155} ${point.y}, ${next.x - 155} ${next.y}, ${next.x} ${next.y}` : null;
                return path ? <motion.path key={i} d={path} className={active ? "journey-line active" : "journey-line"} fill="none" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1, d: path }} transition={reduced ? { duration: 0 } : musicSpring} /> : null;
              })}
              {points.map((point, i) => point ? <motion.g key={i} initial={false} animate={{ x: point.x, y: point.y }} transition={reduced ? { duration: 0 } : musicSpring}>
                <circle className={active ? "journey-point active" : "journey-point"} r={active ? 27 : 5} />
                {active && image && <><defs><clipPath id={`journey-${artist.id}-${i}`}><circle r="23" /></clipPath></defs><image href={image} x="-23" y="-23" width="46" height="46" clipPath={`url(#journey-${artist.id}-${i})`} preserveAspectRatio="xMidYMid slice" /></>}
                {active && <text className="journey-rank" y={image ? 48 : 7} textAnchor="middle">#{ranks[i]}</text>}
              </motion.g> : active ? <g key={i}><circle className="journey-missing" cx={axes[i]} cy="380" r="7" /><text className="journey-absent" x={axes[i]} y="425" textAnchor="middle">Not in list</text></g> : null)}
            </motion.g>;
          })}
        </AnimatePresence>
      </svg>
    </div>
    <div className="journey-reading"><h4>{focused.name}</h4><div>{selectedRanks.map((rank, i) => <span key={chronology[i]}><small>{rangeLabels[chronology[i]]}</small><strong>{rank ? `#${rank}` : "Not in list"}</strong></span>)}</div></div>
  </div>;
}
