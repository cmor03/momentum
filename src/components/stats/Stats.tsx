'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import LineChart, { type ChartPoint } from './LineChart';
import { addDays } from '@/lib/dates';
import type { Bucket, Log } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

const WINDOW = 90;

export default function Stats() {
  const snapshots = useAppStore((s) => s.snapshots);
  const logs = useAppStore((s) => s.logs);
  const buckets = useAppStore((s) => s.buckets).filter((b) => !b.archived);
  const today = useAppStore((s) => s.today);

  const momentumSeries: ChartPoint[] = useMemo(
    () => snapshots.slice(-WINDOW).map((s) => ({ date: s.date, value: s.momentum })),
    [snapshots],
  );

  const fillSeries = useMemo(
    () => new Map(buckets.map((b) => [b.id, trailingFills(b, logs, today)])),
    [buckets, logs, today],
  );

  const totalLogs = logs.length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-10 px-5 pb-16 pt-[max(3rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Stats</h1>
        <Link href="/" className="py-2 text-sm text-ink-faint transition-colors hover:text-ink-dim">
          Home
        </Link>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.25em] text-ink-faint">
          Momentum · last 90 days
        </h2>
        <LineChart
          points={momentumSeries}
          color="oklch(0.7 0.09 var(--momentum-hue))"
          height={130}
          label="Momentum over the last 90 days"
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-ink-faint">
          Weekly fill · last 90 days
        </h2>
        {buckets.map((b) => (
          <div key={b.id} className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-dim">{b.name}</span>
            <LineChart
              points={fillSeries.get(b.id) ?? []}
              color={b.color}
              height={56}
              label={`${b.name} trailing seven-day fill`}
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-ink-faint">Logs · last 100 days</h2>
        <p className="font-display text-5xl">{totalLogs}</p>
      </section>
    </main>
  );
}

/** Trailing 7-day fill percentage for each of the last 90 days. */
function trailingFills(bucket: Bucket, logs: Log[], today: string): ChartPoint[] {
  if (!today) return [];
  const counts = new Map<string, number>();
  for (const l of logs) {
    if (l.bucketId !== bucket.id) continue;
    counts.set(l.loggedOn, (counts.get(l.loggedOn) ?? 0) + 1);
  }
  const out: ChartPoint[] = [];
  let day = addDays(today, -(WINDOW - 1));
  let window = 0;
  // prime the window with the 6 days before the chart starts
  for (let i = 6; i >= 1; i--) window += counts.get(addDays(day, -i)) ?? 0;
  for (let i = 0; i < WINDOW; i++) {
    window += counts.get(day) ?? 0;
    if (i > 0) window -= counts.get(addDays(day, -7)) ?? 0;
    out.push({ date: day, value: Math.min(window / bucket.weeklyTarget, 1) * 100 });
    day = addDays(day, 1);
  }
  return out;
}
