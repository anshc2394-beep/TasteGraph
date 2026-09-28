"use client";

// Adapted from Hyperiux Stack Spread (https://vault.hyperiux.com).
// Scroll holds the stack, distributes the sleeves, then releases the sticky stage.
import { useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useMotionValue, useSpring, type MotionValue } from "motion/react";
import { useHydratedReducedMotion } from "../music-motion";
import styles from "./stack-spread.module.css";

export interface StackSpreadCard {
  id: string;
  src: string;
  alt: string;
  x: number;
  y: number;
  rotation: number;
  mobile: { x: number; y: number };
}

function Sleeve({ card, index, progress, pointer }: {
  card: StackSpreadCard;
  index: number;
  progress: MotionValue<number>;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
}) {
  const stagger = index * .009;
  const spread = useTransform(progress, [0, .14, .25 + stagger, .72 + stagger, 1], [0, 0, 0, 1, 1]);
  const arrival = useTransform(progress, [0, .14], [1, 0]);
  const rotate = useTransform(spread, [0, 1], [card.rotation, index % 2 ? 2 : -2]);
  const scale = useTransform(spread, [0, 1], [1, .8 + (index % 3) * .04]);
  const transform = useTransform([spread, arrival, pointer.x, pointer.y], ([p, a, px, py]: number[]) => {
    const stackX = (index - 3.5) * .38;
    const stackY = (index % 3 - 1) * .7;
    const depth = .4 + index * .08;
    return `translate3d(calc(-50% + ${stackX * (1-p) + px * p * depth}vw + var(--end-x) * ${p + a * .3}), calc(-50% + ${stackY * (1-p) + py * p * depth}svh + var(--end-y) * ${p + a * .25}), 0)`;
  });
  const variables = { "--end-x": `${card.x}vw`, "--end-y": `${card.y}svh`, "--mobile-x": `${card.mobile.x}vw`, "--mobile-y": `${card.mobile.y}svh`, zIndex: index + 2 } as CSSProperties;
  return <motion.div className={styles.sleeve} data-stack-art={card.id} style={{ ...variables, transform }}>
    <motion.div className={styles.face} style={{ rotate, scale }}>
      <Image src={card.src} alt={card.alt} fill sizes="(max-width: 650px) 25vw, (max-width: 1000px) 18vw, 230px" draggable={false} />
    </motion.div>
  </motion.div>;
}

export default function StackSpread({ cards, children }: { cards: StackSpreadCard[]; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useHydratedReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 90, damping: 25 });
  const y = useSpring(rawY, { stiffness: 90, damping: 25 });
  // Keep copy and sleeve transforms on the same measured progress timeline.
  const opacity = useTransform(scrollYProgress, (p) => Math.max(0, Math.min(1, (p - .42) / .24)));
  const copyY = useTransform(scrollYProgress, [.42, .7], [18, 0]);
  return <section ref={ref} className={styles.sequence} data-stack-spread aria-label="See what you sound like">
    <div className={styles.stage} onPointerMove={(event) => {
      if (reduced || event.pointerType !== "mouse" || scrollYProgress.get() < .8 || !window.matchMedia("(min-width: 1001px) and (hover: hover)").matches) return;
      const box = event.currentTarget.getBoundingClientRect();
      rawX.set((event.clientX / box.width - .5) * 1.8);
      rawY.set(((event.clientY - box.top) / box.height - .5) * 1.4);
    }} onPointerLeave={() => { rawX.set(0); rawY.set(0); }}>
      <motion.div className={styles.copy} style={reduced ? undefined : { opacity, y: copyY }}>{children}</motion.div>
      <div className={styles.artwork}>
        {cards.map((card, index) => <Sleeve key={card.id} card={card} index={index} progress={scrollYProgress} pointer={{ x, y }} />)}
      </div>
    </div>
  </section>;
}
