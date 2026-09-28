"use client";

import { useRef, useState, type PointerEvent } from "react";
import { motion, MotionConfig, useMotionValue, useScroll, useSpring, useTransform, type Variants } from "motion/react";
import { musicEase, revealGroup, revealItem, revealViewport, useHydratedReducedMotion } from "./music-motion";
import { Brand } from "./ui";
import { MusicStackSpread } from "./music-stack-spread";
import Image from "next/image";
import Link from "next/link";
import { demoArtwork, landingArtwork, type DemoArtworkId } from "@/lib/demo-artwork";

function CoverArt({ id, className = "", variants, custom }: { id: DemoArtworkId; className?: string; variants?: Variants; custom?: number }) {
  const art = demoArtwork[id];
  return <motion.span className={`demo-art ${className}`} variants={variants} custom={custom}><Image src={art.src} alt={art.alt} fill sizes="(max-width: 650px) 45vw, 24vw" data-cover-id={id} /></motion.span>;
}

/** Sleeves land one after another; each resting angle lives in CSS `rotate`, so motion only adds the swing. */
const coverDrop: Variants = {
  hidden: (i: number) => ({ opacity: 0, y: 110, scale: .82, rotate: i % 2 ? 10 : -10 }),
  shown: (i: number) => ({ opacity: 1, y: 0, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 90, damping: 17, delay: .1 + i * .14 } }),
};
const coverSlide: Variants = {
  hidden: { opacity: 0, x: 90, rotate: 8 },
  shown: (i: number) => ({ opacity: 1, x: 0, rotate: 0, transition: { type: "spring", stiffness: 110, damping: 19, delay: .25 + i * .16 } }),
};
const lineRise: Variants = { hidden: { y: "110%" }, shown: { y: 0, transition: { duration: 1, ease: musicEase } } };

const demo = [
  { title: "The Great Escape", genre: "Larry June & The Alchemist", x: 25, y: 24, art: "art-one" },
  { title: "The Diary of Alicia Keys", genre: "Alicia Keys", x: 75, y: 20, art: "art-two" },
  { title: "ye", genre: "Kanye West", x: 19, y: 70, art: "art-three" },
  { title: "Graduation", genre: "Kanye West", x: 78, y: 72, art: "art-four" },
] as const;

