# Shopify App Store Scraper

Automated scraper that collects app listings from the Shopify App Store every Sunday via GitHub Actions, with a FastAPI backend + React frontend for browsing and filtering scraped data.

---

## Project Structure

```
.
├── scrape.py                    # Production scraper script
├── config.py                    # Centralized configuration
├── requirements.txt             # Python dependencies (pinned)
├── .env.example                 # Environment variable template
├── Dockerfile                   # Container image for Railway
├── railway.toml                 # Railway deployment config
├── .github/
│   └── workflows/
│       └── scrape.yml           # GitHub Actions weekly cron job
├── backend/                     # FastAPI API server
│   ├── main.py                  # FastAPI app
│   ├── models.py                # SQLAlchemy ORM models
│   ├── schemas.py               # Pydantic schemas
│   ├── crud.py                  # Database operations
│   ├── database.py              # Neon PostgreSQL connection
│   ├── import_data.py           # CSV → DB import script
│   └── requirements.txt         # Backend dependencies
├── frontend/                    # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx              # Main app + routing
│   │   ├── api.js               # API client
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Landing / stats page
│   │   │   ├── AppList.jsx      # App explorer with filters
│   │   │   └── AppDetail.jsx    # Individual app view
│   │   └── components/
│   │       ├── DataTable.jsx
│   │       ├── AdvancedFilterPanel.jsx
│   │       ├── ColumnSelector.jsx
│   │       ├── StatsSummaryBar.jsx
│   │       └── TablePagination.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── data/                        # Scraped CSV output + backups
│   └── backups/                 # Timestamped CSV archives
└── README.md
```

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Copy environment variables

```bash
cp .env.example .env
# Edit .env if needed (defaults work out of the box)
```

### 3. Test with dry-run

```bash
python scrape.py --out data/test.csv --dry-run -v
```

### 4. Run full scrape

```bash
python scrape.py --out data/shopify_apps_all_categories.csv --dedupe-global -v
```

**Typical runtime:** ~15–30 minutes (8 categories, up to 200 pages each).

---

## Configuration

All settings are driven by environment variables (`.env`) or CLI flags.

| Variable | Default | Description |
|----------|---------|-------------|
| `MIN_DELAY` | `0.7` | Min delay between pages (seconds) |
| `MAX_DELAY` | `1.6` | Max delay between pages (seconds) |
| `MAX_PAGES` | `200` | Safety cap pages per category |
| `REQUEST_TIMEOUT` | `30` | HTTP request timeout (seconds) |
| `MAX_RETRIES` | `6` | Max retry attempts per request |
| `OUTPUT_DIR` | `data` | Output directory |
| `DISCORD_WEBHOOK_URL` | — | Discord webhook for notifications |

---

## CLI Options

```
python scrape.py --out data/output.csv [OPTIONS]

  --url URL           Single category URL
  --urls URLS         Multiple space-separated URLs
  --out PATH          Output CSV path (required)
  --max-pages N       Pages per category (default: 200)
  --min-delay N       Min delay seconds (default: 0.7)
  --max-delay N       Max delay seconds (default: 1.6)
  --dedupe-global     Deduplicate across all categories
  --dry-run           Fetch only first page (for testing)
  --list-categories   Print default categories and exit
  -v, --verbose       Debug logging
```

---

## Deployment

### GitHub Actions (Automated Weekly Scrape)

The workflow runs every **Sunday at 00:00 UTC** and auto-commits results to the repo.

1. Push to GitHub (the workflow is already set up)
2. The `GITHUB_TOKEN` secret is auto-provided — no extra setup needed
3. Optionally add a Discord webhook in `.env` for failure notifications

To trigger manually:
- Go to **Actions** tab → **Scrape Shopify Apps (Weekly)** → **Run workflow**

### Railway Deployment

