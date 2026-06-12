# Tenet — Production Architecture

> AI recorder & notetaker built around **trust through verifiability**: every summary point links to the exact second it was said. This document is the source of truth for how the system is built and why.

## Guiding principle: separate marketing from product

Two different concerns, two different deployments inside one monorepo:

- **`apps/web`** — marketing / waitlist landing. Static-leaning, fast, cheap, iterates daily. Goal: collect emails.
- **`apps/app`** — the product (record → transcribe → summarize → source-link). Audio pipeline + ASR + LLM + storage + auth. Built later.

Shared code lives in `packages/*`. The two apps deploy independently so marketing never blocks the product (and vice versa).

## Stack decisions (and the why)

| Layer | Choice | Why |
|---|---|---|
| Monorepo | **pnpm + Turborepo** | Fast, strict, standard for Next on Vercel. |
| Framework | **Next.js (App Router, RSC)** | One stack for landing now and product later. |
| Styling | **CSS Modules + design tokens** (no Tailwind) | The landing's hand-crafted CSS is an asset; we keep it 1:1, just componentized. Tailwind would erase the bespoke look. |
| Fonts | **next/font (self-hosted)** | Space Grotesk / Hanken Grotesk / JetBrains Mono. No external Google Fonts → faster, no CLS. |
| DB | **Supabase Postgres** | Managed Postgres + Auth + Realtime + pgvector for the product later. |
| ORM | **Drizzle** | Type-safe schema + migrations; lighter than Prisma, great on Vercel/edge. |
| Email | **Resend + React Email** | Double opt-in + launch email. Storage is ours; Resend is the transport. |
| Rate limit / anti-abuse | **Upstash Redis** | Serverless-friendly IP rate limiting; plus honeypot + timing checks. |
| Hosting | **Vercel** | First-class Next, preview deploy per PR, edge functions, analytics, domains. |
| Media | **Compressed responsive video + poster**, stored in **Vercel Blob** | 4K masters are 11–14 MB; ship 1080p (h264 + av1/webm) by default, 4K only for large screens. |
| Analytics | **Vercel Analytics** (or Plausible) | Conversion event on waitlist signup. |

## Repo layout

```
tenet/
├─ apps/
│  ├─ web/                 # marketing + waitlist (Next.js)  → tenet.app
│  │  ├─ app/              # App Router: page.tsx, layout.tsx, opengraph-image.tsx,
│  │  │                    #   sitemap.ts, robots.ts, confirm/route.ts
│  │  ├─ components/       # Nav, Hero, GranolaMock, TraceDemo, Synthesis, Roles,
│  │  │                    #   Testimonials, FinalCta, Footer, Waitlist
│  │  ├─ actions/          # join-waitlist.ts (Server Action)
│  │  ├─ styles/           # tokens.css + *.module.css
│  │  └─ public/           # video (compressed) + poster, favicon, og
│  └─ app/                 # product (later)               → app.tenet.app
├─ packages/
│  ├─ db/                  # Drizzle schema + migrations + client
│  ├─ emails/              # React Email templates (Resend)
│  ├─ ui/                  # shared tokens/components (later)
│  └─ config/              # tsconfig / eslint presets
├─ turbo.json
└─ pnpm-workspace.yaml
```

## Data model (phase 1)

```sql
waitlist_signups (
  id            uuid pk default gen_random_uuid(),
  email         citext unique not null,
  status        text default 'pending',   -- pending | confirmed | unsubscribed
  confirm_token uuid default gen_random_uuid(),
  ref           text,                      -- ?ref=
  utm           jsonb,
  created_at    timestamptz default now(),
  confirmed_at  timestamptz
)
```

RLS is **deny-all** to clients. All writes go through the server (Server Action) using the service role. No Supabase keys reach the browser.

## Waitlist request flow (Server Action, no separate API route)

1. Form submits (with progressive enhancement) to Server Action `joinWaitlist(formData)`.
2. Validate with **Zod**; reject if honeypot filled or time-on-page below threshold.
3. **Rate-limit by IP** (Upstash Redis).
4. `upsert` into `waitlist_signups` (status `pending`).
5. **Double opt-in**: send a confirm email via Resend → link `/confirm?token=…`.
6. `/confirm` route sets status `confirmed`.
7. Emit analytics event `waitlist_signup`.

## Environments / secrets

Server-only env (never `NEXT_PUBLIC_`): `DATABASE_URL` (Supabase pooled), `SUPABASE_SERVICE_ROLE`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Public: `NEXT_PUBLIC_SITE_URL`. See `apps/web/.env.example`.

## CI / deploy

- Vercel project root = `apps/web` (monorepo-aware). Preview on every PR, production on `main`.
- CI gates: `lint`, `typecheck`, `build` (+ optional Lighthouse budget).
- Custom domain + SSL on Vercel.

## SEO / observability

`metadata` API + generated `opengraph-image.tsx`, `sitemap.ts`, `robots.ts`, favicon, optional Sentry.

## Roadmap

- **Phase 0** — monorepo scaffold + `apps/web` Next.js, landing ported (CSS preserved). ← in progress
- **Phase 1** — Supabase + Drizzle + `joinWaitlist` Server Action + Resend double opt-in + rate limit.
- **Phase 2** — video compression + poster + SEO/OG + analytics + domain + production deploy.
- **Phase 3** — `apps/app`: Supabase Auth + product schema.

## Product sketch (for context)

`apps/app` (Next + Supabase Auth). Bot-free system-audio capture → **ASR** (Deepgram/Whisper, word-level timestamps) → **LLM summarization** where each summary point stores `transcript_segment_id + start_ms`. **That mapping is the "trace to source" core of the product.** Cross-conversation synthesis uses **pgvector** for theme clustering across meetings. Async work runs on a queue (Inngest/Trigger.dev); audio in Blob/R2.
