#!/usr/bin/env python3
"""
Shopify App Store scraper — production-ready edition.

Usage:
    # Scrape all default categories
    python scrape.py --out data/all_categories.csv

    # Scrape specific categories
    python scrape.py --url "https://apps.shopify.com/categories/..." --out data/output.csv

    # Dry-run (fetch first page of each category only)
    python scrape.py --out data/output.csv --dry-run

    # Override delays from env or .env
    python scrape.py --out data/output.csv --min-delay 1.0 --max-delay 2.0

Environment variables (see .env.example):
    MIN_DELAY, MAX_DELAY, MAX_PAGES, REQUEST_TIMEOUT, MAX_RETRIES,
    OUTPUT_DIR, GITHUB_TOKEN, DISCORD_WEBHOOK_URL
"""

import argparse
import csv
import logging
import random
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse, urlunparse, urlencode, parse_qs

import requests
from bs4 import BeautifulSoup, Tag

from config import (
    DEFAULT_CATEGORIES,
    MIN_DELAY,
    MAX_DELAY,
    MAX_PAGES,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    OUTPUT_DIR,
    ScraperConfig,
)

# ─── Logging setup ─────────────────────────────────────────────────────────────

log = logging.getLogger("shopify_scraper")


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


# ─── Data model ────────────────────────────────────────────────────────────────

@dataclass
class AppListing:
    category_url: str
    category_url_clean: str
    page: int
    handle: str
    name: str
    app_url: str
    icon_url: Optional[str]
    rating: Optional[float]
    review_count: Optional[int]
    has_free_plan_text: Optional[bool]
    pricing_text: Optional[str]
    short_description: Optional[str]
    built_for_shopify: bool
    is_ad: bool
    scraped_at: str = ""  # filled in at write time

    def __post_init__(self):
        if not self.scraped_at:
            self.scraped_at = datetime.utcnow().isoformat() + "Z"


# ─── Helpers ───────────────────────────────────────────────────────────────────

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]


def with_page(url: str, page: int) -> str:
    parsed = urlparse(url)
    q = parse_qs(parsed.query)
    q["page"] = [str(page)]
    new_query = urlencode(q, doseq=True)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))


def strip_query(url: str) -> str:
    p = urlparse(url)
    return urlunparse((p.scheme, p.netloc, p.path, "", "", ""))


def normalize_app_url(app_url: str) -> str:
    p = urlparse(app_url)
    return urlunparse((p.scheme, p.netloc, p.path, "", "", ""))


# ─── HTTP layer ────────────────────────────────────────────────────────────────

def request_html(
    session: requests.Session,
    url: str,
    timeout: int = REQUEST_TIMEOUT,
    max_retries: int = MAX_RETRIES,
) -> str:
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            headers = {
                "User-Agent": random.choice(USER_AGENTS),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
            }
            resp = session.get(url, headers=headers, timeout=timeout)

            if resp.status_code == 429:
                backoff = min(60, 2 ** attempt) + random.random()
                log.warning("Rate-limited (%d). Retrying in %.1fs (attempt %d/%d)", resp.status_code, backoff, attempt, max_retries)
                time.sleep(backoff)
                continue

            resp.raise_for_status()
            return resp.text

        except requests.exceptions.Timeout:
            last_err = f"Timeout after {timeout}s"
            log.warning("Request timeout for %s (attempt %d/%d)", url, attempt, max_retries)

        except requests.exceptions.HTTPError as e:
            last_err = e
            if e.response is not None and e.response.status_code >= 500:
                log.warning("Server error %d for %s (attempt %d/%d)", e.response.status_code, url, attempt, max_retries)
            else:
                raise

        except Exception as e:
            last_err = e
            log.warning("Request failed for %s: %s (attempt %d/%d)", url, e, attempt, max_retries)

        if attempt < max_retries:
            backoff = min(60, 2 ** attempt) + random.random()
            time.sleep(backoff)

    raise RuntimeError(f"Failed to fetch {url} after {max_retries} attempts: {last_err}")


# ─── Parsing ───────────────────────────────────────────────────────────────────

