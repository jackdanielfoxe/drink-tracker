# The Round — drink tracker

Mobile-first React + Vite app for a friend group to log daily drinks and
see a leaderboard. Backend is Supabase (Postgres) — no custom server.

## File structure

```
drink-tracker/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── schema.sql            # run once in Supabase SQL editor
├── vercel.json           # SPA routing fallback for Vercel
├── netlify.toml          # SPA routing fallback for Netlify
├── public/
│   └── _redirects        # alternative Netlify routing fallback
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── LogDrinks.jsx
    ├── Leaderboard.jsx
    ├── DrinkRow.jsx
    ├── api.js
    ├── supabaseClient.js
    ├── constants.js
    ├── dateUtils.js
    └── styles.css
```

## Setup

1. Create a Supabase project (free tier).
2. Run `schema.sql` in the SQL editor — creates tables, seeds drink types
   and 4 placeholder users.
3. Edit user names directly in Supabase (Table Editor → users) — the app
   fetches users + ids dynamically, no hardcoding needed.
4. Project Settings → API → copy Project URL and anon public key.
5. Copy `.env.example` to `.env` and fill in both values.

## Run locally

```bash
npm install
npm run dev
```

## Using Claude Code

From this folder, run `claude` to start an interactive session. You can
ask it to install dependencies, run the dev server, fix errors, add
features, or prep a deployment — it can execute commands directly.

## Deploy

**Vercel**: import the repo, framework auto-detects as Vite, add the two
`VITE_SUPABASE_*` env vars. `vercel.json` handles SPA routing.

**Netlify**: build command `npm run build`, publish dir `dist`, add the
two env vars. `netlify.toml` (or `public/_redirects`) handles SPA routing.
