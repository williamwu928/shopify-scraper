from sqlalchemy import Column, Integer, String, Text, Boolean, DECIMAL, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    url = Column(Text, nullable=False)
    app_count = Column(Integer, default=0)

    listings = relationship("AppListing", back_populates="category")


class App(Base):
    __tablename__ = "apps"

    id = Column(Integer, primary_key=True, index=True)
    handle = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    app_url = Column(Text)
    icon_url = Column(Text)
    rating = Column(DECIMAL(2, 1))
    review_count = Column(Integer, default=0)
    has_free_plan = Column(Boolean, default=False)
    pricing_text = Column(Text)
    short_description = Column(Text)
    built_for_shopify = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    listings = relationship("AppListing", back_populates="app")


class AppListing(Base):
    __tablename__ = "app_listings"

    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    page = Column(Integer, default=1)
    is_ad = Column(Boolean, default=False)
    scraped_at = Column(TIMESTAMP, server_default=func.now())

    app = relationship("App", back_populates="listings")
    category = relationship("Category", back_populates="listings")

    __table_args__ = (
        UniqueConstraint('app_id', 'category_id', name='unique_app_category'),
    )