def parse_rating_and_reviews(card: Tag) -> Tuple[Optional[float], Optional[int], Optional[str]]:
    rating, review_count, pricing_text = None, None, None
    meta_divs = card.find_all("div")
    target = None

    for d in meta_divs:
        txt = d.get_text(" ", strip=True)
        if re.search(r"\(\s*[\d,]+\s*\)", txt) and re.search(r"^\d\.\d", txt):
            target = d
            break

    if not target:
        for d in meta_divs:
            txt = d.get_text(" ", strip=True)
            if re.search(r"\(\s*[\d,]+\s*\)", txt):
                target = d
                break

    if target:
        txt = target.get_text(" ", strip=True)
        m_rating = re.search(r"(\d\.\d)", txt)
        if m_rating:
            try:
                rating = float(m_rating.group(1))
            except ValueError:
                rating = None

        m_reviews = re.search(r"\(\s*([\d,]+)\s*\)", txt)
        if m_reviews:
            try:
                review_count = int(m_reviews.group(1).replace(",", ""))
            except ValueError:
                review_count = None

        parts = [p.strip() for p in txt.split("•")]
        if len(parts) >= 2:
            pricing_text = parts[-1].strip() or None

    return rating, review_count, pricing_text


def detect_built_for_shopify(card: Tag) -> bool:
    return "Built for Shopify" in card.get_text(" ", strip=True)


def detect_is_ad(card: Tag) -> bool:
    for el in card.find_all(["span", "button", "div"]):
        if el.get_text(" ", strip=True) == "Ad":
            return True
    parent = card
    for _ in range(4):
        if not isinstance(parent, Tag):
            break
        if parent.has_attr("data-ads-waypoint"):
            return True
        parent = parent.parent
    return False


def parse_app_cards(html: str, base_url: str, page: int, category_url: str) -> List[AppListing]:
    soup = BeautifulSoup(html, "lxml")
    cards = soup.find_all(attrs={"data-controller": "app-card"})
    log.debug("  Page %d: found %d app cards", page, len(cards))

    results: List[AppListing] = []
    category_url_clean = strip_query(category_url)
    now = datetime.utcnow().isoformat() + "Z"

    for card in cards:
        handle = card.get("data-app-card-handle-value") or ""
        name = card.get("data-app-card-name-value") or ""

        app_url = card.get("data-app-card-app-link-value") or ""
        if not app_url:
            a = card.find("a", href=True)
            if a:
                app_url = a["href"]

        app_url = urljoin(base_url, app_url)

        icon_url = card.get("data-app-card-icon-url-value")
        if not icon_url:
            img = card.find("img", src=True)
            if img:
                icon_url = img.get("src")

        rating, review_count, pricing_text = parse_rating_and_reviews(card)

        has_free_plan_text = None
        if pricing_text is not None:
            has_free_plan_text = "Free plan" in pricing_text

        short_description = None
        for d in card.find_all("div", class_=lambda c: c and "tw-text-body-xs" in c):
            t = d.get_text(" ", strip=True)
            if not t:
                continue
            if re.search(r"\(\s*[\d,]+\s*\)", t) and re.search(r"^\d\.\d", t):
                continue
            if len(t) >= 10 and not re.search(r"\(\s*[\d,]+\s*\)", t):
                short_description = t
                break

        if not handle and app_url:
            p = urlparse(app_url)
            maybe = p.path.strip("/").split("/")[0]
            if maybe:
                handle = maybe

        if not name:
            a = card.find("a")
            if a:
                name = a.get_text(" ", strip=True)

        if not handle or not name or "apps.shopify.com" not in app_url:
            continue

        results.append(
            AppListing(
                category_url=category_url,
                category_url_clean=category_url_clean,
                page=page,
                handle=handle,
                name=name,
                app_url=normalize_app_url(app_url),
                icon_url=icon_url,
                rating=rating,
                review_count=review_count,
                has_free_plan_text=has_free_plan_text,
                pricing_text=pricing_text,
                short_description=short_description,
                built_for_shopify=detect_built_for_shopify(card),
                is_ad=detect_is_ad(card),
                scraped_at=now,
            )
        )

    # Deduplicate within a page
    dedup: Dict[str, AppListing] = {}
    for r in results:
        if r.handle not in dedup:
            dedup[r.handle] = r
        elif dedup[r.handle].is_ad and not r.is_ad:
            dedup[r.handle] = r

    return list(dedup.values())


# ─── Core scrape logic ─────────────────────────────────────────────────────────

