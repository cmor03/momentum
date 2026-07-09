'use client';

import { useEffect, useRef } from 'react';
import AuthGate from './AuthGate';
import { createClient } from '@/lib/supabase/client';
import { selectMomentum, useAppStore } from '@/store/useAppStore';

/**
 * The momentum hue. 100 → warm gold (85), 25 → deep indigo (230), and below
 * 25 the ramp keeps cooling past indigo through violet into a soft ember red
 * at 0 (380 ≡ 20). Piecewise-continuous, so the color always glides.
 */
export const hueFor = (value: number) =>
  value >= 25 ? 230 - ((value - 25) / 75) * 145 : 230 + ((25 - value) / 25) * 150;

export default function Providers({ children }: { children: React.ReactNode }) {
  const booted = useRef(false);
  const momentum = useAppStore(selectMomentum);

  // The momentum hue is global — every screen's accents follow it.
  useEffect(() => {
    document.documentElement.style.setProperty('--momentum-hue', String(hueFor(momentum)));
  }, [momentum]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const store = useAppStore.getState();
    void store.boot();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && useAppStore.getState().status === 'signedOut') {
        void useAppStore.getState().boot();
      }
    });

    const onOnline = () => void import('@/lib/sync').then((m) => m.syncNow());
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void useAppStore.getState().runRollover();
        void import('@/lib/sync').then((m) => m.syncNow());
      }
    };
    // Catches midnight rollover while the app is open.
    const tick = setInterval(() => void useAppStore.getState().runRollover(), 60_000);

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(tick);
    };
  }, []);

  return <AuthGate>{children}</AuthGate>;
}
