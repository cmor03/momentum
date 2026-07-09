'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { DEFAULT_BUCKETS } from '@/lib/seed';
import { useAppStore } from '@/store/useAppStore';

/**
 * The one orchestrated moment: the third slot fills, the app takes a breath,
 * says "Day's done." — and then goes quiet. Never demands more.
 */

// Deterministic particle fan — no randomness, so it feels composed.
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + 0.4;
  const distance = 90 + (i % 3) * 38;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 30,
    color: DEFAULT_BUCKETS[i % DEFAULT_BUCKETS.length].color,
    delay: (i % 5) * 0.04,
  };
});

export default function DayDoneCelebration() {
  const reduced = useReducedMotion();
  const active = useAppStore((s) => s.justCompletedDay);
  const clear = useAppStore((s) => s.clearCelebration);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(clear, 2400);
    return () => clearTimeout(t);
  }, [active, clear]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'oklch(0.155 0.018 275 / 0.72)', backdropFilter: 'blur(3px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          {!reduced &&
            PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-full"
                style={{ background: p.color }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 0.9 }}
                animate={{ x: p.x, y: p.y, scale: 0.2, opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: p.delay }}
              />
            ))}
          <motion.p
            className="font-display text-3xl"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
          >
            Day&apos;s done.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