def scrape_category(
    category_url: str,
    cfg: ScraperConfig,
    session: Optional[requests.Session] = None,
    dry_run: bool = False,
) -> List[AppListing]:
    base_url = "https://apps.shopify.com"
    session = session or requests.Session()
    all_rows: List[AppListing] = []
    seen_handles: set = set()
    max_pages = 1 if dry_run else cfg.max_pages

    for page in range(1, max_pages + 1):
        url = with_page(category_url, page)
        log.info("  Fetching page %d: %s", page, url)
        html = request_html(session, url)

        rows = parse_app_cards(html=html, base_url=base_url, page=page, category_url=category_url)

        if not rows:
            log.info("  No more apps found on page %d — stopping.", page)
            break

        new_rows = [r for r in rows if r.handle not in seen_handles]
        if not new_rows and not dry_run:
            log.info("  All apps on page %d already seen — stopping.", page)
            break

        for r in new_rows:
            seen_handles.add(r.handle)
            all_rows.append(r)

        log.info("  Page %d: %d apps (%d new)", page, len(rows), len(new_rows))

        if page < max_pages:
            delay = random.uniform(cfg.min_delay, cfg.max_delay)
            log.debug("  Sleeping %.1fs before next page...", delay)
            time.sleep(delay)

    return all_rows


# ─── CSV output ───────────────────────────────────────────────────────────────

def write_csv(rows: List[AppListing], out_path: str) -> None:
    template = AppListing(
        category_url="", category_url_clean="", page=0,
        handle="", name="", app_url="", icon_url=None,
        rating=None, review_count=None, has_free_plan_text=None,
        pricing_text=None, short_description=None,
        built_for_shopify=False, is_ad=False,
    )
    fieldnames = list(asdict(template).keys())

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))

    log.info("Wrote %d rows to %s", len(rows), out_path)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        description="Scrape Shopify App Store category listings.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--url", help="Single category URL")
    ap.add_argument("--urls", nargs="+", help="Multiple space-separated category URLs")
    ap.add_argument("--out", required=True, help="Output CSV path")
    ap.add_argument("--max-pages", type=int, default=MAX_PAGES, help=f"Safety cap per category (default: {MAX_PAGES})")
    ap.add_argument("--min-delay", type=float, default=MIN_DELAY, help=f"Min delay between pages in seconds (default: {MIN_DELAY})")
    ap.add_argument("--max-delay", type=float, default=MAX_DELAY, help=f"Max delay between pages in seconds (default: {MAX_DELAY})")
    ap.add_argument("--dedupe-global", action="store_true", help="Deduplicate apps globally across all categories")
    ap.add_argument("--dry-run", action="store_true", help="Fetch only the first page of each category (for testing)")
    ap.add_argument("--list-categories", action="store_true", help="Print default category URLs and exit")
    ap.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    setup_logging(verbose=args.verbose)

    if args.list_categories:
        log.info("Default categories:")
        for url in DEFAULT_CATEGORIES:
            log.info("  %s", url)
        return 0

    cfg = ScraperConfig(
        min_delay=args.min_delay,
        max_delay=args.max_delay,
        max_pages=args.max_pages,
    )

    if args.urls:
        category_urls = args.urls
    elif args.url:
        category_urls = [args.url]
    else:
        category_urls = DEFAULT_CATEGORIES

    log.info("=== Shopify Scraper started ===")
    log.info("Output: %s", args.out)
    log.info("Categories: %d", len(category_urls))
    log.info("Max pages per category: %s", "1 (dry-run)" if args.dry_run else args.max_pages)
    log.info("Delay range: %.1f–%.1f s", cfg.min_delay, cfg.max_delay)
    log.info("")

    session = requests.Session()
    all_rows: List[AppListing] = []
    global_seen: set = set()

    try:
        for idx, category_url in enumerate(category_urls, start=1):
            log.info("[%d/%d] Scraping: %s", idx, len(category_urls), category_url)

            rows = scrape_category(
                category_url=category_url,
                cfg=cfg,
                session=session,
                dry_run=args.dry_run,
            )

            if args.dedupe_global:
                filtered = [r for r in rows if r.handle not in global_seen]
                skipped = len(rows) - len(filtered)
                if skipped:
                    log.info("  Skipped %d duplicate apps (global dedup)", skipped)
                for r in filtered:
                    global_seen.add(r.handle)
                rows = filtered

            log.info("  -> %d apps collected", len(rows))
            all_rows.extend(rows)

            if idx < len(category_urls) and not args.dry_run:
                pause = random.uniform(cfg.min_delay, cfg.max_delay)
                log.info("  Pausing %.1fs before next category...", pause)
                time.sleep(pause)

    except KeyboardInterrupt:
        log.warning("Interrupted by user. Saving collected data...")
        if all_rows:
            write_csv(all_rows, args.out)
        return 130

    except Exception as e:
        log.error("Fatal error: %s", e)
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    if not all_rows:
        log.error("No apps scraped. Check your network or category URLs.")
        return 1

    write_csv(all_rows, args.out)
    log.info("")
    log.info("=== Done! Scraped %d apps from %d categories ===", len(all_rows), len(category_urls))
    return 0


if __name__ == "__main__":
    sys.exit(main())
