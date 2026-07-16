# EveryPlan

EveryPlan is a searchable library of municipal plans (Open Space & Recreation Plans, Housing Production Plans, and more) for the MAPC region. It extracts structured data from plan PDFs — sections, recommendations, metadata — and serves it through a web app with full-text search, cross-plan comparison, a regional map, and a recommendations explorer.

## Architecture

- **Web app** — Next.js 14 (App Router) + Tailwind CSS, in [`packages/standalone/`](packages/standalone/). Reads from a bundled SQLite database via `better-sqlite3`.
- **Data pipeline** — Python script at [`data/pipeline/process_plans.py`](data/pipeline/process_plans.py) that extracts text and structure from plan PDFs using template-guided parsing (templates in `data/pipeline/templates/`).
- **Database** — SQLite at [`data/output/everyplan.db`](data/output/everyplan.db), committed to the repo so the app runs with no external database. Includes FTS5 full-text search over plan sections.
- **Source PDFs** — `plans/` holds original plan documents used by the pipeline.

The database and pipeline outputs are committed, so you can run the app without running the pipeline.

## Running locally

Requirements: Node.js 18+ (20+ recommended).

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Running the data pipeline (optional)

Only needed if you're adding or reprocessing plans. Requires Python 3.10+.

```bash
pip3 install -r data/pipeline/requirements.txt
npm run pipeline
```

This regenerates `data/output/everyplan.db` and the JSON outputs in `data/output/`.

## Project layout

```
packages/standalone/   Next.js app (UI, API routes)
data/pipeline/         Python extraction pipeline + plan-type templates
data/output/           Generated database and JSON (committed)
data/geojson/          Boundary data for the map
plans/                 Source plan PDFs
docs/                  PRD addendum, deployment plan
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the deployment plan (preview hosting and eventual MAPC AWS production).
