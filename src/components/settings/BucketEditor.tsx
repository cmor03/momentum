'use client';

import { useState } from 'react';
import { BUCKET_COLORS } from '@/lib/seed';
import type { Bucket } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

export default function BucketEditor({ bucket }: { bucket: Bucket }) {
  const saveBucket = useAppStore((s) => s.saveBucket);
  const [name, setName] = useState(bucket.name);

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === bucket.name) {
      setName(bucket.name);
      return;
    }
    void saveBucket({ ...bucket, name: trimmed });
  }

  function setTarget(delta: number) {
    const next = Math.min(21, Math.max(1, bucket.weeklyTarget + delta));
    if (next !== bucket.weeklyTarget) void saveBucket({ ...bucket, weeklyTarget: next });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          aria-label="Bucket name"
          className="w-full bg-transparent font-medium outline-none"
        />
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setTarget(-1)}
            aria-label="Lower weekly target"
            className="h-8 w-8 rounded-lg bg-surface-raised text-ink-dim"
          >
            −
          </button>
          <span className="w-10 text-center text-ink-dim">{bucket.weeklyTarget}/wk</span>
          <button
            onClick={() => setTarget(1)}
            aria-label="Raise weekly target"
            className="h-8 w-8 rounded-lg bg-surface-raised text-ink-dim"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        {BUCKET_COLORS.map((color) => (
          <button
            key={color}
            aria-label={`Set color`}
            onClick={() => void saveBucket({ ...bucket, color })}
            className="h-6 w-6 rounded-full transition-transform"
            style={{
              background: color,
              transform: bucket.color === color ? 'scale(1.15)' : undefined,
              outline: bucket.color === color ? '2px solid var(--color-ink)' : 'none',
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
