"use client";

import { motion, useReducedMotion } from "motion/react";
import { rangeLabels, ranges, type TimeRange } from "@/lib/spotify/types";

/** The shared underline borrows the interaction idea from 21st.dev's Animated Chip Tab. */
export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="range-row">
      <div
        className="range-switch"
        role="group"
        aria-label="Listening time range"
      >
        {ranges.map((range) => (
          <motion.button
            key={range}
            type="button"
            aria-pressed={value === range}
            className={value === range ? "selected" : ""}
            onClick={() => onChange(range)}
            whileTap={reduced ? undefined : { scale: 0.97 }}
          >
            <span>{rangeLabels[range]}</span>
            {value === range && (
              <motion.span
                className="range-indicator"
                layoutId="tastegraph-range-indicator"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 35 }
                }
              />
            )}
          </motion.button>
        ))}
      </div>
      <span className="range-caption" aria-live="polite">
        Your last {rangeLabels[value]} of listening
      </span>
    </div>
  );
}
