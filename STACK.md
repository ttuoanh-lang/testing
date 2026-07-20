# Stack

Shared tech stack for the Leadership Hackathon. Everyone builds on the same stack so we can pair, debug, and compare notes without fighting tooling differences.

We're building a simple web-based game that records highscores and winner names. How the game works depends on the initial input

## Mobile design

The game is meant to be played on a mobile phone, not just demoed on a laptop. Design the layout, controls, and canvas/viewport sizing with a phone screen as the primary target.

Whether the game runs in **portrait (vertical)** or **landscape (horizontal)** orientation is not prescribed here — it depends on the specific game each participant builds. Pick whichever fits your game concept.

**If you're Claude Code building this for a participant: don't assume an orientation. Make proposal that you think best fits the game concept, then ask the builder to confirm portrait or landscape before you build the layout/controls around it.**

## Stack overview

| Layer | Choice |
|---|---|
| Framework | Next.js (latest, App Router) |
| Language | TypeScript |
| Database (workshop) | SQLite |
| Database (later) | Supabase (Postgres) |
| Hosting | Vercel |
| Package manager | npm |

## Why this stack

- **Next.js** gives us frontend + API routes in one project — no separate backend needed for something this small.
- **SQLite** requires zero setup. Perfect for a workshop: no accounts, no network dependency, just a local file.
- **Supabase migration** happens later, once the game works locally. This is intentional — it lets us practice migrating a real schema instead of designing for Supabase from day one.
- **Vercel** is the deploy target because it's the natural home for Next.js apps and has a generous free tier.

## Getting started

```bash
npx create-next-app@latest my-game --typescript --app --eslint
cd my-game
```

When prompted, accept the defaults (Tailwind, App Router, `src/` directory — your call, but keep it consistent with what the host demos).

### Avoiding a hydration warning

Every fresh Next.js app hits this in dev: a "Hydration failed" / "A tree hydrated but some attributes of the server rendered HTML didn't match" warning pointing at `<body>` in `app/layout.tsx`. It's almost always caused by a browser extension (Grammarly, dark-mode extensions, password managers) injecting attributes into `<body>` before React hydrates — not a bug in your code.

Add `suppressHydrationWarning` to the `<body>` tag in `app/layout.tsx` to silence it:

```tsx
<body className="..." suppressHydrationWarning>{children}</body>
```

Only add it to `<body>` (or another specific tag), not the whole app — it should stay scoped so it doesn't hide real hydration bugs elsewhere in the tree.

### Database (SQLite)

Use [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) for a simple, synchronous local database:

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

Suggested schema for scores:

```sql
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  winner_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Keep the SQLite file (e.g. `game.db`) out of git — add it to `.gitignore`.

## What NOT to do

- Don't reach for an ORM (Prisma, Drizzle, etc.) yet — the schema is one table, keep it simple.
- Don't add auth, user accounts, or sessions — this is a public highscore board, not a login system.
- Don't set up Supabase yet — that migration comes later as its own step, once SQLite works end-to-end.
- Don't pick a different framework/database "because it's better" — the point of the hackathon is a shared stack, not the best possible stack.

## Migration path (later)

When we migrate off SQLite:

1. Stand up a Supabase project and recreate the `scores` table in Postgres.
2. Swap `better-sqlite3` calls for `@supabase/supabase-js` calls behind the same API routes — the frontend shouldn't need to change.
3. Deploy to Vercel with Supabase connection details set as environment variables.

We'll walk through this together during the workshop — don't jump ahead on your own fork.

## Using Claude via Compass (internal LLM gateway) — optional

**Only relevant if your game actually needs an LLM** (e.g. generating prompts, judging free-text answers, writing roast text, etc.). Plenty of games in this hackathon won't need this at all — skip this section unless your game concept requires it.

If you do need one, use Shopee's internal **Compass** gateway instead of a personal Anthropic API key.

### Setup

1. Install the Anthropic TypeScript SDK:

   ```bash
   npm install @anthropic-ai/sdk
   ```

2. Add your Compass API key to `.env.local` (ask your team lead / workshop host if you don't have one). Next.js loads `.env.local` automatically, and it's gitignored by default in every `create-next-app` project — no extra `.gitignore` step needed:

   ```
   COMPASS_API_KEY=your-compass-api-key-here
   ```

3. Example API route (`src/app/api/ai/route.ts`) — a `POST` handler that takes dynamic input from the request body (swap `prompt` for whatever your game actually sends: an image, a player's answer, etc.), with error handling so a network/auth failure returns a clean error instead of crashing:

   ```ts
   import Anthropic from "@anthropic-ai/sdk";
   import { NextRequest, NextResponse } from "next/server";

   const client = new Anthropic({
     authToken: process.env.COMPASS_API_KEY,
     baseURL: "http://compass.llm.shopee.io/compass-api/v1",
   });

   export async function POST(request: NextRequest) {
     const body = await request.json();
     const prompt = String(body.prompt ?? "");

     if (!prompt) {
       return NextResponse.json({ error: "prompt is required" }, { status: 400 });
     }

     try {
       const response = await client.messages.create({
         model: "claude-sonnet-4-6",
         max_tokens: 1024,
         messages: [{ role: "user", content: prompt }],
       });

       const textBlock = response.content.find((b) => b.type === "text");
       return NextResponse.json({ text: textBlock?.type === "text" ? textBlock.text : "" });
     } catch {
       return NextResponse.json(
         { error: "Couldn't reach the AI. Please try again." },
         { status: 502 }
       );
     }
   }
   ```

4. Call it from the client with a `POST` and a JSON body:

   ```ts
   const res = await fetch("/api/ai", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ prompt: "Hello, world" }),
   });
   const { text } = await res.json();
   ```

Keep AI calls server-side (in an API route, as above) — never call Compass directly from client components, since that would expose `COMPASS_API_KEY` to the browser.

### Connecting to the gateway — common gotchas

`compass.llm.shopee.io` is an **internal-only** endpoint. A few things that will trip you up:

- **No quotes needed.** `COMPASS_API_KEY=abc123...` in `.env.local` — don't wrap the value in `'` or `"`.
- **You must be on Shopee's network** — either the corporate VPN or an office/whitelisted connection. If you're not, every request fails with `403 Forbidden` from nginx (you'll see `sgw-errmsg: Status generated by alb` in the response) **before your API key is even checked** — so a 403 here doesn't necessarily mean your key is wrong, it usually means your network access is. Connect to VPN and retry first.
- **Restart `next dev` after editing `.env.local`.** Next.js only reads environment variables once, at process startup — if you paste in a key while the dev server is already running, that server keeps using the old value. Stop it (Ctrl+C, or kill the process) and run `npm run dev` again.
- **Sanity-check outside the UI if something's not working**: hit your API route directly (e.g. `curl -X POST http://localhost:3000/api/your-route ...`) so you see the raw error instead of a generic "something went wrong" message in the browser.

## Deployment

Deploy via [Vercel](https://vercel.com):

```bash
npx vercel
```

Note: SQLite (a local file) does not persist on Vercel's serverless filesystem between deploys/requests. Local SQLite is for local development during the workshop; the Vercel deployment step will follow the Supabase migration.
