from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, nullsfirst, nullslast
from typing import Optional, List
import models
import schemas


def get_categories(db: Session) -> List[schemas.CategoryResponse]:
    categories = db.query(models.Category).order_by(models.Category.name).all()
    return [schemas.CategoryResponse.model_validate(cat) for cat in categories]


def get_category_by_slug(db: Session, slug: str) -> Optional[models.Category]:
    return db.query(models.Category).filter(models.Category.slug == slug).first()


def get_apps(
    db: Session,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "rating",
    free_only: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> schemas.AppListResponse:
    query = db.query(models.App).options(joinedload(models.App.listings).joinedload(models.AppListing.category))
    
    # 分类筛选
    if category:
        cat = get_category_by_slug(db, category)
        if cat:
            query = query.join(models.AppListing).filter(
                models.AppListing.category_id == cat.id
            )
    
    # 搜索
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (models.App.name.ilike(search_term)) |
            (models.App.short_description.ilike(search_term))
        )
    
    # 免费计划筛选
    if free_only:
        query = query.filter(models.App.has_free_plan == True)
    
    # 排序 (NULL values go to the end)
    if sort == "rating":
        query = query.order_by(nullslast(desc(models.App.rating)))
    elif sort == "reviews":
        query = query.order_by(nullslast(desc(models.App.review_count)))
    elif sort == "name":
        query = query.order_by(models.App.name.asc())
    elif sort == "newest":
        query = query.order_by(nullslast(desc(models.App.created_at)))
    else:
        query = query.order_by(nullslast(desc(models.App.rating)))
    
    # 总数
    total = query.count()
    
    # 分页
    offset = (page - 1) * page_size
    apps = query.offset(offset).limit(page_size).all()
    
    # 构建响应
    items = []
    for app in apps:
        # 获取主分类URL
        category_url_clean = None
        categories = []
        is_ad = False
        if app.listings:
            first_listing = app.listings[0]
            if first_listing.category:
                category_url_clean = first_listing.category.url
                categories = [listing.category.name for listing in app.listings if listing.category]
            is_ad = first_listing.is_ad
        
        item = schemas.AppResponse(
            id=app.id,
            handle=app.handle,
            name=app.name,
            app_url=app.app_url,
            icon_url=app.icon_url,
            rating=app.rating,
            review_count=app.review_count,
            has_free_plan=app.has_free_plan,
            pricing_text=app.pricing_text,
            short_description=app.short_description,
            built_for_shopify=app.built_for_shopify,
            category_url_clean=category_url_clean,
            categories=categories,
            is_ad=is_ad,
            created_at=app.created_at,
            updated_at=app.updated_at,
        )
        items.append(item)
    
    total_pages = (total + page_size - 1) // page_size
    
    return schemas.AppListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def get_app_by_handle(db: Session, handle: str) -> Optional[schemas.AppResponse]:
    app = db.query(models.App).options(
        joinedload(models.App.listings).joinedload(models.AppListing.category)
    ).filter(models.App.handle == handle).first()
    
    if not app:
        return None
    
    categories = [
        listing.category.name 
        for listing in app.listings 
        if listing.category
    ]
    
    return schemas.AppResponse(
        id=app.id,
        handle=app.handle,
        name=app.name,
        app_url=app.app_url,
        icon_url=app.icon_url,
        rating=app.rating,
        review_count=app.review_count,
        has_free_plan=app.has_free_plan,
        pricing_text=app.pricing_text,
        short_description=app.short_description,
        built_for_shopify=app.built_for_shopify,
        categories=categories,
        created_at=app.created_at,
        updated_at=app.updated_at,
    )


def get_stats(db: Session) -> schemas.StatsResponse:
    total_apps = db.query(models.App).count()
    total_categories = db.query(models.Category).count()
    apps_with_free_plan = db.query(models.App).filter(
        models.App.has_free_plan == True
    ).count()
    built_for_shopify = db.query(models.App).filter(
        models.App.built_for_shopify == True
    ).count()
    
    avg_rating = db.query(func.avg(models.App.rating)).scalar()
    total_reviews = db.query(func.sum(models.App.review_count)).scalar() or 0
    
    # Top rated apps
    top_apps = db.query(models.App).order_by(
        desc(models.App.rating)
    ).limit(5).all()
    
    top_rated_apps = [
        schemas.AppResponse(
            id=app.id,
            handle=app.handle,
            name=app.name,
            app_url=app.app_url,
            icon_url=app.icon_url,
            rating=app.rating,
            review_count=app.review_count,
            has_free_plan=app.has_free_plan,
            pricing_text=app.pricing_text,
            short_description=app.short_description,
            built_for_shopify=app.built_for_shopify,
            categories=[],
        )
        for app in top_apps
    ]
    
    return schemas.StatsResponse(
        total_apps=total_apps,
        total_categories=total_categories,
        apps_with_free_plan=apps_with_free_plan,
        built_for_shopify=built_for_shopify,
        total_reviews=int(total_reviews),
        avg_rating=float(avg_rating) if avg_rating else None,
        top_rated_apps=top_rated_apps,
    )
