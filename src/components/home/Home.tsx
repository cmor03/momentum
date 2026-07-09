'use client';

import Link from 'next/link';
import AmbientGradient from './AmbientGradient';
import BucketCard from './BucketCard';
import DayDoneCelebration from './DayDoneCelebration';
import MomentumNumber from './MomentumNumber';
import Sparkline from './Sparkline';
import TodaySlots from './TodaySlots';
import { selectMomentum, useAppStore } from '@/store/useAppStore';

export default function Home() {
  const momentum = useAppStore(selectMomentum);
  const buckets = useAppStore((s) => s.buckets).filter((b) => !b.archived);

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-x-clip px-5 pb-10 pt-[max(3.5rem,env(safe-area-inset-top))]">
      <section className="relative flex flex-col items-center">
        <AmbientGradient />
        <MomentumNumber value={momentum} />
        <Sparkline />
      </section>

      <TodaySlots />

      <section className="mt-8 flex flex-col gap-3">
        {buckets.map((bucket) => (
          <BucketCard key={bucket.id} bucket={bucket} />
        ))}
      </section>

      <nav className="mt-auto flex items-center justify-center gap-8 pt-12 text-sm text-ink-faint">
        <Link href="/stats" className="py-2 transition-colors hover:text-ink-dim">
          Stats
        </Link>
        <Link href="/settings" className="py-2 transition-colors hover:text-ink-dim">
          Settings
        </Link>
      </nav>

      <DayDoneCelebration />
    </main>
  );
}
