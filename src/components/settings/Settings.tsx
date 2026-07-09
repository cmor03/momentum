'use client';

import Link from 'next/link';
import BucketEditor from './BucketEditor';
import { detectTimezone } from '@/lib/dates';
import { useAppStore } from '@/store/useAppStore';

export default function Settings() {
  const buckets = useAppStore((s) => s.buckets).filter((b) => !b.archived);
  const profile = useAppStore((s) => s.profile);
  const setTimezone = useAppStore((s) => s.setTimezone);
  const signOut = useAppStore((s) => s.signOut);

  const deviceTz = detectTimezone();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-10 px-5 pb-16 pt-[max(3rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Settings</h1>
        <Link href="/" className="py-2 text-sm text-ink-faint transition-colors hover:text-ink-dim">
          Home
        </Link>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-ink-faint">Buckets</h2>
        {buckets.map((bucket) => (
          <BucketEditor key={bucket.id} bucket={bucket} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.25em] text-ink-faint">Timezone</h2>
        <p className="text-ink-dim">{profile?.timezone ?? 'UTC'}</p>
        {profile && profile.timezone !== deviceTz && (
          <button
            onClick={() => void setTimezone(deviceTz)}
            className="self-start rounded-xl bg-surface-raised px-4 py-2 text-sm"
          >
            Use device timezone ({deviceTz})
          </button>
        )}
      </section>

      <section className="mt-auto pt-6">
        <button
          onClick={() => void signOut()}
          className="text-sm text-ink-faint transition-colors hover:text-ink-dim"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
