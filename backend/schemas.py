from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class CategoryBase(BaseModel):
    name: str
    slug: str
    url: str


class CategoryResponse(CategoryBase):
    id: int
    app_count: int

    class Config:
        from_attributes = True


class AppBase(BaseModel):
    handle: str
    name: str
    app_url: Optional[str] = None
    icon_url: Optional[str] = None
    rating: Optional[Decimal] = None
    review_count: int = 0
    has_free_plan: bool = False
    pricing_text: Optional[str] = None
    short_description: Optional[str] = None
    built_for_shopify: bool = False


class AppResponse(AppBase):
    id: int
    category_url_clean: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    categories: List[str] = []
    is_ad: bool = False

    class Config:
        from_attributes = True


class AppListResponse(BaseModel):
    items: List[AppResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class StatsResponse(BaseModel):
    total_apps: int
    total_categories: int
    apps_with_free_plan: int
    built_for_shopify: int
    total_reviews: int = 0
    avg_rating: Optional[float] = None
    top_rated_apps: List[AppResponse] = []
