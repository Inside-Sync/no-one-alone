# web

Vite + React + TypeScript, routed with React Router.

Firebase Hosting serves `web/dist`. Call core-api with relative paths under `/api/...`. The dev server on `http://localhost:5173` proxies `/api` to a local core-api on port 8080.

## Run locally

Node 22.22 or later (`.nvmrc`).

```
cd web
npm install
npm run dev
```

## Checks

```
npm run lint
npm run typecheck
npm test            # Vitest, tests/
npm run e2e         # Playwright, e2e/ (starts the dev server; first time: npx playwright install chromium)
npm run build       # typecheck, then web/dist
```

## Layout

- `src/main.tsx` mounts the app; `src/app/App.tsx` holds the providers and routes (`/` → `/individual/home`, `/:view/:page`, everything else is not found).
- `src/app/navigation.ts` is the only place that touches the router; components import `useRouter` and `usePathname` from it.
- `src/domain/views.ts` lists the valid view × page pairs; `src/features/registry` maps them to pages.
- Components read data only through `src/data/repo.ts` (enforced by `tests/layering.test.ts`).
