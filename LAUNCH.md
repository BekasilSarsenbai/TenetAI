# Launch checklist — Tenet MVP

The code is ready: real auth (Google + magic-link), per-user persistence (meetings
saved to Supabase, audio in Storage), real transcription/summary, and a landing that
sends visitors straight to sign-up (waitlist removed). To go live, do the steps below.
Until the anon key is real, the app stays in **demo mode** (showcase data, no login).

Supabase project: `texgkhxosinhasstxpxk` → `https://texgkhxosinhasstxpxk.supabase.co`

## 1. Run the database migrations

Supabase dashboard → **SQL Editor** → run each file (idempotent, safe to re-run):

1. `supabase/migrations/0001_meetings.sql` — `meetings` table + Row-Level Security.
2. `supabase/migrations/0002_storage.sql` — private `recordings` bucket + storage policies.

## 2. Fill the app env — `apps/app/.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://texgkhxosinhasstxpxk.supabase.co   # already set
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase → Settings → API → anon public>
GROQ_API_KEY=<groq.com — cheap transcription + summary>            # or DEEPGRAM_API_KEY
GEMINI_API_KEY=<aistudio.google.com — summary>                     # optional if using Groq for summary
```

The anon key flips the app out of demo mode. At least one transcription key is needed
for real transcripts (otherwise it falls back to a demo transcript).

## 3. Configure Supabase Auth

Dashboard → **Authentication**:

- **URL Configuration** → set *Site URL* and add *Redirect URLs*:
  - local: `http://localhost:3000/auth/callback`
  - prod:  `https://app.tenet.app/auth/callback`
- **Providers → Email** — enabled by default (magic link works out of the box).
- **Providers → Google** — enable it, paste a Google OAuth client ID/secret
  (Google Cloud Console → Credentials), and set the authorized redirect to
  `https://texgkhxosinhasstxpxk.supabase.co/auth/v1/callback`.

## 4. Point the landing at the app — `apps/web` env

```
NEXT_PUBLIC_APP_URL=http://localhost:3000      # local
# NEXT_PUBLIC_APP_URL=https://app.tenet.app    # prod
```

All landing CTAs (Get started / Sign in / pricing) link to `${NEXT_PUBLIC_APP_URL}/login`.

## 5. Run it

```bash
pnpm --filter @tenet/app dev    # product → http://localhost:3000
pnpm --filter @tenet/web dev    # landing → http://localhost:3001 (or another port)
```

Sign in with Google or a magic link, record/upload a session, refresh — it persists.

## 6. Deploy (when ready)

- `apps/app` → a Vercel project on `app.tenet.app` with the env from steps 2–3 (use the
  production redirect URLs). `apps/web` already deploys; add `NEXT_PUBLIC_APP_URL`.

## Not in this MVP (by decision)

Billing (Stripe) and Free-tier usage limits — launch is free for everyone; add later.
The old waitlist rows are kept in `waitlist_signups` (you can email them at launch).
