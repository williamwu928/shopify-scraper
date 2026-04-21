#!/usr/bin/env python3
"""
Shopify App Store category scraper (works with the Turbo-frame HTML you shared)

What it does
- Crawls one OR MANY Shopify App Store category "all" listings
- Paginates through ?page=1,2,3...
- Extracts app cards from the server-rendered HTML (no JS/browser needed)
- Outputs a CSV with one row per app listing (includes which category URL it came from)

You can use it in two ways:

1) Single category (original behavior):
   python shopify_appstore_category_scrape.py \
     --url "https://apps.shopify.com/categories/marketing-and-conversion-social-trust-product-reviews/all" \
     --out product_reviews_apps.csv

2) Multiple categories (NEW):
   python shopify_appstore_category_scrape.py \
     --urls \
       "https://apps.shopify.com/categories/store-design-search-and-navigation-search-and-filters/all" \
       "https://apps.shopify.com/categories/sales-channels-selling-online-marketplaces/all" \
       ... \
     --out all_categories_apps.csv

Notes
- Shopify may rate-limit; this script adds a small delay + retries.
- “Ads” are inferred by presence of an "Ad" badge near the card (best-effort).
- Query params like surface_* are kept for fetching, but we also store a "category_url_clean" (no query) for grouping.
"""

import argparse
import csv
import random
import re
import time
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse, urlunparse, urlencode, parse_qs

import requests
from bs4 import BeautifulSoup, Tag


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


USER_AGENTS = [
    # A few realistic UAs; rotate lightly.
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]


def with_page(url: str, page: int) -> str:
    """Return url with ?page=<page> preserved alongside other query params."""
    parsed = urlparse(url)
    q = parse_qs(parsed.query)
    q["page"] = [str(page)]
    new_query = urlencode(q, doseq=True)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))


def strip_query(url: str) -> str:
    """Return URL without query/fragment (stable for grouping)."""
    p = urlparse(url)
    return urlunparse((p.scheme, p.netloc, p.path, "", "", ""))


def normalize_app_url(app_url: str) -> str:
    """Strip tracking query params to a stable canonical-ish URL."""
    p = urlparse(app_url)
    return urlunparse((p.scheme, p.netloc, p.path, "", "", ""))


def request_html(session: requests.Session, url: str, timeout: int = 30, max_retries: int = 6) -> str:
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
                backoff = min(30, 2 ** attempt) + random.random()
                time.sleep(backoff)
                continue

            resp.raise_for_status()
            return resp.text
        except Exception as e:
            last_err = e
            backoff = min(30, 2 ** attempt) + random.random()
            time.sleep(backoff)

    raise RuntimeError(f"Failed to fetch {url}: {last_err}")


def parse_rating_and_reviews(card: Tag) -> Tuple[Optional[float], Optional[int], Optional[str]]:
    """
    Best-effort parsing from the card metadata row that looks like:
      4.9 [star] (933) • Free plan available
    """
    rating = None
    review_count = None
    pricing_text = None

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
    txt = card.get_text(" ", strip=True)
    return "Built for Shopify" in txt


def detect_is_ad(card: Tag) -> bool:
    for el in card.find_all(["span", "button", "div"]):
        t = el.get_text(" ", strip=True)
        if t == "Ad":
            return True

    parent = card
    for _ in range(0, 4):
        if not isinstance(parent, Tag):
            break
        if parent.has_attr("data-ads-waypoint"):
            return True
        parent = parent.parent

    return False


def parse_app_cards(html: str, base_url: str, page: int, category_url: str) -> List[AppListing]:
    soup = BeautifulSoup(html, "lxml")
    cards = soup.find_all(attrs={"data-controller": "app-card"})

    results: List[AppListing] = []
    category_url_clean = strip_query(category_url)

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
            has_free_plan_text = ("Free plan" in pricing_text)

        short_description = None
        body_xs_divs = card.find_all("div", class_=lambda c: c and "tw-text-body-xs" in c)
        for d in body_xs_divs:
            t = d.get_text(" ", strip=True)
            if not t:
                continue
            if re.search(r"\(\s*[\d,]+\s*\)", t) and re.search(r"^\d\.\d", t):
                continue
            if len(t) >= 10 and not re.search(r"\(\s*[\d,]+\s*\)", t):
                short_description = t
                break

        bfs = detect_built_for_shopify(card)
        is_ad = detect_is_ad(card)

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
                built_for_shopify=bfs,
                is_ad=is_ad,
            )
        )

    # Deduplicate within a page by handle (Shopify can repeat via ads/surfaces)
    dedup: Dict[str, AppListing] = {}
    for r in results:
        if r.handle not in dedup:
            dedup[r.handle] = r
        else:
            if dedup[r.handle].is_ad and not r.is_ad:
                dedup[r.handle] = r

    return list(dedup.values())


