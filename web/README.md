# web

Owner: Hải. Scaffold here with Vite (React + TypeScript):

```
npm create vite@latest . -- --template react-ts
```

Firebase Hosting serves `web/dist`. Call core-api with relative paths under `/api/...` (see `docs/contract.md`, "Hosting and URLs"). The dev server on `http://localhost:5173` can proxy `/api` to a local core-api on port 8080.
