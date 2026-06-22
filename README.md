# Tenet

> AI recorder & notetaker built on **trust through verifiability** — every summary point links to the exact second it was said.

Tenet records your calls, transcribes them, summarizes the key points, and links each point back to its moment in the recording. No more re-watching a meeting to find the one thing someone actually said.

## Monorepo

pnpm workspaces + Turborepo. The two apps deploy independently, so marketing never blocks the product (and vice versa).

```
tenet/
├─ apps/
│  ├─ web/      # marketing landing + waitlist  → tenet.app
│  └─ app/      # the product (record → transcribe → summarize → source-link)
├─ packages/
│  └─ db/       # Drizzle schema + migrations (shared)
└─ ARCHITECTURE.md   # source of truth for how & why it's built
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript |
| Styling | CSS Modules + design tokens (no Tailwind — the hand-crafted look is the asset) |
| Transcription | Deepgram / Groq Whisper |
| Summarization | Google Gemini |
| Database / Auth | Supabase (Postgres + Auth) |
| ORM | Drizzle |
| Email | Resend |
| Rate limiting | Upstash Redis |
| Hosting | Vercel |

## What's built

- **Landing** — bilingual (RU/EN), waitlist, pricing (Free / Pro / Team).
- **Product** — record live from the browser (no bot joins the call), upload a file, real transcription, AI summary with key points, **trace-to-source** (tap a point → jump to the exact second), Transcript / Insights / AI-chat panels, export (Markdown / text / audio).

## Getting started

Requires Node 20+ and pnpm.

```bash
pnpm install

# marketing landing
pnpm --filter @tenet/web dev      # http://localhost:3000

# the product
pnpm --filter @tenet/app dev
```

### Environment

Secrets are never committed. Both apps run in a **demo mode** with no keys (the product shows a showcase dataset; the waitlist logs locally).

For real data, set the env vars listed in [`ARCHITECTURE.md`](./ARCHITECTURE.md#environments--secrets):
`DATABASE_URL` / `SUPABASE_*`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_*`, and a transcription key (`DEEPGRAM_API_KEY` or `GROQ_API_KEY`) + `GEMINI_API_KEY` for the product.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run all apps (Turborepo) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint |
| `pnpm typecheck` | Type-check |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations |

## Roadmap

- ✅ Monorepo + landing (ported, bilingual) + waitlist
- ✅ Product UI: record / upload / transcribe / summarize / trace-to-source / export
- ✅ Pricing
- 🚧 Auth + persistence, cross-meeting synthesis (pgvector)

## License

Proprietary — all rights reserved.
