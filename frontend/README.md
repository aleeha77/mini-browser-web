# NetMirror Frontend

This Next.js application provides the NetMirror small-web browser interface. It loads `.zz` sites from the NestJS backend, records browsing visits, supports search and publishing, and restores cached page and scroll state during Back and Forward navigation.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The backend must be running at http://localhost:3001.

## Scripts

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint.

## Configuration

The API base URL is currently defined in `lib/api.ts` as `http://localhost:3001`.
