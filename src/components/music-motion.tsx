"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from "motion/react";

export const musicSpring = { type: "spring", stiffness: 150, damping: 24, mass: 0.8 } as const;
export const musicEase = [0.22, 1, 0.36, 1] as const;

/** Shared scroll-reveal choreography: children rise into place one after another. */
export const revealGroup: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.07 } } };
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.75, ease: musicEase } },
};
export const revealViewport = { once: true, amount: 0.25 } as const;

const subscribeHydration = () => () => {};
/** False during the server render and hydration pass, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(subscribeHydration, () => true, () => false);
}
/** Keep the server and first client render identical before reading preferences. */
export function useHydratedReducedMotion() {
  const reduced = useReducedMotion();
  return useHydrated() && reduced;
}

/** Animate the scalar itself once it is seen; keep its final meaning available to assistive tech. */
export function AnimatedNumber({ value, delay = 0 }: { value: number | null; delay?: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const raw = useMotionValue(0);
  const started = useRef(false);
  const rounded = useTransform(raw, (number) => String(Math.round(number)));
  useEffect(() => {
    if (reduced) { raw.set(value ?? 0); return; }
    if (!inView) return;
    const controls = animate(raw, value ?? 0, { ...musicSpring, delay: started.current ? 0 : delay });
    started.current = true;
    return () => controls.stop();
  }, [raw, reduced, value, delay, inView]);
  return <span ref={ref}><span className="sr-only">{value === null ? "Unavailable" : String(value)}</span>{value === null ? <span aria-hidden="true">-</span> : reduced ? <span aria-hidden="true">{value}</span> : <motion.span aria-hidden="true">{rounded}</motion.span>}</span>;
}

/**
 * The mask is observed rather than the moving line: the line starts clipped by the
 * mask, so observing it directly would never report an intersection.
 */
export function RevealTitle({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className="title-mask"><span>{children}</span></span>;
  return <motion.span className="title-mask" initial="hidden" whileInView="shown" viewport={{ once: true, amount: .5 }}>
    <motion.span variants={{ hidden: { y: "108%" }, shown: { y: 0 } }} transition={{ duration: .9, ease: musicEase }}>{children}</motion.span>
  </motion.span>;
}

/** A block that rises into view once. Renders statically under reduced motion. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return <motion.div className={className} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={revealViewport} transition={{ duration: .8, delay, ease: musicEase }}>{children}</motion.div>;
}
