"""
Database Configuration for CDRRMO File Manager

This module sets up the SQLAlchemy database connection with connection pooling.

CONNECTION POOLING EXPLAINED:
- pool_size=5: Keep 5 database connections ready at all times
- max_overflow=10: Allow up to 10 extra connections during high load
- pool_pre_ping=True: Test connections before using (prevents "connection closed" errors)
- pool_recycle=3600: Refresh connections every hour (prevents stale connections)

WHY THIS MATTERS:
- Without pooling: Each request creates a new database connection (slow)
- With pooling: Connections are reused (fast)
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine with connection pooling for better performance
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=5,           # Number of connections to keep open
    max_overflow=10,       # Extra connections allowed during peak load
    pool_pre_ping=True,    # Verify connection is alive before using
    pool_recycle=3600,     # Recycle connections after 1 hour
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

