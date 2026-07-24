# FMB ERP — Deployment Guide

## Local development (no Docker)

Requirements: Node 20+, MongoDB 8 running as a **single-node replica set** (required for the transactions used by Procurement/Inventory/Finance — see `docs/architecture/database-schema.md`), Redis (optional — the app degrades gracefully without it, see `backend/src/utils/cache.js`).

```bash
cd backend
cp .env.example .env      # fill in JWT secrets at minimum
npm install
npm run seed               # creates permissions, the 6 roles, and a Super Admin user
npm run dev                 # nodemon, http://localhost:5000
```

If MongoDB isn't already a replica set:
```bash
mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
```

Swagger UI: `http://localhost:5000/api/docs`. Health check: `GET /health`.

## Docker Compose (recommended — this is what production should run)

```bash
cp backend/.env.example backend/.env   # fill in real secrets — see below
cd docker
docker compose up -d --build
docker compose exec backend npm run seed   # first run only
```

This brings up MongoDB (with a one-shot `mongo-init` service that initializes the replica set),
Redis, the backend API (port 5000, not normally exposed publicly), and a `frontend` container that
serves the built React app **and** reverse-proxies `/api/` and `/socket.io/` to the backend from the
same origin on port 80 (`docker/frontend.Dockerfile` builds the Vite app, `docker/nginx/default.conf`
does the serving+proxying). One public port, no CORS/cookie cross-origin issues to work around.

`docker-compose.yml` loads `backend/.env` via `env_file`, then overrides `MONGO_URI`/`REDIS_URL` to
point at the compose network's service names — don't set those two yourself in `.env`, the compose
file's values win.

Rebuilding after a code change: `docker compose up -d --build` again (only rebuilds the services whose
build context changed). Logs: `docker compose logs -f backend` (or `frontend`/`mongo`). Stopping:
`docker compose down` (add `-v` only if you actually want to wipe the Mongo/Redis volumes — that's
destructive).

### Why not a serverless platform (Vercel etc.)

This app uses Socket.io for real-time in-app notifications and MongoDB transactions that need a
persistent connection pool — both assume a long-running Node process, which serverless functions
don't provide (cold starts, no sticky WebSocket connections). Docker Compose on any host that runs
Docker (a VPS, a managed Docker host, a single EC2/Droplet/VM) is the natural fit for this codebase
as built. A serverless deploy is possible but would require replacing Socket.io with a hosted realtime
service (Pusher/Ably) and pointing at MongoDB Atlas + a managed Redis (Upstash) — a real architecture
change, not a config change, so flag it explicitly if that's actually the direction wanted.

### Putting it on a real domain (TLS)

The `frontend` container listens on plain HTTP :80. For a public deployment, put a TLS terminator in
front of it rather than teaching nginx inside the container about certificates — simplest options:
- A reverse proxy on the host (Caddy or another nginx) doing Let's Encrypt + forwarding to `frontend`'s
  port 80.
- A managed load balancer / CDN in front (e.g. a cloud provider's LB with a managed cert) pointed at
  the host's port 80.

Either way, update `CLIENT_ORIGIN` in `backend/.env` to the real `https://` domain — it's used for CORS
(`app.js`'s `cors({ origin: clientOrigin })`) and any email links (reset-password, etc.).

## Deploying frontend and backend on two separate domains

The setup above puts both on one origin (simplest — no CORS to configure at all, since the frontend's
own nginx proxies API calls). If your infrastructure instead requires them on two separate domains
(e.g. `app.example.com` for the React app, `api.example.com` for the backend), that's fully supported
too — this app authenticates with `Authorization: Bearer` tokens stored in `localStorage`, **not**
cookies (see `frontend/src/services/tokenStorage.js`), so there's no cross-site-cookie problem to solve
(no `SameSite`/`credentials: 'include'` dance). Just two things to set correctly:

**1. Backend** — deploy `docker/backend.Dockerfile` on its own (own host/TLS/reverse proxy on
`api.example.com`), with `backend/.env`:
```
CLIENT_ORIGIN=https://app.example.com
```
This one variable feeds **both** the REST API's CORS policy (`app.js`) and Socket.io's CORS policy
(`config/socket.js`) — they both read `clientOrigin` from the same place, so there's only one place to
set it correctly, not two.

**2. Frontend** — deploy `docker/frontend.Dockerfile` on its own (own host/TLS/reverse proxy on
`app.example.com`), but build it with the backend's **absolute** URL instead of the same-origin default:
```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 \
  --build-arg VITE_SOCKET_URL=https://api.example.com \
  -f docker/frontend.Dockerfile -t fmb-frontend ..
```
These are Vite build-time values — baked into the compiled JS, not read at runtime — so they must be
set at build time, and the image has to be rebuilt if the backend's domain ever changes. (The
`docker-compose.yml` single-domain path doesn't pass these args, so it keeps using the same-origin
defaults `/api/v1` and `""` — no change needed there.)

Two consequences worth knowing: the frontend's nginx (`docker/nginx/default.conf`) still has `/api/`
and `/socket.io/` proxy blocks baked in from the shared config file, but they simply won't be hit in
this setup — the built JS calls the absolute `api.example.com` URL directly instead of a relative
path, so those blocks are just inert leftovers, not a conflict. And the `/uploads/*` presigned-S3 flow
and email links are unaffected either way, since those already use absolute URLs independent of which
domain layout you choose.

## Environment variables

See `backend/.env.example` for the full list. Notable ones for production:

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` — required for the Uploads module (presigned invoice/GRN/debit-note attachments). Without these, `/uploads/presign` and `/uploads/view-url` return a clear `File storage is not configured` error rather than a raw AWS SDK exception.
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` — required for mobile push notifications (FCM). Without these, push is silently skipped (`pushDeliveryStatus: 'skipped'`) — in-app and Socket.io notifications still work.
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` — required to actually send OTP/password-reset/PO/payment-advice emails. Without these, emails are logged instead of sent (dev-friendly fallback, see `services/mail.service.js`).
- `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` — override the default seeded Super Admin credentials (`admin@fmb-erp.local` / `ChangeMe@123`) — **change these before any shared/production deploy**.

## Tests

```bash
cd backend
npm test              # or npm run test:coverage
```

Tests use `mongodb-memory-server` configured as a single-node replica set (transactions require it). `tests/helpers/setupEnv.js` points it at a system `mongod` at `/usr/bin/mongod` **only if that path exists** — useful in offline dev sandboxes — and otherwise leaves it unset so the package downloads a matching binary itself (its normal behavior). Set `MONGOMS_SYSTEM_BINARY` yourself if your local `mongod` lives elsewhere.

## CI

`.github/workflows/backend-ci.yml` runs lint + `test:coverage` on every push/PR touching `backend/**`. No external database service container is configured — `mongodb-memory-server` provides its own. GitHub Actions runners have no system `mongod` at `/usr/bin/mongod`, so they fall through to downloading the binary on first run (they have internet access; this dev sandbox does not, which is why the system-binary fallback above exists).
