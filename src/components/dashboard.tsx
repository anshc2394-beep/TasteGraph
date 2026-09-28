"use client";

import { useEffect, useState, type PointerEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig, useMotionValue, useReducedMotion, useScroll, useSpring } from "motion/react";
import { analyzeTaste } from "@/lib/analytics";
import { rangeLabels, type DashboardData, type TimeRange } from "@/lib/spotify/types";
import { Brand, Artwork, SpotifyLink } from "./ui";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { TasteInsights } from "./taste-insights";
import { TimeRangeSelector } from "./time-range-selector";
import { ArtistGallery } from "./artist-gallery";
import { DashboardHero } from "./dashboard-hero";
import { AnimatedNumber, Reveal, RevealTitle, musicEase, musicSpring, useHydrated } from "./music-motion";

type LoadError = { message: string; reconnect: boolean };
const sections = [
  ["overview", "Your world"], ["graph", "TasteGraph"], ["artists", "Artists"],
  ["tracks", "Tracks"], ["evolution", "Evolution"],
] as const;

/** The No. 1 sleeve leans toward the pointer like a record lifted from the crate. */
function FeaturedSleeve({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 160, damping: 18 });
  const rotateY = useSpring(tiltY, { stiffness: 160, damping: 18 });
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    tiltY.set(((event.clientX - box.left) / box.width - .5) * 14);
    tiltX.set(-((event.clientY - box.top) / box.height - .5) * 14);
  };
  return <div className="sleeve-tilt" onPointerMove={onPointerMove} onPointerLeave={() => { tiltX.set(0); tiltY.set(0); }}>
    <motion.div className="sleeve-tilt-inner" style={reduced ? undefined : { rotateX, rotateY }}>{children}</motion.div>
  </div>;
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 34, restDelta: .001 });
  return <motion.span className="universe-progress" style={{ scaleX }} aria-hidden="true" />;
}

export type DemoDashboardData = DashboardData & { placeholder?: boolean };