def scrape_category(
    category_url: str,
    max_pages: int,
    min_delay: float,
    max_delay: float,
    session: Optional[requests.Session] = None,
) -> List[AppListing]:
    base_url = "https://apps.shopify.com"
    session = session or requests.Session()

    all_rows: List[AppListing] = []
    seen_handles: set = set()

    for page in range(1, max_pages + 1):
        url = with_page(category_url, page)
        html = request_html(session, url)

        rows = parse_app_cards(html=html, base_url=base_url, page=page, category_url=category_url)

        new_rows = [r for r in rows if r.handle not in seen_handles]
        if not rows:
            break
        if not new_rows:
            break

        for r in new_rows:
            seen_handles.add(r.handle)
            all_rows.append(r)

        time.sleep(random.uniform(min_delay, max_delay))

    return all_rows


def write_csv(rows: List[AppListing], out_path: str) -> None:
    # Stable header even if no rows
    template = AppListing(
        category_url="",
        category_url_clean="",
        page=0,
        handle="",
        name="",
        app_url="",
        icon_url=None,
        rating=None,
        review_count=None,
        has_free_plan_text=None,
        pricing_text=None,
        short_description=None,
        built_for_shopify=False,
        is_ad=False,
    )
    fieldnames = list(asdict(template).keys())

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--url",
        help="Single Shopify App Store category URL (/all listing).",
    )
    ap.add_argument(
        "--urls",
        nargs="+",
        help="Multiple category URLs. Provide space-separated quoted URLs.",
    )
    ap.add_argument("--out", required=True, help="Output CSV path")
    ap.add_argument("--max-pages", type=int, default=200, help="Safety cap for pagination per category")
    ap.add_argument("--min-delay", type=float, default=0.7, help="Minimum delay between pages (seconds)")
    ap.add_argument("--max-delay", type=float, default=1.6, help="Maximum delay between pages (seconds)")
    ap.add_argument(
        "--dedupe-global",
        action="store_true",
        help="If set, dedupe apps globally across all categories by handle (keeps first seen).",
    )
    args = ap.parse_args()

    # Your verified category URLs (defaults) if you don't pass --url or --urls
    default_urls = [
        "https://apps.shopify.com/categories/store-design-search-and-navigation-search-and-filters/all",
        "https://apps.shopify.com/categories/sales-channels-selling-online-marketplaces/all",
        "https://apps.shopify.com/categories/marketing-and-conversion-social-trust-product-reviews/all",
        "https://apps.shopify.com/categories/marketing-and-conversion-marketing-email-marketing/all?surface_detail=marketing-and-conversion-marketing-email-marketing&surface_inter_position=2&surface_type=category&surface_version=redesign",
        "https://apps.shopify.com/categories/store-design-site-optimization-seo/all",
        "https://apps.shopify.com/categories/marketing-and-conversion-upsell-and-bundles-upsell-and-cross-sell/all?surface_detail=marketing-and-conversion-upsell-and-bundles&surface_type=category",
        "https://apps.shopify.com/categories/orders-and-shipping-shipping-solutions-shipping/all",
        "https://apps.shopify.com/categories/store-design-internationalization-currency-and-translation/all",
    ]

    if args.urls:
        category_urls = args.urls
    elif args.url:
        category_urls = [args.url]
    else:
        category_urls = default_urls

    session = requests.Session()

    all_rows: List[AppListing] = []
    global_seen: set = set()

    for idx, category_url in enumerate(category_urls, start=1):
        print(f"[{idx}/{len(category_urls)}] Scraping: {category_url}")
        rows = scrape_category(
            category_url=category_url,
            max_pages=args.max_pages,
            min_delay=args.min_delay,
            max_delay=args.max_delay,
            session=session,
        )

        if args.dedupe_global:
            filtered = []
            for r in rows:
                if r.handle in global_seen:
                    continue
                global_seen.add(r.handle)
                filtered.append(r)
            rows = filtered

        print(f"  -> {len(rows)} apps")
        all_rows.extend(rows)

        # small extra pause between categories
        time.sleep(random.uniform(args.min_delay, args.max_delay))

    write_csv(all_rows, args.out)
    print(f"Saved {len(all_rows)} rows to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
