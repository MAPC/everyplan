# EveryPlan Deployment Plan

Goal: let colleagues test EveryPlan via a web link now, with a path to production on MAPC's AWS infrastructure later.

## Phase 1 — GitHub repo (done)

Repo lives on GitHub with everything needed to run: app code, pipeline, committed SQLite database, and source PDFs. No secrets or environment variables are required — the app is fully self-contained.

## Phase 2 — Colleagues run locally

```bash
git clone <repo-url>
cd everyplan
npm install
npm run dev
```

Node 18+ is the only requirement. `better-sqlite3` compiles a native binding during `npm install` (needs Xcode Command Line Tools on macOS; usually already present).

## Phase 3 — Shareable preview deployment (Render)

**Recommended platform: Render** (free tier web service). Railway works equally well ($5/mo hobby). **Vercel is not recommended** for this app: the database lives outside the Next.js app directory and is read through the filesystem with a native module (`better-sqlite3`), which fights Vercel's serverless bundling. Render/Railway run the app as a normal persistent Node server, so SQLite just works.

Steps:

1. In Render: **New → Web Service**, connect the GitHub repo.
2. Settings:
   - **Root directory:** (leave blank — repo root)
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm run start`
   - **Instance type:** Free (fine for preview)
   - **Environment:** Node; add env var `NODE_VERSION=20` if the default is older
3. Deploy. Render assigns a `*.onrender.com` URL to share.

Notes:
- `next start` respects Render's `PORT` env var automatically.
- Free tier spins down after ~15 min idle; first request after that takes ~30–60 s. Upgrade to Starter ($7/mo) if that annoys people.
- The database is read-only at runtime as used by the app, so the ephemeral filesystem is not a problem. To update data: re-run the pipeline locally, commit the new `everyplan.db`, push — Render auto-redeploys.

## Phase 4 — Production on MAPC AWS (EC2)

When ready for a real audience:

1. **Server:** EC2 instance (t3.small is plenty), Node 20 via nvm or a Docker container.
2. **Process manager:** `pm2` (or a systemd unit) running `npm run start`.
3. **Reverse proxy:** nginx in front on ports 80/443, proxying to the Next.js port.
4. **HTTPS:** certbot/Let's Encrypt on nginx, or terminate TLS at an ALB if MAPC already uses one.
5. **Domain:** e.g. `everyplan.mapc.org` via MAPC's DNS.
6. **Deploys:** `git pull && npm install && npm run build && pm2 restart everyplan`, or a small GitHub Actions workflow that SSHes in. Adding a Dockerfile is worth it at this stage for reproducibility.

### When to consider PostgreSQL

SQLite is fine for a read-heavy site of this size, even in production. Revisit only if the app gains user accounts, write workloads, or multiple app servers. The schema is simple enough that migration would be straightforward.

## Data update workflow (all phases)

1. Drop new plan PDFs into `plans/`.
2. Run `npm run pipeline` (regenerates `data/output/everyplan.db` + JSON).
3. Commit and push. Preview/production redeploys pick up the new database.
