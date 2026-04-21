import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import csv
import re
from database import SessionLocal
from models import Category, App, AppListing


def extract_category_slug(url):
    """从 URL 中提取分类 slug"""
    match = re.search(r'categories/([^/]+)', url)
    if match:
        slug = match.group(1)
        # 清理 slug
        slug = slug.replace('-and-', '_').replace('-', '_')
        return slug
    return url


def extract_category_name(url):
    """从 URL 中提取分类名称"""
    match = re.search(r'categories/([^/]+)', url)
    if match:
        slug = match.group(1)
        # 转换为人类可读的名称
        name = slug.replace('-and-', ' & ').replace('-', ' ').replace('_', ' ')
        # 查找原始名称映射
        name_map = {
            'store design search and navigation search and filters': 'Search and Filters',
            'sales channels selling online marketplaces': 'Sales Channels',
            'marketing and conversion social trust product reviews': 'Product Reviews',
            'marketing email marketing': 'Email Marketing',
            'store design search and navigation seo': 'SEO',
            'sales operations upsell and cross sell': 'Upsell and Cross-sell',
            'shipping and delivery shipping': 'Shipping',
            'internationalization currency and translation': 'Currency and Translation',
        }
        return name_map.get(name.lower(), name.title())
    return url


def import_csv_data(csv_path):
    db = SessionLocal()
    
    try:
        # 读取 CSV
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        
        print(f"Total rows: {len(rows)}")
        
        # 第一步：收集所有分类
        categories_data = {}
        for row in rows:
            clean_url = row['category_url_clean']
            if clean_url not in categories_data:
                categories_data[clean_url] = {
                    'name': extract_category_name(clean_url),
                    'slug': extract_category_slug(clean_url),
                    'url': clean_url,
                }
        
        print(f"Found {len(categories_data)} unique categories")
        
        # 第二步：导入分类
        category_map = {}  # url -> category id
        for url, data in categories_data.items():
            existing = db.query(Category).filter(Category.url == url).first()
            if not existing:
                cat = Category(
                    name=data['name'],
                    slug=data['slug'],
                    url=data['url'],
                    app_count=0
                )
                db.add(cat)
                db.flush()
                category_map[url] = cat.id
            else:
                category_map[url] = existing.id
        
        db.commit()
        print(f"Imported {len(category_map)} categories")
        
        # 第三步：导入应用
        apps_data = {}  # handle -> app data
        for row in rows:
            handle = row['handle']
            if handle not in apps_data:
                rating = row.get('rating', '')
                apps_data[handle] = {
                    'handle': handle,
                    'name': row['name'],
                    'app_url': row.get('app_url', ''),
                    'icon_url': row.get('icon_url', ''),
                    'rating': float(rating) if rating else None,
                    'review_count': int(row['review_count']) if row.get('review_count', '').isdigit() else 0,
                    'has_free_plan': row.get('has_free_plan_text', '').lower() == 'true',
                    'pricing_text': row.get('pricing_text', ''),
                    'short_description': row.get('short_description', ''),
                    'built_for_shopify': row.get('built_for_shopify', '').lower() == 'true',
                    'categories': [],
                }
            
            # 添加分类关联
            clean_url = row['category_url_clean']
            if clean_url in category_map:
                apps_data[handle]['categories'].append({
                    'category_id': category_map[clean_url],
                    'page': int(row['page']) if row.get('page', '').isdigit() else 1,
                    'is_ad': row.get('is_ad', '').lower() == 'true',
                })
        
        print(f"Found {len(apps_data)} unique apps")
        
        # 导入应用和关联
        for handle, data in apps_data.items():
            existing = db.query(App).filter(App.handle == handle).first()
            if not existing:
                app = App(
                    handle=data['handle'],
                    name=data['name'],
                    app_url=data['app_url'],
                    icon_url=data['icon_url'],
                    rating=data['rating'],
                    review_count=data['review_count'],
                    has_free_plan=data['has_free_plan'],
                    pricing_text=data['pricing_text'],
                    short_description=data['short_description'],
                    built_for_shopify=data['built_for_shopify'],
                )
                db.add(app)
                db.flush()
                app_id = app.id
            else:
                app_id = existing.id
            
            # 添加分类关联
            for cat_data in data['categories']:
                existing_listing = db.query(AppListing).filter(
                    AppListing.app_id == app_id,
                    AppListing.category_id == cat_data['category_id']
                ).first()
                if not existing_listing:
                    listing = AppListing(
                        app_id=app_id,
                        category_id=cat_data['category_id'],
                        page=cat_data['page'],
                        is_ad=cat_data['is_ad'],
                    )
                    db.add(listing)
        
        db.commit()
        print(f"Imported {len(apps_data)} apps")
        
        # 第四步：更新分类的 app_count
        for cat_id in category_map.values():
            count = db.query(AppListing).filter(AppListing.category_id == cat_id).count()
            cat = db.query(Category).get(cat_id)
            if cat:
                cat.app_count = count
        
        db.commit()
        print("Updated category app counts")
        
        # 输出统计
        print("\n=== Import Summary ===")
        print(f"Categories: {db.query(Category).count()}")
        print(f"Apps: {db.query(App).count()}")
        print(f"Listings: {db.query(AppListing).count()}")
        print(f"Apps with free plan: {db.query(App).filter(App.has_free_plan == True).count()}")
        print(f"Built for Shopify: {db.query(App).filter(App.built_for_shopify == True).count()}")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'shopify_apps_all_categories.csv')
    import_csv_data(csv_path)
