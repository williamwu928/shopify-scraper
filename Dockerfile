# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM python:3.13-slim

WORKDIR /app

# Install system deps for psycopg2 (needs libpq-dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files (includes backend/requirements.txt)
COPY . .

# Install backend-specific deps after backend/ is present
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy built frontend (from Stage 1)
COPY --from=frontend-build /frontend/dist ./frontend/dist

# Data directory
RUN mkdir -p /app/data

# Expose Railway's injected PORT (default 8001)
ENV PORT=8001
EXPOSE 8001

# Run the FastAPI server — it serves both the API and the React frontend
WORKDIR /app/backend
CMD ["python", "-c", "\
import uvicorn; \
import sys; \
sys.path.insert(0, '/app'); \
from backend.main import app; \
uvicorn.run(app, host='0.0.0.0', port=8001, proxy_headers=True, trusted_hosts='*')"]
