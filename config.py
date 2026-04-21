"""
Centralized configuration for the Shopify scraper.
All settings are driven by environment variables (with sensible defaults).
No hardcoded values — everything configurable.
"""

from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

import os


# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.resolve()
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", BASE_DIR / "data"))
OUTPUT_DIR.mkdir(exist_ok=True)
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", OUTPUT_DIR / "backups"))


# ─── Scraping defaults ─────────────────────────────────────────────────────────

MIN_DELAY = float(os.getenv("MIN_DELAY", "0.7"))
MAX_DELAY = float(os.getenv("MAX_DELAY", "1.6"))
MAX_PAGES = int(os.getenv("MAX_PAGES", "200"))
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "6"))

# ─── GitHub (for auto-commit workflow) ────────────────────────────────────────

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# ─── Notifications ─────────────────────────────────────────────────────────────

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")


# ─── Default categories to scrape ───────────────────────────────────────────────

DEFAULT_CATEGORIES = [
    "https://apps.shopify.com/categories/store-design-search-and-navigation-search-and-filters/all",
    "https://apps.shopify.com/categories/sales-channels-selling-online-marketplaces/all",
    "https://apps.shopify.com/categories/marketing-and-conversion-social-trust-product-reviews/all",
    "https://apps.shopify.com/categories/marketing-and-conversion-marketing-email-marketing/all?surface_detail=marketing-and-conversion-marketing-email-marketing&surface_inter_position=2&surface_type=category&surface_version=redesign",
    "https://apps.shopify.com/categories/store-design-site-optimization-seo/all",
    "https://apps.shopify.com/categories/marketing-and-conversion-upsell-and-bundles-upsell-and-cross-sell/all?surface_detail=marketing-and-conversion-upsell-and-bundles&surface_type=category",
    "https://apps.shopify.com/categories/orders-and-shipping-shipping-solutions-shipping/all",
    "https://apps.shopify.com/categories/store-design-internationalization-currency-and-translation/all",
]


@dataclass
class ScraperConfig:
    min_delay: float = MIN_DELAY
    max_delay: float = MAX_DELAY
    max_pages: int = MAX_PAGES
    request_timeout: int = REQUEST_TIMEOUT
    max_retries: int = MAX_RETRIES
    output_dir: Path = OUTPUT_DIR
    backup_dir: Path = BACKUP_DIR
    default_categories: list = None

    def __post_init__(self):
        if self.default_categories is None:
            self.default_categories = DEFAULT_CATEGORIES
