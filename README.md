# Shopify App Store Scraper

[![Live](https://img.shields.io/badge/Live-Railway-4B44CC?logo=railway)](https://shopify-scraper-production-038d.up.railway.app)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Weekly%20Scrape-Green?logo=github)](https://github.com/WilliamWu125/Ingredient-Demo/actions)

**Live at:** [https://shopify-scraper-production-038d.up.railway.app](https://shopify-scraper-production-038d.up.railway.app)

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

The app is deployed at **[https://shopify-scraper-production-038d.up.railway.app](https://shopify-scraper-production-038d.up.railway.app)** via Railway.

#### Redeploying (CLI)

```bash
railway login
railway link
railway up --detach
```

Railway auto-detects `Dockerfile` and `railway.toml` and handles the full build + deploy pipeline.

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `PORT` | Server port (default: `8001`) |
| `VITE_API_URL` | Public Railway URL for API calls |

#### Local Development

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

> Current status: **All phases 1–6 complete** — see [Implementation Order](#implementation-order) below.

### Vision

Automated weekly scrape that commits clean CSV snapshots to GitHub, with a full history preserved via timestamped backups. The pipeline is self-contained (no external storage), easy to audit, and GitHub-native.

---

### Phase 1 — CSV Tracking + Backup `[complete]`

Fix git tracking, improve the diff check, and add timestamped backups.

**Changes:**
- Add `data/` to git and commit the current `shopify_apps_all_categories.csv`
- `.gitignore` — keep `data/` tracked, only exclude `data/backups/`
- `scrape.py` — add `--backup-dir` flag. After each run, copy the output CSV to `data/backups/YYYY-MM-DD_HHMMSS_shopify_apps_all_categories.csv`
- `.github/workflows/scrape.yml` — fix the diff check to compare row counts instead of `git diff --stat | grep "shopify_apps"`

**Backup naming:** `data/backups/2026-04-21_001530_shopify_apps_all_categories.csv`

---

### Phase 2 — Scrape Log Table `[complete]`

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
| `csv_sha` | VARCHAR | Git SHA of the committed CSV |
| `is_latest` | BOOL | True for the most recent run |

---

### Phase 3 — Scrape Record Page `[complete]`

A `/scrape-history` page showing the log of all scrape runs.

**UI Elements:**
- **Header card** — "Latest scrape: Apr 21 2026, 18:28 UTC — 3,260 apps across 8 categories — Success"
- **Status badge** — Green/Yellow/Red based on `status`
- **Scrape History table** — Columns: Date, Duration, Apps, Categories, Status. Clickable rows to drill into a specific run.
- **Manual trigger button** — Button that POSTs to a GitHub Actions `workflow_dispatch` trigger

---

### Phase 4 — Home Page Redesign `[complete]`

Replace the current stats dashboard with a richer status overview.

```
┌────────────────────────────────────────────────────────────┐
│  Discover the Best Shopify Apps                             │
│  Browse through 3,260+ apps from the Shopify App Store...  │
│  [ Browse All Apps ]                                        │
├────────────────────────────────────────────────────────────┤
│  ● Latest scrape: Apr 21 2026, 18:28 UTC — 3,260 apps      │
│    across 8 categories — Success          [View History]   │
├────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 3,260    │  │ 1,820    │  │ 247      │  │ 4.2      │  │
│  │ Total    │  │ Free     │  │ Built for│  │ Avg      │  │
│  │ Apps     │  │ Plans     │  │ Shopify  │  │ Rating   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Changes:**
- `frontend/src/pages/Home.jsx` — hero section, colored scrape status banner (green/yellow/red), stats grid (Total Apps, Free Plans, Built for Shopify, Avg Rating), `/scrape-history` nav link
- `frontend/src/App.jsx` — added route for `/scrape-history`
- `frontend/src/api.js` — added `getScrapeRuns()`, `getLatestRun()`, `triggerScrape()`

---

### Phase 5 — "Last Updated" Badges `[complete]`

Show when the app data was last scraped.

- `AppList.jsx` — show "Data from Apr 21 2026" banner at the top using `is_latest` run info
- `AppDetail.jsx` — add "Last scraped: Apr 21 2026" on the app detail card

---

### Phase 6 — Sync to Neon `[complete]`

The scraped CSV data is synced to Neon PostgreSQL for the web UI. The Railway-deployed FastAPI backend reads from Neon, enabling the React frontend to query and filter 3,260+ apps in real time.

**Changes:**
- `backend/database.py` — reads `DATABASE_URL` from environment (Neon connection string)
- `backend/import_data.py` — upserts apps into Neon, marks `is_latest` on `scrape_runs`
- `.github/workflows/scrape.yml` — added step calling `python backend/import_data.py` after commit

---

### Implementation Order

```
Phase 1  → CSV tracking + backup                 ✓ complete
Phase 2  → ScrapeRun schema + API endpoints     ✓ complete
Phase 3  → ScrapeHistory page + nav link         ✓ complete
Phase 4  → Home page redesign + scrape status    ✓ complete
Phase 5  → "last updated" banners               ✓ complete
Phase 6  → Sync to Neon                        ✓ complete
```

---

### Architecture

```
Shopify App Store
      │ (scrape)
      ▼
GitHub Actions (Weekly Cron)
  ├─ scrape.py → data/shopify_apps_all_categories.csv
  ├─ git commit + push (if row count changed)
  └─ copy to data/backups/YYYY-MM-DD_*.csv
                │
                ▼
           GitHub Repository
           (CSV source of truth)
           data/backups/ (backup CSVs local-only, .gitkeep committed)
                │
                ▼
           Neon PostgreSQL                         ← Phase 6
                │
                ▼
         FastAPI Backend (Railway, port 8001)
                │
      ┌─────────┼─────────┐
      ▼         ▼         ▼
  /api/apps /api/stats /api/scrape-runs
                │
                ▼
         React Frontend (Railway)
         https://shopify-scraper-production-038d.up.railway.app
```