1. Create account at [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub** → select `shopify-scraper`
3. Railway auto-detects `Dockerfile` and `railway.toml`
4. Add environment variables in Railway dashboard if needed
5. Railway provides a public URL (optional — scraper runs on a schedule via GitHub Actions)

For a persistent API + Web UI on Railway:
1. Add a `backend/` (FastAPI) and `frontend/` (React) to the project
2. Update `Dockerfile` to run the API server instead
3. Railway will host and scale automatically

---

## Data Output

| Field | Type | Description |
|-------|------|-------------|
| `category_url` | string | Source category page URL |
| `category_url_clean` | string | Category URL without query params |
| `page` | int | Listing page number |
| `handle` | string | App unique identifier |
| `name` | string | App display name |
| `app_url` | string | App page URL |
| `icon_url` | string/null | App icon URL |
| `rating` | float/null | Rating (1–5) |
| `review_count` | int/null | Number of reviews |
| `has_free_plan_text` | bool/null | Free plan available |
| `pricing_text` | string/null | Price description |
| `short_description` | string/null | Brief app description |
| `built_for_shopify` | bool | Shopify official certified |
| `is_ad` | bool | Promoted/ad listing |
| `scraped_at` | string | ISO 8601 scrape timestamp |

---

## Default Categories Scraped

1. Search and Filters
2. Sales Channels
3. Product Reviews
4. Email Marketing
5. SEO
6. Upsell and Cross-sell
7. Shipping Solutions
8. Currency and Translation

---

## Roadmap

> Current status: not started — see [Implementation Order](#implementation-order) below.

### Vision

Automate the full pipeline: **scrape → backup → sync → display**, so the frontend always reflects the latest data and users can see scrape history at a glance.

---

### Phase 1 — Historical CSV Backups `[not started]`

After each scrape, save the full CSV with a timestamped filename instead of overwriting the same file.

**Changes:**
- `scrape.py` — add `--backup-dir` flag (default: `data/backups/`). After completing a run, copy the output CSV to `data/backups/scrapes/YYYY-MM-DD_HHMMSS_shopify_apps_all_categories.csv`.
- `.gitignore` — add `data/backups/` so the folder is never committed.
- `.github/workflows/scrape.yml` — pass `BACKUP_DIR=data/backups` env var through.

---

### Phase 2 — Scrape Log Table `[not started]`

Track every scrape run in the database so the frontend can show history.

**Schema — new table `scrape_runs`:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | |
| `run_at` | TIMESTAMPTZ | When the scrape started |
| `finished_at` | TIMESTAMPTZ | When the scrape finished |
| `total_apps_scraped` | INT | Number of rows in this run |
| `categories_scraped` | INT | Number of categories hit |
| `status` | VARCHAR | `success`, `failed`, `partial` |
| `error_message` | TEXT | Error details if failed |
| `csv_filename` | VARCHAR | Filename in backups dir |
| `is_latest` | BOOL | True for the most recent run |

---

### Phase 3 — Database Sync Step in GitHub Actions `[not started]`

After the scraper finishes, run the CSV import into Neon PostgreSQL.

**Changes:**
- `.github/workflows/scrape.yml` — add a new step after "Run scraper" calling `python backend/import_data.py`.
- `backend/import_data.py` — extend to: (a) insert a `scrape_runs` record, (b) import apps, (c) mark all previous runs as `is_latest=false`, (d) mark this run as `is_latest=true`. Wrap in a transaction so it's atomic.
- `.env.example` — add `DATABASE_URL` template. Add it as a GitHub Actions secret in repo settings.

**Sync logic:**
- Match apps by `handle` (upsert — insert new, update existing)
- Match categories by slug (upsert)
- For `app_listings`: delete all rows for categories in this scrape, then re-insert

---

### Phase 4 — Scrape Record Page `[not started]`

A new `/scrape-history` page showing the log of all scrape runs.

**UI Elements:**
- **Header card** — "Latest scrape: Apr 21 2026, 00:00 UTC — 3,030 apps across 8 categories — Success"
- **Status badge** — Green/Yellow/Red based on `status`
- **Scrape History table** — Columns: Date, Duration, Apps, Categories, Status. Clickable rows to drill into a specific run.
- **Manual trigger button** — Button that POSTs to a GitHub Actions `workflow_dispatch` trigger

**New API endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scrape-runs` | GET | List all scrape runs, paginated |
| `/api/scrape-runs/latest` | GET | Get the most recent run |
| `/api/scrape-runs/{id}/apps` | GET | Get apps from a specific run |

---

### Phase 5 — Home Page Redesign `[not started]`

Replace the current stats dashboard with a richer status overview.

```
┌─────────────────────────────────────────────────────────┐
│  🏠  Shopify App Explorer                   [Status ●]  │
├─────────────────────────────────────────────────────────┤
│  Latest Scrape: Sunday Apr 19 2026 · 3,030 apps         │
│  [View History]  [Run Now]                             │
├────────────────┬────────────────────────────────────────┤
│  Total Apps    │  Categories Tracked                   │
│  3,030         │  8                                    │
├────────────────┴────────────────────────────────────────┤
│  Quick Search: [________________] [Search Apps]         │
├─────────────────────────────────────────────────────────┤
│  Categories                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Search & Fil │ │ Sales Channel│ │ Product Rev  │    │
│  │ 382 apps     │ │ 415 apps     │ │ 295 apps     │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Changes:**
- `frontend/src/pages/Home.jsx` — fetch latest run from `/api/scrape-runs/latest` and category counts from `/api/stats`
- `frontend/src/App.jsx` — add route for `/scrape-history`
- `frontend/src/api.js` — add `getScrapeRuns()`, `getLatestRun()`, `triggerScrape()`

---

### Phase 6 — "Last Updated" Badges `[not started]`

Show when the app data was last scraped.

- `AppList.jsx` — show "Data from Apr 19 2026" banner at the top using `is_latest` run info
- `AppDetail.jsx` — add "Last scraped: Apr 19 2026" on the app detail card

---

### Implementation Order

```
Phase 1  → scrape.py backup + .gitignore      (standalone, no DB)
Phase 2  → new scrape_runs table + model      (schema only)
Phase 3  → import_data.py extension + workflow (connects GitHub → DB)
Phase 4  → new API endpoints + /scrape-history page  (frontend)
Phase 5  → Home page redesign                 (frontend)
Phase 6  → "last updated" badges               (frontend)
```

---

### Architecture

```
Shopify App Store
      │ (scrape)
      ▼
GitHub Actions (Weekly Cron)
  ├─ scrape.py → CSV
  ├─ copy to data/backups/YYYY-MM-DD_*.csv   ← Phase 1
  └─ import_data.py → Neon PostgreSQL         ← Phase 3
                    │
                    ▼
               Neon PostgreSQL
                    │
                    ▼
            FastAPI Backend (port 8001)
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  /api/apps   /api/scrape-runs  /api/stats
                    │
                    ▼
            React Frontend
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
   AppList    ScrapeHistory      Home
```
