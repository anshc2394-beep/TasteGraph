"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { TasteAnalytics } from "@/lib/analytics";
import { rangeLabels, type DashboardData, type TimeRange } from "@/lib/spotify/types";
import { TasteGraph } from "./taste-graph";
import { AnimatedNumber, musicEase, musicSpring } from "./music-motion";

function DriftOrbit({ score }: { score: number | null }) {
  const reduced = useReducedMotion();
  const proportion = (score ?? 0) / 100;
  return <div className="atlas-drift">
    <div className="atlas-drift-label"><span>Taste Drift</span><a href="#methodology" aria-label="How Taste Drift is measured">↗</a></div>
    <div className="atlas-drift-value"><AnimatedNumber value={score} delay={.85} /><small>/ 100</small></div>
    <svg viewBox="0 0 300 100" role="img" aria-label={score === null ? "Not enough listening data to compare" : `Taste Drift ${score} of 100. Lower means more consistent top artists.`}>
      <path className="drift-guide" d="M 20 84 Q 150 -28 280 84" />
      <motion.path className="drift-trajectory" initial={reduced ? false : { d: "M 20 84 Q 20 84 20 84", opacity: 0 }} animate={{ d: `M 20 84 Q ${20 + 130 * proportion} ${84 - 112 * proportion} ${20 + 260 * proportion} ${84 - 224 * proportion * (1 - proportion)}`, opacity: score === null ? 0 : 1 }} transition={reduced ? { duration: 0 } : musicSpring} />
      {score !== null && <motion.circle r="7" initial={false} animate={{ cx: 20 + 260 * proportion, cy: 84 - 224 * proportion * (1 - proportion) }} transition={reduced ? { duration: 0 } : musicSpring} />}
      <text x="20" y="99">Consistent</text><text x="280" y="99" textAnchor="end">Distinct</text>
    </svg>
    <p>{score === null ? "Three listening windows are needed." : "Rank-weighted difference from your other two listening windows."}</p>
  </div>;
}

export function DashboardHero({ data, range, analytics }: { data: DashboardData; range: TimeRange; analytics: TasteAnalytics | null }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const graphY = useTransform(scrollYProgress, [0, 1], [0, 48]);
  const selected = data.windows[range];
  const name = (data.profile.display_name || "Your").trim().split(/\s+/)[0];
  const title = name === "Your" ? "Your" : `${name}’s`;
  return <section id="overview" className="atlas-hero" ref={ref}>
    <div className="atlas-identity">
      <p className="atlas-edition">YOUR LISTENING IDENTITY</p>
      <h1 aria-label={`${title} musical universe`}>
        {[title, "universe."].map((line, i) => <span className="atlas-title-line" key={i}><motion.span initial={reduced ? false : { y: "105%" }} animate={{ y: 0 }} transition={{ duration: reduced ? 0 : .9, delay: reduced ? 0 : .18 + i * .1, ease: musicEase }}>{line}</motion.span></span>)}
      </h1>
      <motion.p className="atlas-window" initial={reduced ? false : { clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }} transition={{ delay: reduced ? 0 : .55, duration: reduced ? 0 : .6 }}>{selected.artists === null ? "Artist list unavailable" : `Your top ${selected.artists.length} artists`} / {rangeLabels[range]}</motion.p>
      <motion.div className="atlas-drift-enter" initial={reduced ? false : { opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...musicSpring, delay: reduced ? 0 : .85 }}><DriftOrbit score={analytics?.driftByRange[range] ?? null} /></motion.div>
    </div>
    <motion.div className="atlas-visual" style={reduced ? undefined : { y: graphY }}><TasteGraph artists={selected.artists} profile={data.profile} range={range} /></motion.div>
    <motion.div className="atlas-footnote" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : 1.2 }}><span>Size reflects rank, not play count.</span><span>Connections = shared Spotify genre tag.</span></motion.div>
  </section>;
}
