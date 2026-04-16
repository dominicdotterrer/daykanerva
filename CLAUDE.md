# daykanerva — CLAUDE.md

Personal website of Dominic Dotterrer at [daykanerva.com](https://daykanerva.com).
Research, interactive math games, and writing.

## Tech Stack

- **Astro 6** with file-based routing (`src/pages/`)
- **React 19** for interactive components — always mounted with `client:only="react"`
- **TypeScript** throughout
- **MDX / Markdown** for blog posts (content collections with Zod schema in `src/content.config.ts`)
- Deployed on **Netlify**

## Site Sections

| Route | File | Notes |
|---|---|---|
| `/` | `pages/index.astro` | Home / intro |
| `/research` | `pages/research.astro` | Publications stored as a JS array in the file |
| `/math-games` | `pages/math-games.astro` | Hub — add a card here for each new game |
| `/heilbronn` | `pages/heilbronn.astro` | Heilbronn Triangle Game |
| `/heilbronn-learn` | `pages/heilbronn-learn.astro` | Math explainer for Heilbronn problem |
| `/curios` | `pages/curios.astro` | Curated links stored as a JS array |
| `/blog` | `pages/blog/index.astro` | Blog listing |
| `/blog/:slug` | `pages/blog/[...slug].astro` | Dynamic blog posts (auto-generated from content collection) |
| `/about` | `pages/about.astro` | About page |
| `/rss.xml` | `pages/rss.xml.js` | RSS feed |

## Adding Blog Posts

Create a `.md` or `.mdx` file in `src/content/blog/`. Required frontmatter:

```yaml
---
title: 'Post Title'
description: 'Short description'
pubDate: 'Jan 01 2026'
heroImage: '/path/to/image.jpg'  # optional
---
```

## Adding Math Games

Each game follows the Heilbronn pattern:

1. **Game page** (`pages/<game-name>.astro`) — mounts the React component with `client:only="react"`
2. **Learn page** (`pages/<game-name>-learn.astro`) — mathematical explainer for the game
3. **React component** (`components/<GameName>.tsx`) — all interactive logic lives here
4. **Card on the hub** — add an entry to `pages/math-games.astro`

### Pyodide / Python Integration (Heilbronn)

The Heilbronn game scores player placements by running Python in the browser via [Pyodide](https://pyodide.org). The custom scoring package is a Python wheel at `public/wheels/`. Pyodide is loaded from CDN at runtime inside `HeilbronnGame.tsx`. This avoids any backend dependency for compute-heavy logic.

New games are not required to use Pyodide — only use it when the scoring/computation logic is naturally expressed in Python.

## Open Design Question: User Engagement / High Scores

There is currently no mechanism for persisting high scores or user engagement data. The Heilbronn game skipped this because writing back to the repo from the browser (via Pyodide) was impractical.

**Do not implement any persistence solution without first agreeing on the approach.** Options to evaluate when the time comes:

- `localStorage` — per-device only, no global leaderboard, zero infrastructure
- **Supabase** — simple Postgres-backed REST API, generous free tier
- **Netlify Functions** + a lightweight key-value store
- **GitHub Discussions / Issues API** — hacky but zero cost

## Conventions

- Static content (publications, curios) lives as a JS array directly in the page file, not in a separate data file.
- React is used only where real interactivity is needed; everything else is Astro.
- CSS: global variables and base styles in `src/styles/global.css`; component-specific styles in scoped `<style>` blocks.
- Atkinson font is self-hosted from `public/fonts/`.
- Site URL is `https://daykanerva.com` (configured in `astro.config.mjs`).
