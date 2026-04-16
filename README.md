# daykanerva.com

Personal website of Dominic Dotterrer — research, interactive math games, and writing.

Live at [daykanerva.com](https://daykanerva.com). Deployed on Netlify.

## Stack

- **Astro 6** — static site generation with file-based routing
- **React 19** — interactive game components (client-side only)
- **TypeScript**
- **MDX / Markdown** — blog posts via Astro content collections

## Project Structure

```
src/
├── components/            # Astro + React components
│   └── HeilbronnGame.tsx  # Interactive game (React + Pyodide)
├── content/
│   └── blog/              # Markdown/MDX blog posts
├── layouts/
│   └── BlogPost.astro     # Blog post template
├── pages/
│   ├── index.astro        # Home
│   ├── about.astro        # About
│   ├── research.astro     # Publications list
│   ├── math-games.astro   # Math games hub
│   ├── heilbronn.astro    # Heilbronn Triangle Game
│   ├── heilbronn-learn.astro  # Heilbronn problem explainer
│   ├── curios.astro       # Curated links
│   └── blog/              # Blog listing + dynamic post routes
public/
└── wheels/                # Python wheels for in-browser (Pyodide) execution
```

## Commands

All commands run from the project root:

| Command             | Action                                 |
| :------------------ | :------------------------------------- |
| `npm install`       | Install dependencies                   |
| `npm run dev`       | Start dev server at `localhost:4321`   |
| `npm run build`     | Build production site to `./dist/`     |
| `npm run preview`   | Preview production build locally       |
| `npm run astro ...` | Run Astro CLI commands                 |
