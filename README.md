# Shopify App Store Scraper

Automated scraper that collects app listings from the Shopify App Store every Sunday via GitHub Actions, with optional Railway deployment.

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
├── data/                        # Scraped CSV output
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
