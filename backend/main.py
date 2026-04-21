import os
from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import crud
import schemas
from database import get_db

app = FastAPI(title="Shopify Apps API", version="1.0.0")

# ── API Key Authentication ────────────────────────────────────────────────────
_API_KEY = os.getenv("API_KEY")


def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Dependency to verify API key for protected endpoints."""
    if not _API_KEY:
        raise ValueError("API_KEY environment variable is not configured on the server.")
    if x_api_key != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# ── CORS ──────────────────────────────────────────────────────────────────────
_railway_url = os.getenv("RAILWAY_PUBLIC_URL", "")
_allowed_origins = [_railway_url, "http://localhost:5173", "http://localhost:3000"]
_allowed_origins = [o for o in _allowed_origins if o]

if not _allowed_origins:
    raise ValueError(
        "No allowed origins configured. Set RAILWAY_PUBLIC_URL or add frontend URLs."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ─────────────────────────────────────────────────────────────────

@app.get("/api/categories", response_model=list[schemas.CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return crud.get_categories(db)


@app.get("/api/categories/{slug}", response_model=schemas.CategoryResponse)
def get_category(slug: str, db: Session = Depends(get_db)):
    category = crud.get_category_by_slug(db, slug)
    if not category:
        return {"error": "Category not found"}
    return schemas.CategoryResponse.model_validate(category)


@app.get("/api/apps", response_model=schemas.AppListResponse)
def list_apps(
    category: Optional[str] = Query(None, description="Filter by category slug"),
    search: Optional[str] = Query(None, description="Search in name or description"),
    sort: Optional[str] = Query("rating", description="Sort by: rating, reviews, name, newest"),
    free_only: bool = Query(False, description="Only show apps with free plan"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=5000, description="Items per page"),
    db: Session = Depends(get_db),
):
    return crud.get_apps(
        db, category=category, search=search, sort=sort,
        free_only=free_only, page=page, page_size=limit
    )


@app.get("/api/apps/{handle}", response_model=schemas.AppResponse)
def get_app(handle: str, db: Session = Depends(get_db)):
    app = crud.get_app_by_handle(db, handle)
    if not app:
        return {"error": "App not found"}
    return app


@app.get("/api/stats", response_model=schemas.StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    return crud.get_stats(db)


@app.post("/api/scrape-runs", response_model=schemas.ScrapeRunResponse, status_code=201)
def create_scrape_run(data: schemas.ScrapeRunCreate, db: Session = Depends(get_db), _auth: str = Depends(verify_api_key)):
    return crud.create_scrape_run(db, data)


@app.get("/api/scrape-runs", response_model=schemas.ScrapeRunListResponse)
def list_scrape_runs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return crud.get_scrape_runs(db, page=page, page_size=limit)


@app.get("/api/scrape-runs/latest", response_model=schemas.ScrapeRunResponse)
def get_latest_scrape_run(db: Session = Depends(get_db)):
    run = crud.get_latest_scrape_run(db)
    if not run:
        raise HTTPException(status_code=404, detail="No scrape runs found")
    return run


@app.delete("/api/scrape-runs/{run_id}", status_code=204)
def delete_scrape_run(run_id: int, db: Session = Depends(get_db), _auth: str = Depends(verify_api_key)):
    deleted = crud.delete_scrape_run(db, run_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scrape run not found")


@app.get("/api/scrape-runs/{run_id}", response_model=schemas.ScrapeRunResponse)
def get_scrape_run(run_id: int, db: Session = Depends(get_db)):
    run = crud.get_scrape_run_by_id(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Scrape run not found")
    return schemas.ScrapeRunResponse.model_validate(run)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# ── Frontend static files ──────────────────────────────────────────────────────
# Mount the built React app at /frontend/dist
_frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")), name="assets")


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """
    SPA fallback: serve index.html for any non-API route.
    This lets React Router handle client-side routing.
    """
    _index = os.path.join(_frontend_dist, "index.html")
    if os.path.isfile(_index):
        return FileResponse(_index)
    return {"error": "Frontend not built yet"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
