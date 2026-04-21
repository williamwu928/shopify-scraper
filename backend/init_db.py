import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, Base
from models import Category, App, AppListing


def create_tables():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created!")
    
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\nTables created: {tables}")


if __name__ == "__main__":
    create_tables()
