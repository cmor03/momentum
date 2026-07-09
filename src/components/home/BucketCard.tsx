'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { DAILY_CAP } from '@/lib/momentum';
import type { Bucket } from '@/lib/types';
import { selectBucketFill, useAppStore } from '@/store/useAppStore';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/**
 * The core loop lives here: tap the card, feel the log land. Spring press,
 * a ripple in the bucket's color, and the trailing-7-day bar pumping up.
 */
export default function BucketCard({ bucket }: { bucket: Bucket }) {
  const reduced = useReducedMotion();
  const fill = useAppStore((s) => selectBucketFill(s, bucket.id));
  const logs = useAppStore((s) => s.logs);
  const today = useAppStore((s) => s.today);
  const logBucket = useAppStore((s) => s.logBucket);
  const shimmer = useAppStore((s) => s.justCompletedDay);
  const todayLogs = logs.filter((l) => l.loggedOn === today);

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);
  const cardRef = useRef<HTMLButtonElement>(null);

  const todayCount = todayLogs.filter((l) => l.bucketId === bucket.id).length;
  const dayFull = todayLogs.length >= DAILY_CAP;

  function handleTap(e: React.PointerEvent<HTMLButtonElement>) {
    if (dayFull) return; // the day is complete — the card rests
    void logBucket(bucket.id);
    if (reduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const ripple = { id: rippleId.current++, x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples((r) => [...r, ripple]);
    setTimeout(() => setRipples((r) => r.filter((x) => x.id !== ripple.id)), 700);
  }

  return (
    <motion.button
      ref={cardRef}
      onPointerUp={handleTap}
      whileTap={reduced || dayFull ? undefined : { scale: 0.965 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className="relative overflow-hidden rounded-2xl bg-surface px-5 py-4 text-left"
      aria-label={`Log ${bucket.name}`}
    >
      {/* ripple burst */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: r.x,
              top: r.y,
              width: 12,
              height: 12,
              marginLeft: -6,
              marginTop: -6,
              background: bucket.color,
            }}
            initial={{ scale: 0, opacity: 0.45 }}
            animate={{ scale: 24, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      <div className="flex items-baseline justify-between">
        <span className="font-medium">{bucket.name}</span>
        {todayCount > 0 && (
          <motion.span
            key={todayCount}
            initial={reduced ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            className="text-sm font-medium"
            style={{ color: bucket.color }}
          >
            {todayCount > 1 ? `today ×${todayCount}` : 'today'}
          </motion.span>
        )}
      </div>

      {/* trailing 7-day fill bar */}
      <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
        <motion.div
          className="relative h-full rounded-full"
          style={{ background: bucket.color }}
          initial={false}
          animate={{ width: `${Math.max(fill * 100, fill > 0 ? 4 : 0)}%` }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: 'spring', stiffness: 170, damping: 17, mass: 0.8 }
          }
        >
          {/* shimmer sweep during the day-done moment */}
          {shimmer && !reduced && (
            <motion.div
              className="absolute inset-y-0 w-10"
              style={{
                background:
                  'linear-gradient(90deg, transparent, oklch(1 0 0 / 0.55), transparent)',
              }}
              initial={{ left: '-20%' }}
              animate={{ left: '110%' }}
              transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.35 }}
            />
          )}
        </motion.div>
      </div>
    </motion.button>
  );
}
