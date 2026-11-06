# NetMirror

NetMirror is a small-web browser for exploring, publishing, and recording visits to a curated network of `.zz` sites. Each browser history entry retains its rendered page and scroll position, so Back and Forward restore the previous view without refetching it.

## Technology stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript, Mongoose
- Database: MongoDB

## Folder structure

```text
backend/   NestJS API, MongoDB schemas, and seed script
frontend/  Next.js browser interface
```

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB, local or hosted

## Environment variables

Create `backend/.env` with:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/netmirror
PORT=3001
```

The frontend currently calls the API at `http://localhost:3001`.

## Backend setup

```bash
cd backend
npm install
npm run start:dev
```

## Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

## Database seeding

With MongoDB running and the backend environment configured:

```bash
cd backend
npm run seed
```

The seed uses upserts for users and sites and replaces only its own visit records. It creates four users, ten sites, repeat visits, and deterministic timestamps spanning approximately one hour.

## Application URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Known limitations

- Published HTML is sandboxed and link navigation is limited to valid internal `.zz` addresses, but this is a deliberately small browser rather than a general-purpose HTML sanitizer.
- The API has no authentication; the user switcher is intended for local/demo use.
- The frontend API base URL is currently fixed to `http://localhost:3001`.
