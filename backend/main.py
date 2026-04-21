from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import crud
import schemas
from database import get_db

app = FastAPI(title="Shopify Apps API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