export function LandingExperience({ errorText }: { errorText: string | null }) {
  const reduced = useHydratedReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const easedX = useSpring(pointerX, { stiffness: 75, damping: 22 });
  const easedY = useSpring(pointerY, { stiffness: 75, damping: 22 });
  const [active, setActive] = useState<number | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const graphScale = useTransform(scrollYProgress, [0, .25, .85, 1], [1, 1, .4, .35]);
  const graphOpacity = useTransform(scrollYProgress, [0, .5, 1], [1, .8, 0]);
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const transitionScale = useTransform(scrollYProgress, [0.35, 1], [0.8, 1.1]);
  const structureRef = useRef<HTMLElement>(null);
  const finaleRef = useRef<HTMLElement>(null);
  const { scrollYProgress: structureProgress } = useScroll({ target: structureRef, offset: ["start end", "end start"] });
  const { scrollYProgress: finaleProgress } = useScroll({ target: finaleRef, offset: ["start end", "end end"] });
  const clusterY = useTransform(structureProgress, [0, 1], [70, -70]);
  const finaleY = useTransform(finaleProgress, [0, 1], [90, 0]);
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduced || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left - bounds.width / 2) * 0.018);
    pointerY.set((event.clientY - bounds.top - bounds.height / 2) * 0.018);
  };
  return (
    <MotionConfig reducedMotion="user"><div className="cinema-landing">
      <header className="cinema-nav">
        <Brand />
        <span>YOUR LISTENING, MAPPED.</span>
        <Link href="/demo">Try the live demo <span aria-hidden="true">↗</span></Link>
      </header>
      <main>
        <section className="cinema-hero" ref={heroRef} onPointerMove={onPointerMove} onPointerLeave={() => { pointerX.set(0); pointerY.set(0); setActive(null); }}>
          <div className="cinema-wash" aria-hidden="true" />
          <motion.div
            className="cinema-graph"
            style={reduced ? undefined : { x: easedX, y: easedY, scale: graphScale, opacity: graphOpacity }}
            aria-label="Interactive sample TasteGraph with four album artworks supplied by the user"
          >
            <svg className="cinema-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {demo.map((item, i) => (
                <motion.line key={item.title} x1="50" y1="49" x2={item.x} y2={item.y}
                  initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: active === null || active === i ? 0.8 : 0.14 }}
                  transition={{ duration: reduced ? 0 : 0.85, delay: reduced ? 0 : 0.48 + i * 0.12 }} />
              ))}
              <circle cx="50" cy="49" r="27" />
            </svg>
            <motion.div className="cinema-core" initial={reduced ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 95, damping: 17, delay: reduced ? 0 : 0.28 }}>
              <span className="cinema-core-rings" aria-hidden="true" /><span>TG</span>
            </motion.div>
            {demo.map((item, i) => (
              <motion.button type="button" key={item.title}
                className={`cinema-node cinema-node-${i + 1} ${active !== null && active !== i ? "is-muted" : ""}`}
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                initial={reduced ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                whileHover={reduced ? undefined : { scale: 1.12, rotate: i % 2 ? 4 : -4 }}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                transition={{ type: "spring", stiffness: 170, damping: 21, delay: reduced ? 0 : 0.75 + i * 0.12 }}
                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                aria-label={`Sample artwork: ${item.title}, ${item.genre}`}>
                <CoverArt id={landingArtwork.hero[i]} />
                <span className="cinema-node-caption"><strong>{item.title}</strong><small>{item.genre}</small></span>
              </motion.button>
            ))}
          </motion.div>
          <motion.div className="cinema-headline" style={reduced ? undefined : { y: headlineY }}>
            <motion.div initial={reduced ? false : { opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}>
              <p className="cinema-kicker">TASTEGRAPH / A NEW WAY TO SEE YOUR SOUND</p>
              <h1><span className="hero-line"><motion.span initial={reduced ? false : { y: "110%" }} animate={{ y: 0 }} transition={{ duration: .95, delay: .1, ease: [0.16, 1, 0.3, 1] }}>YOUR MUSIC</motion.span></span><span className="hero-line"><motion.span initial={reduced ? false : { y: "110%" }} animate={{ y: 0 }} transition={{ duration: .95, delay: .28, ease: [0.16, 1, 0.3, 1] }}>HAS A <em>SHAPE.</em></motion.span></span></h1>
              <p className="cinema-deck">The artists. The eras. The connections in between. Your listening becomes a world you can explore.</p>
              {errorText && <p className="cinema-error" role="alert">{errorText}</p>}
              <div className="cta-row">
                <motion.span className="cta-motion" whileHover={reduced ? undefined : { x: 4 }} whileTap={reduced ? undefined : { scale: 0.98 }}>
                  <Link className="cinema-cta" href="/demo">Explore the live demo <span aria-hidden="true">→</span></Link>
                </motion.span>
                <a className="cinema-cta ghost" href="/api/auth/login">Connect Spotify <span aria-hidden="true">↗</span></a>
              </div>
            </motion.div>
          </motion.div>
          <span className="demo-disclosure">Example graph. Connect to explore your own Spotify data.</span>
        </section>

        <MusicStackSpread />

        <section className="cinema-transition" aria-label="What TasteGraph reveals">
          <motion.div className="transition-art transition-signal" style={reduced ? undefined : { scale: transitionScale }} aria-hidden="true" />
          <motion.div initial={reduced ? false : "hidden"} whileInView="shown" viewport={revealViewport} variants={revealGroup}>
            <motion.p variants={revealItem}>THE SIGNAL INSIDE THE SOUND</motion.p>
            <h2><span className="reveal-line"><motion.span variants={lineRise}>Not just what you play.</motion.span></span><span className="reveal-line"><motion.span variants={lineRise}><em>What stays with you.</em></motion.span></span></h2>
          </motion.div>
        </section>

        <section className="cinema-story story-structure" ref={structureRef}>
          <div className="story-index">The map</div>
          <motion.div className="story-art-cluster" style={reduced ? undefined : { y: clusterY }} initial={reduced ? false : "hidden"} whileInView="shown" viewport={{ once: true, amount: .3 }}>
            {landingArtwork.structure.map((id, i) => <CoverArt key={id} id={id} variants={coverDrop} custom={i} />)}
          </motion.div>
          <motion.div className="story-copy" initial={reduced ? false : "hidden"} whileInView="shown" viewport={revealViewport} variants={revealGroup}>
            <h2><span className="reveal-line"><motion.span variants={lineRise}>Artists become</motion.span></span><span className="reveal-line"><motion.span variants={lineRise}>a universe.</motion.span></span></h2>
            <motion.p variants={revealItem}>Your favorites form a constellation. Explore who sits at the center and where Spotify&apos;s genre tags connect the dots.</motion.p>
          </motion.div>
        </section>

        <section className="cinema-story story-time">
          <div className="story-index">The movement</div>
          <motion.div className="time-composition" aria-hidden="true" initial={reduced ? false : "hidden"} whileInView="shown" viewport={{ once: true, amount: .3 }} variants={revealGroup}>
            <motion.span variants={revealItem}>4 WEEKS</motion.span><i /><motion.span variants={revealItem}>6 MONTHS</motion.span><i /><motion.span variants={revealItem}>1 YEAR</motion.span>
            {landingArtwork.time.map((id, i) => <CoverArt key={id} id={id} className="time-art" variants={coverSlide} custom={i} />)}
          </motion.div>
          <motion.div className="story-copy" initial={reduced ? false : "hidden"} whileInView="shown" viewport={revealViewport} variants={revealGroup}>
            <h2><span className="reveal-line"><motion.span variants={lineRise}>Time changes</motion.span></span><span className="reveal-line"><motion.span variants={lineRise}>the picture.</motion.span></span></h2>
            <motion.p variants={revealItem}>Switch your listening window. Watch artists move, favorites hold their place, and your Taste Drift take a new shape.</motion.p>
          </motion.div>
        </section>

        <section className="cinema-finale" ref={finaleRef}>
          <div className="finale-orbit" aria-hidden="true" />
          <motion.p initial={reduced ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={revealViewport} transition={{ duration: .7, ease: musicEase }}>YOUR STORY IS ALREADY THERE</motion.p>
          <motion.h2 initial={reduced ? false : "hidden"} whileInView="shown" viewport={revealViewport} variants={revealGroup}><span className="reveal-line"><motion.span variants={lineRise}>Make it</motion.span></span><span className="reveal-line"><motion.span variants={lineRise}><em>yours.</em></motion.span></span></motion.h2>
          <motion.div className="finale-artwork" aria-label="Album artwork collection" style={reduced ? undefined : { y: finaleY }} initial={reduced ? false : "hidden"} whileInView="shown" viewport={{ once: true, amount: .3 }}>
            {landingArtwork.finale.map((id, i) => <CoverArt key={id} id={id} variants={coverDrop} custom={i} />)}
          </motion.div>
          <div className="cta-row">
            <Link className="cinema-cta" href="/demo">Explore the live demo <span aria-hidden="true">→</span></Link>
            <a className="cinema-cta ghost" href="/api/auth/login">Connect Spotify <span aria-hidden="true">↗</span></a>
          </div>
          <small>No account needed for the demo. Spotify sign-in is read-only and limited to invited listeners while the app is in Spotify&apos;s development mode. <Link href="/privacy">Privacy</Link></small>
        </section>
      </main>
      <footer className="cinema-footer"><Brand /><span>Made for your listening history, not your inbox.</span><a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer">Powered by Spotify ↗</a></footer>
    </div></MotionConfig>
  );
}
