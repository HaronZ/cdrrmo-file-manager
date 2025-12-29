"""
CDRRMO File Manager - Main Application

This is the entry point for the FastAPI application.
It configures:
- Database connection and table creation
- CORS middleware for cross-origin requests
- API routers for different features
- Health check endpoint for monitoring
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import os

import database
import routers.users
import routers.files
import routers.stats
import routers.notifications
import routers.preferences
import schemas
import models
import crud
from dependencies import get_db, get_current_user

load_dotenv()

# Directory configuration
BASE_DIR = "CDRRMO files"
SUB_DIRS = ["Operation", "Research", "Training"]
VERSIONS_DIR = "file_versions"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    
    Startup:
    - Creates file storage directories
    - Creates database tables
    
    Shutdown:
    - (Reserved for cleanup tasks)
    """
    # Create base directory for file storage
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)
        print(f"✅ Created base directory: {BASE_DIR}")

    # Create department subdirectories
    for sub_dir in SUB_DIRS:
        path = os.path.join(BASE_DIR, sub_dir)
        if not os.path.exists(path):
            os.makedirs(path)
            print(f"✅ Created subdirectory: {path}")

    # Create versions directory for file history
    if not os.path.exists(VERSIONS_DIR):
        os.makedirs(VERSIONS_DIR)
        print(f"✅ Created versions directory: {VERSIONS_DIR}")

    # Create database tables
    print("🔄 Attempting to create database tables...")
    try:
        database.Base.metadata.create_all(bind=database.engine)
        print("✅ Database tables ready")
    except Exception as e:
        print(f"❌ Database error: {e}")
    
    yield
    
    # Shutdown cleanup (if needed in future)
    print("👋 Application shutdown")


# Create FastAPI app
app = FastAPI(
    title="CDRRMO File Manager API",
    description="File management system for the City Disaster Risk Reduction and Management Office",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
origins = [origin.strip() for origin in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"🌐 CORS configured for: {origins}")


# =============================================================================
# HEALTH CHECK ENDPOINT
# =============================================================================

@app.get("/health", tags=["monitoring"])
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint for monitoring and load balancers.
    
    Checks:
    - API is responding
    - Database connection is working
    
    Returns:
        - 200 OK if healthy
        - 503 Service Unavailable if database is down
    
    Usage by Docker/Kubernetes:
        HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1
    """
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "version": "1.0.0"
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )


# =============================================================================
# API ROUTES
# =============================================================================

@app.get("/", tags=["root"])
def read_root():
    """Welcome endpoint with API information."""
    return {
        "message": "Welcome to the CDRRMO File Manager API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/activity_logs/", response_model=List[schemas.ActivityLog], tags=["logs"])
def read_activity_logs(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get activity logs (Admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_activity_logs(db, skip=skip, limit=limit)


# Include routers
app.include_router(routers.users.router)
app.include_router(routers.files.router)
app.include_router(routers.stats.router)
app.include_router(routers.notifications.router)
app.include_router(routers.preferences.router)


