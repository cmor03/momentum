'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAppStore } from '@/store/useAppStore';
import type { Log } from '@/lib/types';

const SLOT_COPY = [
  'Nothing logged yet today. Three slots open.',
  'Two slots open.',
  'One slot open.',
  "Day's done.",
] as const;

/**
 * The three daily slots. A filled slot is the log itself — tap it to undo.
 */
export default function TodaySlots() {
  const reduced = useReducedMotion();
  const logs = useAppStore((s) => s.logs);
  const today = useAppStore((s) => s.today);
  const buckets = useAppStore((s) => s.buckets);
  const undoLog = useAppStore((s) => s.undoLog);
  const todayLogs = logs.filter((l) => l.loggedOn === today);

  const bySlot = new Map<number, Log>(todayLogs.map((l) => [l.slot, l]));
  const colorOf = (log: Log) => buckets.find((b) => b.id === log.bucketId)?.color ?? 'white';

  return (
    <section className="mt-10 flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((slot) => {
          const log = bySlot.get(slot);
          return (
            <div key={slot} className="relative h-5 w-5">
              <div className="absolute inset-0 rounded-full border border-line" />
              <AnimatePresence>
                {log && (
                  <motion.button
                    aria-label="Undo this log"
                    onClick={() => void undoLog(log.id)}
                    className="absolute -inset-2 flex items-center justify-center"
                    initial={reduced ? { opacity: 0 } : { scale: 0.2, opacity: 0 }}
                    animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { scale: 0.2, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  >
                    <span
                      className="h-5 w-5 rounded-full"
                      style={{
                        background: colorOf(log),
                        boxShadow: `0 0 14px 0 ${colorOf(log)}`,
                      }}
                    />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-ink-dim" aria-live="polite">
        {SLOT_COPY[Math.min(todayLogs.length, 3)]}
      </p>
    </section>
  );
}
