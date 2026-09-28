"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type Artist, type Profile, type TimeRange, rangeLabels } from "@/lib/spotify/types";
import { Artwork, SpotifyLink } from "./ui";
import { musicSpring } from "./music-motion";
import { artworkSource } from "@/lib/artwork";

type Node = { artist: Artist; rank: number; genre: string | null; x: number; y: number; size: number };
/** Rank determines prominence; shared Spotify tags determine relationships. */
function placeArtists(artists: Artist[]): Node[] {
  const angles = [-68, 24, 144, 212, -18, 86, 174, 254, 50, 114];
  return artists.slice(0, 10).map((artist, i) => {
    const angle = angles[i] * Math.PI / 180;
    const radius = i < 4 ? 183 : 280;
    return { artist, rank: i + 1, genre: artist.genres?.[0]?.toLowerCase() ?? null,
      x: 400 + Math.cos(angle) * radius, y: 278 + Math.sin(angle) * radius * .76,
      size: i === 0 ? 56 : i < 4 ? 43 : 28 };
  });
}

export function TasteGraph({ artists, profile, range }: { artists: Artist[] | null; profile: Profile; range: TimeRange }) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [assembled, setAssembled] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => { const timer = setTimeout(() => setAssembled(true), 1400); return () => clearTimeout(timer); }, []);
  const base = placeArtists(artists ?? []);
  const anchor = base.find((node) => node.artist.id === focusId);
  const hovered = base.find((node) => node.artist.id === hoverId);
  const focused = hovered ?? anchor ?? base[0];
  const companions = base.filter((node) => node !== anchor);
  const nodes = anchor ? base.map((node) => {
    if (node === anchor) return { ...node, x: 400, y: 155, size: 66 };
    // Reserve the upper sector for the enlarged selection; keep its neighbors
    // on one arc so shared-genre nodes cannot collide with the focal artwork.
    const position = companions.indexOf(node);
    const angle = (-20 + position * 220 / Math.max(1, companions.length - 1)) * Math.PI / 180;
    return { ...node, x: 400 + Math.cos(angle) * 280, y: 285 + Math.sin(angle) * 190 };
  }) : base;
  const related = (node: Node) => !hovered || node.artist.id === hovered.artist.id || Boolean(node.genre && node.genre === hovered.genre);
  const connections = nodes.flatMap((node, i) => nodes.slice(i + 1).filter((other) => node.genre && node.genre === other.genre).map((other) => ({ node, other })));
  const toggle = (id: string) => setFocusId((current) => current === id ? null : id);
  return <section id="graph" className="atlas-graph" aria-label={`TasteGraph for ${profile.display_name || "you"}, ${rangeLabels[range]}`}>
    {focused ? <>
      <div className="atlas-map">
        <svg viewBox="0 0 800 560" role="group" aria-label="Interactive top artist constellation">
          <ellipse className="atlas-orbit" cx="400" cy="278" rx="183" ry="140" />
          <ellipse className="atlas-orbit outer" cx="400" cy="278" rx="280" ry="213" />
          {nodes.map((node) => <motion.line key={`spoke-${node.artist.id}`} className="atlas-spoke" x1="400" y1="278" initial={reduced ? false : { pathLength: 0, x2: 400, y2: 278, opacity: 0 }} animate={{ pathLength: 1, x2: node.x, y2: node.y, opacity: related(node) ? .45 : .07 }} transition={reduced ? { duration: 0 } : { ...musicSpring, delay: assembled ? 0 : .6 }} />)}
          {connections.map(({ node, other }) => <motion.line key={[node.artist.id, other.artist.id].sort().join("-")} className="atlas-connection" x1={node.x} y1={node.y} x2={other.x} y2={other.y} initial={reduced ? false : { pathLength: 0, x1: node.x, y1: node.y, x2: other.x, y2: other.y, opacity: 0 }} animate={{ pathLength: 1, x1: node.x, y1: node.y, x2: other.x, y2: other.y, opacity: hovered && hovered.genre !== node.genre ? .03 : .55 }} transition={reduced ? { duration: 0 } : { ...musicSpring, delay: assembled ? 0 : .75 }} />)}
          <motion.g initial={reduced ? false : { opacity: 0, scale: .3 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: "400px 278px" }} transition={{ ...musicSpring, delay: reduced ? 0 : .35 }}>
            <circle className="atlas-center-halo" cx="400" cy="278" r="55" /><circle className="atlas-center" cx="400" cy="278" r="38" />
            <text className="atlas-you" x="400" y="285" textAnchor="middle">YOU</text>
          </motion.g>
          <AnimatePresence>
            {nodes.map((node, i) => {
              const image = artworkSource(node.artist.images, 160);
              const active = node.artist.id === focused.artist.id;
              return <motion.g key={node.artist.id} role="button" tabIndex={0} className={`atlas-node ${active ? "is-selected" : ""}`} aria-pressed={focusId === node.artist.id} aria-label={`${node.artist.name}, rank ${node.rank}. Select to focus.`}
                onClick={() => toggle(node.artist.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(node.artist.id); } }}
                onMouseEnter={() => setHoverId(node.artist.id)} onMouseLeave={() => setHoverId(null)} onFocus={() => setHoverId(node.artist.id)} onBlur={() => setHoverId(null)}
                initial={reduced ? false : { x: 400, y: 278, opacity: 0, scale: .25 }} animate={{ x: node.x, y: node.y, opacity: related(node) ? 1 : .25, scale: active ? 1.07 : 1 }} exit={{ opacity: 0, scale: .4 }}
                transition={reduced ? { duration: 0 } : { ...musicSpring, delay: assembled ? 0 : .45 + i * .035 }}>
                <defs><clipPath id={`artist-clip-${node.artist.id}`}><motion.circle r={node.size} initial={false} animate={{ r: node.size }} transition={reduced ? { duration: 0 } : musicSpring} /></clipPath></defs>
                <motion.circle className="atlas-node-rim" r={node.size + 4} initial={false} animate={{ r: node.size + 4 }} transition={reduced ? { duration: 0 } : musicSpring} />
                {image ? <motion.image href={image} x={-node.size} y={-node.size} width={node.size * 2} height={node.size * 2} initial={false} animate={{ attrX: -node.size, attrY: -node.size, width: node.size * 2, height: node.size * 2 }} transition={reduced ? { duration: 0 } : musicSpring} clipPath={`url(#artist-clip-${node.artist.id})`} preserveAspectRatio="xMidYMid slice" /> : <><circle className="atlas-node-empty" r={node.size} /><text className="atlas-initial" textAnchor="middle" y="10">{node.artist.name[0]}</text></>}
                <text className="atlas-node-rank" x={node.size - 5} y={-node.size + 2} textAnchor="middle">{String(node.rank).padStart(2,"0")}</text>
                <text className="atlas-node-name" textAnchor="middle" y={node.size + 21}>{node.artist.name.length > 22 ? `${node.artist.name.slice(0, 21)}…` : node.artist.name}</text>
              </motion.g>;
            })}
          </AnimatePresence>
        </svg>
        {anchor && <button className="graph-reset" onClick={() => setFocusId(null)}>Show entire universe ↗</button>}
      </div>
      <div className="atlas-touch-artists" role="group" aria-label="Explore artists in the graph">{nodes.map((node) => <button key={node.artist.id} aria-pressed={focusId === node.artist.id} onClick={() => toggle(node.artist.id)}>{String(node.rank).padStart(2,"0")} <span>{node.artist.name}</span></button>)}</div>
      <motion.div className="atlas-detail" layout={!reduced}>
        <Artwork images={focused.artist.images} name={focused.artist.name} size={120} />
        <div><p>IN FOCUS / NO. {String(focused.rank).padStart(2,"0")}</p><h2>{focused.artist.name}</h2><span>{focused.genre ?? "Genre unavailable"}</span></div>
        <SpotifyLink href={focused.artist.external_urls?.spotify ?? `https://open.spotify.com/artist/${focused.artist.id}`} className="atlas-listen">Listen <span aria-hidden="true">↗</span></SpotifyLink>
      </motion.div>
    </> : <div className="atlas-empty"><h2>Your map is waiting.</h2><p>{artists === null ? "Spotify couldn’t load this artist window. Try refreshing your data." : "Your top artists will appear here as your listening history grows."}</p></div>}
  </section>;
}
