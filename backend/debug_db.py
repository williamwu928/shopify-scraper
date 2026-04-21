import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import App
import json

db = SessionLocal()
try:
    from sqlalchemy import desc, nullslast, or_
    
    # Get apps with rating
    apps_with_rating = db.query(App).filter(App.rating != None).order_by(nullslast(desc(App.rating))).limit(5).all()
    # Get apps without rating
    apps_without_rating = db.query(App).filter(App.rating == None).limit(5).all()
    
    print("=== APPS WITH RATINGS (should appear first) ===")
    for app in apps_with_rating:
        print(f"  {app.handle}: rating={app.rating}, reviews={app.review_count}")
    
    print("\n=== APPS WITHOUT RATINGS (should appear last) ===")
    for app in apps_without_rating:
        print(f"  {app.handle}: rating={app.rating}, reviews={app.review_count}")
    
    # Check total count
    with_rating = db.query(App).filter(App.rating != None).count()
    without_rating = db.query(App).filter(App.rating == None).count()
    print(f"\nTotal: {with_rating} with rating, {without_rating} without rating")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
