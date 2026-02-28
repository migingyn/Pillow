# Pillow

React + Vite + TypeScript + Tailwind CSS frontend with an Express backend, configured for Vercel deployment.

## Stack

- **Frontend**: React + Vite, TypeScript, Tailwind CSS
- **Backend**: Express, TypeScript
- **Deployment**: Vercel (SPA + serverless Express)

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
├── api/              # Vercel serverless entry point
├── backend/src/      # Express app
├── frontend/src/     # React app
├── vercel.json       # Vercel routing config
└── tsconfig.json     # Shared TypeScript config
```

## Vercel deploy

1. Import this repo in Vercel.
2. Keep the default install command (`npm install`).
3. Build command and output directory are defined in `vercel.json`.
4. Deploy.

Vercel will:
- Build the frontend into `frontend/dist`
- Serve Express via `api/index.ts` as a serverless function
- Route `/api/*` to Express and all other routes to the SPA
