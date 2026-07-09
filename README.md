# Momentum

A burnout-proof consistency tracker. One number (0–100) that can dip but can
never break, reset, or shame you. No streaks. Nothing red. Nothing to lose.

## How it works

- **Momentum** — `tomorrow = 0.92 × today + 0.08 × completion`. Computed once
  per day rollover in your timezone from stored daily snapshots
  (`src/lib/momentum.ts`). New accounts start at 50. Empty days decay gently
  and are always recoverable.
- **Buckets** — five areas with weekly targets; each shows a trailing 7-day
  fill bar that self-heals as you log.
- **Three slots a day** — max 3 logs per day across all buckets, enforced in
  the app and by a `UNIQUE (user_id, logged_on, slot)` constraint. 3/3 is a
  100% day. The app celebrates it once and never asks for more.

## Architecture

Client-rendered SPA in Next.js clothes. IndexedDB is the source of truth the
UI renders from; Supabase is a sync target. Writes append to an outbox that
drains when online (`src/lib/sync.ts`); pulls replace local data only when the
outbox is empty. All IDs are client-generated UUIDs so sync is idempotent.
The Serwist service worker precaches the three page shells, so the app opens
and works fully offline.

The Supabase project is shared with other apps: all tables are prefixed
`momentum_`, the migration is strictly additive, and there are no triggers on
`auth.users` (default buckets are seeded app-side on first sign-in).

## Development

```sh
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Apply the schema (Supabase CLI, linked project):

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db query --linked -f supabase/migrations/0001_momentum_schema.sql
```

Tests cover the momentum math, timezone/date handling, and slot assignment:

```sh
npm test
```

## Deploy

```sh
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel --prod
```

Then add `https://YOUR_DOMAIN/auth/callback` to the Supabase auth redirect
allowlist (Authentication → URL Configuration) so magic links land back in
the app.

Production builds use webpack (`next build --webpack`) because the Serwist
service-worker plugin doesn't support Turbopack yet; dev runs plain Turbopack
with no service worker.
