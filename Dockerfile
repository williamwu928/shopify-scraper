FROM python:3.13-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Data directory
RUN mkdir -p /app/data

# Default: run the scraper (override in Railway for API)
CMD ["python", "scrape.py", "--out", "data/shopify_apps_all_categories.csv", "--dedupe-global"]
