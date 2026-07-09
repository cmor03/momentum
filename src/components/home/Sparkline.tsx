'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useAppStore } from '@/store/useAppStore';

/** The last 30 days of momentum, drawn quiet and small under the number. */
export default function Sparkline() {
  const reduced = useReducedMotion();
  const snapshots = useAppStore((s) => s.snapshots);
  const recent = snapshots.slice(-30);

  if (recent.length < 2) {
    return <div className="mt-6 h-10" aria-hidden />;
  }

  const W = 100;
  const H = 32;
  const pad = 2;
  const points = recent.map((s, i) => {
    const x = (i / (recent.length - 1)) * W;
    const y = pad + (1 - s.momentum / 100) * (H - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const d = `M ${points.join(' L ')}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="mt-6 h-10 w-48"
      role="img"
      aria-label="Momentum over the last 30 days"
    >
      <motion.path
        d={d}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ stroke: 'oklch(0.7 0.07 var(--momentum-hue))' }}
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
    </svg>
  );
}
