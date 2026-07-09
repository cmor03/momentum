'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Phase = 'idle' | 'sending' | 'sent' | 'error';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email || phase === 'sending') return;
    setPhase('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPhase(error ? 'error' : 'sent');
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <header className="text-center">
        <h1 className="font-display text-5xl tracking-tight">Momentum</h1>
        <p className="mt-3 text-ink-dim">A quiet score for showing up.</p>
      </header>

      {phase === 'sent' ? (
        <p className="text-center text-ink-dim">
          Link sent. Open it on this device to sign in.
        </p>
      ) : (
        <form onSubmit={sendLink} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-line bg-surface px-4 py-3 text-ink outline-none placeholder:text-ink-faint focus:border-ink-dim"
          />
          <button
            type="submit"
            disabled={phase === 'sending'}
            className="rounded-xl bg-surface-raised px-4 py-3 font-medium text-ink transition-opacity disabled:opacity-60"
          >
            {phase === 'sending' ? 'Sending…' : 'Send sign-in link'}
          </button>
          {phase === 'error' && (
            <p className="text-center text-sm text-ink-dim">
              That didn&apos;t go through. Check the address and try again.
            </p>
          )}
        </form>
      )}
    </main>
  );
}