/** With `demoData`, renders a fixed, anonymized snapshot and never calls the Spotify API. */
export default function Dashboard({ demoData }: { demoData?: DemoDashboardData }) {
  const [fetched, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [range, setRange] = useState<TimeRange>("short_term");
  const [attempt, setAttempt] = useState(0);
  const [fetching, setLoading] = useState(!demoData);
  // The demo mounts after hydration, like live data, so the server render stays a skeleton
  // and nothing locale- or preference-dependent is rendered twice.
  const hydrated = useHydrated();
  const demo = Boolean(demoData);
  const data = demoData ? (hydrated ? demoData : null) : fetched;
  const loading = demoData ? !hydrated : fetching;
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    fetch("/api/spotify/dashboard", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          setError({ message: payload.error ?? "Spotify couldn’t be reached. Please try again.", reconnect: Boolean(payload.reconnect) });
          return;
        }
        setData(payload);
        setError(null);
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setError({ message: "We couldn’t reach Spotify. Check your connection and try again.", reconnect: false });
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt, demo]);

  useEffect(() => {
    if (!data || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id);
    }, { rootMargin: "-15% 0px -65% 0px" });
    for (const [id] of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [data]);

  function retry() { setLoading(true); setError(null); setAttempt((value) => value + 1); }
  if (!data && loading) return <DashboardSkeleton />;
  if (!data) return (
    <main className="loading-shell">
      <Brand /><p className="eyebrow">A BRIEF INTERRUPTION</p><h1>Your music is still there.</h1>
      <p role="alert">{error?.message}</p>
      <div className="actions">
        {error?.reconnect && <a className="button primary" href="/api/auth/login">Reconnect Spotify ↗</a>}
        <button className="button secondary" onClick={retry}>Try again</button>
        <Link className="text-link" href="/">Back home</Link>
      </div>
    </main>
  );

  const name = data.profile.display_name || "Music lover";
  const selected = data.windows[range];
  const analytics = analyzeTaste(data.windows);
  const tracks = selected.tracks?.slice(0, expanded ? 50 : 8);

  return (
    <MotionConfig reducedMotion="user"><div className="universe-shell">
      <a className="skip-link" href="#overview">Skip to your music</a>
      <header className="universe-nav">
        <ScrollProgress />
        <Brand />
        <nav aria-label="Your music">
          {sections.map(([id, label]) => (
            <a key={id} className={activeSection === id ? "active" : ""} href={`#${id}`} onClick={() => setActiveSection(id)}>
              {label}
              {activeSection === id && <motion.span layoutId="universe-nav-active" className="universe-nav-active" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 30 }} />}
            </a>
          ))}
        </nav>
        {demo ? <span className="universe-profile"><Artwork images={[]} name={name} size={64} /><span>{name}</span></span> : (
          <SpotifyLink className="universe-profile" href={data.profile.external_urls?.spotify ?? `https://open.spotify.com/user/${encodeURIComponent(data.profile.id)}`}>
            <Artwork images={data.profile.images} name={name} size={64} />
            <span>{name}</span>
          </SpotifyLink>
        )}
      </header>
      {demo && <div className="demo-banner" role="note">
        <span><strong>Live demo</strong> · {demoData?.placeholder ? "sample data" : "a real listening snapshot, anonymized"}. Everything here is interactive.</span>
        <a href="/api/auth/login">Connect your Spotify ↗</a>
      </div>}
      <main>
        <DashboardHero data={data} range={range} analytics={analytics} />
        <motion.div className="listening-console" initial={reduced ? false : { clipPath: "inset(0 50% 0 50%)" }} animate={{ clipPath: "inset(0 0% 0 0%)" }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : 1.05 }}>
          <span className="console-label">Change your<br /><strong>listening lens</strong></span>
            <TimeRangeSelector value={range} onChange={(value) => { setRange(value); setExpanded(false); }} />
          <span className="console-count"><AnimatedNumber value={selected.tracks?.length ?? null} /> tracks in this window</span>
        </motion.div>
        <div className="dashboard-notices">
          {error && <div className="notice error-notice" role="alert">{error.message} {error.reconnect && <a href="/api/auth/login">Reconnect Spotify</a>}</div>}
          {data.warnings.length > 0 && <div className="notice" role="status"><strong>Part of your listening history is unavailable.</strong><details><summary>See details</summary>{data.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details><button className="text-link" disabled={loading} onClick={retry}>Try again</button></div>}
        </div>

        <section id="artists" className="universe-artists-section">
          <div className="universe-section-intro"><h2><RevealTitle>Your top artists.</RevealTitle></h2><span>TOP {Math.min(selected.artists?.length ?? 0, 5)} / {rangeLabels[range].toUpperCase()}</span></div>
          {selected.artists?.length ? <ArtistGallery artists={selected.artists} /> : <p className="empty-state">{selected.artists === null ? "Artists couldn’t be loaded. Try refreshing in a moment." : "No top artists yet for this window. Keep listening and check back."}</p>}
        </section>

        <section id="tracks" className="universe-tracks-section">
          <div className="universe-section-intro"><h2><RevealTitle>Heavy rotation.</RevealTitle></h2><span>TOP TRACKS / {rangeLabels[range].toUpperCase()}</span></div>
          {tracks?.length ? <>
            <div className="track-stage">
            <Reveal className="track-sleeve">
              <FeaturedSleeve><AnimatePresence mode="popLayout" initial={false}><motion.div key={tracks[0].id} className="sleeve-art" initial={reduced ? false : { x: 40, rotate: 5, opacity: 0 }} animate={{ x: 0, rotate: 0, opacity: 1 }} exit={{ x: -40, rotate: -5, opacity: 0 }} transition={reduced ? { duration: 0 } : musicSpring}><Artwork images={tracks[0].album.images} name={tracks[0].album.name} size={420} /></motion.div></AnimatePresence></FeaturedSleeve>
              <p>YOUR NO. 01 TRACK</p>
              <AnimatePresence mode="wait" initial={false}><motion.div key={tracks[0].id} className="sleeve-copy" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -14 }} transition={{ duration: .35, ease: musicEase }}>
                <h3>{tracks[0].name}</h3><span>{tracks[0].artists.map((artist) => artist.name).join(", ")}</span>
              </motion.div></AnimatePresence>
            </Reveal>
            <div className="tracks-table universe-track-list">
              <div className="track-row table-label"><span>#</span><span>TRACK / ARTIST</span><span className="album-cell">ALBUM</span><span>TIME</span><span /></div>
              <AnimatePresence initial={false} mode="popLayout">
                {tracks.map((track, i) => (
                  <motion.div key={track.id} className="track-motion" layout={!reduced}
                    initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }} exit={reduced ? undefined : { opacity: 0, y: -12 }}
                    transition={reduced ? { duration: 0 } : { layout: { type: "spring", stiffness: 250, damping: 31 }, opacity: { duration: .45, delay: Math.min(i, 8) * .045 }, y: { duration: .6, delay: Math.min(i, 8) * .045, ease: musicEase } }}>
                    <SpotifyLink className="track-row" href={track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`}>
                      <span className="track-rank">{String(i + 1).padStart(2, "0")}</span>
                      <div className="track-info"><Artwork images={track.album.images} name={track.name} size={120} /><div><h3>{track.name}</h3><p>{track.artists.map((artist) => artist.name).join(", ")}</p></div></div>
                      <span className="album-cell">{track.album.name}</span>
                      <span className="track-duration">{Math.floor(track.duration_ms / 60000)}:{String(Math.floor(track.duration_ms / 1000) % 60).padStart(2, "0")}</span>
                      <span aria-hidden="true">↗</span>
                    </SpotifyLink>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            </div>
            {(selected.tracks?.length ?? 0) > 8 && <button className="show-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show less ↑" : `Explore all ${selected.tracks!.length} tracks ↓`}</button>}
          </> : <p className="empty-state">{selected.tracks === null ? "Tracks couldn’t be loaded. Try refreshing in a moment." : "No top tracks yet for this window. Your next favorite is out there."}</p>}
        </section>

        <div className="universe-evolution"><TasteInsights analytics={analytics} windows={data.windows} range={range} /></div>
        {demo ? (
          <footer className="universe-footer"><Brand /><span>Listening data from Spotify</span><span>Snapshot from {new Date(data.updatedAt).toLocaleDateString([], { month: "long", year: "numeric" })}</span><a href="/privacy">Privacy</a><a href="/api/auth/login">Connect your Spotify ↗</a></footer>
        ) : (
          <footer className="universe-footer"><Brand /><span>Listening data from Spotify</span><span>Refreshed {new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span><a href="/privacy">Privacy</a><button disabled={loading} onClick={retry}>{loading ? "Refreshing…" : "Refresh data ↻"}</button><form action="/api/auth/logout" method="post"><button>Disconnect ↗</button></form></footer>
        )}
      </main>
    </div></MotionConfig>
  );
}
