# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A "Thai Flashcards" web game for a company hackathon (see [STACK.md](STACK.md) for the shared-stack rules everyone in the hackathon follows). Players learn Thai vocabulary over 10 rounds of increasing difficulty, writing Thai sentences that use the words they were just shown, with an LLM grading each submission. Scores are saved to a Supabase (Postgres) leaderboard.

Read [STACK.md](STACK.md) before making stack-level decisions (framework/database/hosting choices, mobile layout orientation) — it documents constraints agreed for the whole hackathon, not just this project.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build and start
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next`)
- No test framework is configured (no test script, no Jest/Vitest dependency).

## Environment variables

- `COMPASS_API_KEY` — required for the default (Compass) grading path. Set in `.env.local`, no surrounding quotes. Requires Shopee VPN/network access — a 403 with `sgw-errmsg` in the response means network access, not the key, is the problem.
- `GRADING_PROVIDER=local` — switches grading to the in-process local model (see below) when Compass/VPN isn't available.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — required for the leaderboard (see Persistence below). From the Supabase project's Settings > API.
- Restart `next dev` after editing `.env.local` — env vars are only read at process startup.

## Architecture

**Game flow**: [src/app/page.tsx](src/app/page.tsx) (name entry, `sessionStorage.playerName`) → [src/app/play/page.tsx](src/app/play/page.tsx) (the 10-round game loop, client-rendered state machine over `Phase` = `showWords → collectSentence → grading → feedback → (next round | gameOver)`) → [src/app/leaderboard/page.tsx](src/app/leaderboard/page.tsx) (server component reading Supabase directly).

**Round difficulty is entirely config-driven** by [src/lib/rounds.ts](src/lib/rounds.ts) (`ROUNDS: RoundConfig[]`) — new-word count, how many must be used, sentence count, and minimum word counts all scale up across the 10 rounds. Both the words API and the play page UI read this same config, so changing round difficulty only means editing this one array.

**Word selection** ([src/app/api/words/route.ts](src/app/api/words/route.ts)): words come from [src/data/wordbank.json](src/data/wordbank.json) (195 words, ranked by frequency). Each round raises a rank ceiling proportional to `round / TOTAL_ROUNDS`, so later rounds can draw rarer words while earlier rounds stay restricted to the most common ones.

**Grading has two interchangeable providers**, selected by `GRADING_PROVIDER`:
- **Compass** (default, [src/app/api/grade/route.ts](src/app/api/grade/route.ts)): calls Shopee's internal Compass gateway via `@anthropic-ai/sdk` (`baseURL` pointed at `compass.llm.shopee.io`). Requires VPN + `COMPASS_API_KEY`.
- **Local** ([src/lib/localGrader.ts](src/lib/localGrader.ts)): runs a small Qwen2.5-0.5B model in-process via `@huggingface/transformers`, no network/API key needed. This is a deliberately weaker proof-of-concept fallback — its prompt is kept terse because the small model drifts into malformed output with longer instructions. Model weights cache to `.model-cache/` (gitignored).

Both providers are only reached after a cheap local check (`countUsedWords` in the grade route) confirms the submission actually contains enough target words — the LLM is never asked to grade a submission that doesn't already meet that bar.

**Persistence** ([src/lib/db.ts](src/lib/db.ts)): `@supabase/supabase-js` against the `scores` table in Postgres, using the service role key server-side only (this module is only ever imported from a Route Handler and a Server Component, never from client code, so there's no need for Row Level Security policies — the service role bypasses RLS entirely). Both exported functions (`insertScore`, `getTopScores`) are `async`. Table must already exist in Supabase (create it via the SQL Editor — see the project's setup notes); this module doesn't run migrations.

**API routes** (`src/app/api/*/route.ts`): `GET /api/words?round=N` (round config + words), `POST /api/grade` (validate + grade a submission), `GET /api/scores` / `POST /api/scores` (leaderboard read/write).

## Conventions specific to this repo

- Mobile is the primary target, not desktop — see STACK.md's "Mobile design" section. If you're adding new UI/layout, confirm portrait vs. landscape with the user first rather than assuming.
- `<body suppressHydrationWarning>` in [src/app/layout.tsx](src/app/layout.tsx) is intentional (browser-extension-injected attributes, not a real bug) — keep it scoped to `<body>`, don't spread it wider.
- Player identity is passed via `sessionStorage`, not cookies or URL params — [src/app/play/page.tsx](src/app/play/page.tsx) redirects to `/` if `playerName` is missing.
