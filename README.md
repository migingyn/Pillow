# Locus.Ai

A thermal livability heat map for Los Angeles and Orange County. Locus.Ai scores every census block across walkability, transit access, car dependency, and employment proximity — then lets you weight those factors to surface neighborhoods that match how you actually want to live.

## Features

- **Thermal heat map** — color-coded from cold (low livability) to hot across ~37,000 LA/OC census blocks
- **Click any block** — opens a detail panel with factor scores, strengths, risks, and an AI-generated explainer
- **Adjustable scan parameters** — real-time weight sliders for walkability, transit, and traffic dependency
- **Search** — fly smoothly to any LA/OC city, neighborhood, or ZIP and auto-open the block panel
- **AI analysis** — 2–3 sentence insight powered by Claude on every neighborhood and census block

## Stack

- **Frontend**: React + Vite, TypeScript, Tailwind CSS, Framer Motion
- **Map**: Mapbox GL JS v3 — vector tiles, feature-state hover/click, geocoding API
- **Backend**: Express, TypeScript
- **AI**: Anthropic Claude (`claude-haiku-4-5`)
- **Data**: EPA Smart Location Database, GTFS transit feeds, LEHD employment data
- **Deployment**: Vercel (SPA + serverless Express)

## Environment variables

Create a `.env` file in the project root (and/or `frontend/.env` for Vite):

```env
# frontend/.env
VITE_MAPBOX_TOKEN=pk....

# root .env (picked up by the backend)
GROQ_API_KEY=sk-ant-...
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

## Quick start

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:5173/api/health` (proxied in dev)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run frontend + backend together |
| `npm run dev:frontend` | Run Vite dev server only |
| `npm run dev:backend` | Run Express dev server only |
| `npm run build` | Build frontend for production (`frontend/dist`) |
| `npm run preview` | Preview the Vite build locally |
| `npm run typecheck` | Run TypeScript checks across the monorepo |

## Project structure

```
├── api/                  # Vercel serverless entry point
├── backend/src/          # Express app + Anthropic proxy
├── frontend/src/
│   ├── components/       # FilterSidebar, AreaDetailPanel, CensusBlockPanel, ...
│   ├── data/             # neighborhoods.ts (scoring data + weight types)
│   └── pages/            # Landing, MapPage
├── vercel.json           # Vercel routing config
└── tsconfig.json         # Shared TypeScript config
```

## Vercel deploy

1. Import this repo in Vercel.
2. Add environment variables (`VITE_MAPBOX_TOKEN`, `GROQ_API_KEY`, `CORS_ORIGIN`) in the Vercel project settings.
3. Keep the default install command (`npm install`).
4. Build command and output directory are defined in `vercel.json`.
5. Deploy.

Vercel will:
- Build the frontend into `frontend/dist`
- Serve Express via `api/index.ts` as a serverless function
- Route `/api/*` to Express and all other routes to the SPA
