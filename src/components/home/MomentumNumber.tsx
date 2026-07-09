'use client';

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { useEffect, useRef } from 'react';
import { selectTodayLogs, useAppStore } from '@/store/useAppStore';

export default function MomentumNumber({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const raw = useMotionValue(reduced ? value : 0);
  const spring = useSpring(raw, { stiffness: 48, damping: 18 });
  const display = useTransform(spring, (v) => String(Math.round(v)));
  const scale = useMotionValue(1);
  const scaleSpring = useSpring(scale, { stiffness: 300, damping: 14 });

  const todayCount = useAppStore((s) => selectTodayLogs(s).length);
  const prevCount = useRef(todayCount);

  useEffect(() => {
    raw.set(value);
  }, [value, raw]);

  // A small physical tick each time a log lands.
  useEffect(() => {
    if (todayCount > prevCount.current && !reduced) {
      scale.set(1.045);
      const t = setTimeout(() => scale.set(1), 120);
      prevCount.current = todayCount;
      return () => clearTimeout(t);
    }
    prevCount.current = todayCount;
  }, [todayCount, reduced, scale]);

  const shimmer = value >= 85 && !reduced;

  return (
    <div className="relative flex flex-col items-center">
      <motion.span
        aria-label={`Momentum ${Math.round(value)}`}
        className={`font-display text-[9rem] leading-[0.95] tracking-tight tabular-nums ${
          shimmer ? 'momentum-shimmer' : ''
        }`}
        style={{
          scale: reduced ? 1 : scaleSpring,
          ...(shimmer ? {} : { color: 'oklch(0.92 0.055 var(--momentum-hue))' }),
          fontVariationSettings: '"opsz" 144',
        }}
      >
        {reduced ? String(Math.round(value)) : display}
      </motion.span>
      <span className="mt-1 text-xs uppercase tracking-[0.3em] text-ink-faint">momentum</span>
    </div>
  );
}
