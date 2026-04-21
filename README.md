# Shopify App Store 爬虫 & 数据平台

批量抓取 Shopify 应用商店分类页面的应用信息，并提供 API 和 Web UI 展示。

---

## 项目概述

| 模块 | 说明 |
|------|------|
| `scrape_shopify_reviews.py` | 爬虫脚本 - 抓取应用数据 |
| `backend/` | FastAPI 后端 - RESTful API |
| `frontend/` | React 前端 - 数据展示界面 |
| PostgreSQL | Neon 云数据库 - 数据存储 |

---

## 数据收集

### 已收集数据

| 文件 | 记录数 | 说明 |
|------|--------|------|
| `shopify_apps_all_categories.csv` | 3,030 | 8个分类的全部应用 |
| `shopify_product_reviews_apps.csv` | 295 | Product Reviews 分类详细数据 |

### 输出字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `category_url` | string | 来源分类页面 URL |
| `category_url_clean` | string | 去掉参数的分类 URL |
| `page` | int | 页码 |
| `handle` | string | App 唯一标识 |
| `name` | string | 应用名称 |
| `app_url` | string | 应用页面 URL |
| `icon_url` | string/null | 图标 URL |
| `rating` | float/null | 评分（1-5） |
| `review_count` | int/null | 评论数 |
| `has_free_plan_text` | bool/null | 是否有免费计划 |
| `pricing_text` | string/null | 价格文本 |
| `short_description` | string/null | 简短描述 |
| `built_for_shopify` | bool | 是否为 Shopify 官方认证 |
| `is_ad` | bool | 是否为广告推广 |

---

## 数据库 Schema

**PostgreSQL (Neon Cloud)**

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│   categories    │────▶│    apps     │◀────│  app_listings   │
└─────────────────┘     └─────────────┘     └─────────────────┘
```

### 表结构

**categories** - 应用分类
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| name | VARCHAR(255) | 分类名称 |
| slug | VARCHAR(255) | URL友好名称 |
| url | TEXT | 分类页面URL |
| app_count | INTEGER | 应用数量 |

**apps** - 应用主表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| handle | VARCHAR(255) | App唯一标识 |
| name | VARCHAR(255) | 应用名称 |
| app_url | TEXT | 应用主页链接 |
| icon_url | TEXT | 图标URL |
| rating | DECIMAL(2,1) | 评分(1-5) |
| review_count | INTEGER | 评论数 |
| has_free_plan | BOOLEAN | 是否有免费计划 |
| pricing_text | TEXT | 价格描述 |
| short_description | TEXT | 简短描述 |
| built_for_shopify | BOOLEAN | 官方认证 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**app_listings** - 抓取记录
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| app_id | INTEGER | FK → apps |
| category_id | INTEGER | FK → categories |
| page | INTEGER | 列表页码 |
| is_ad | BOOLEAN | 是否广告 |
| scraped_at | TIMESTAMP | 抓取时间 |

---

## API 端点

**Base URL**: `/api`

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/categories` | 分类列表（含应用数） |
| GET | `/apps` | 应用列表（支持筛选/分页） |
| GET | `/apps/{handle}` | 应用详情 |
| GET | `/stats` | 统计概览 |

### 查询参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `category` | 按分类筛选 | `category=search-filters` |
| `search` | 关键词搜索 | `search=reviews` |
| `sort` | 排序字段 | `sort=rating` |
| `free_only` | 仅免费计划 | `free_only=true` |
| `page` | 页码 | `page=1` |
| `limit` | 每页数量 | `limit=20` |

---

## 前端页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 统计概览、热门应用、分类导航 |
| 应用列表 | `/apps` | 搜索、筛选、排序、分页 |
| 应用详情 | `/apps/:handle` | 应用完整信息 |
| 分类页 | `/categories/:slug` | 分类下所有应用 |

---

## 默认抓取分类

1. 搜索和筛选 (Search and Filters)
2. 销售渠道 (Sales Channels)
3. 产品评价 (Product Reviews)
4. 邮件营销 (Email Marketing)
5. SEO 优化 (SEO)
6. 追加销售 (Upsell and Cross-sell)
7. 物流配送 (Shipping)
8. 国际化和翻译 (Currency and Translation)

---

## 安装依赖

### 爬虫
```bash
pip install requests beautifulsoup4 lxml
```

### 后端
```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary
```

### 前端
```bash
npm install
```

---

## 使用方法

### 抓取应用数据
```bash
python scrape_shopify_reviews.py --out output.csv
```

### 导入数据到数据库
```bash
python init_db.py
```

### 启动后端
```bash
cd backend && uvicorn main:app --reload
```

### 启动前端
```bash
cd frontend && npm run dev
```

---

## 注意事项

- 请勿设置过短的延迟时间，以免被 Shopify 封禁 IP
- 建议使用 `--dedupe-global` 参数避免同一应用出现在多个分类中
- 抓取大页面数量时可能需要较长时间
