"""
Statistics router for admin dashboard
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from dependencies import get_current_admin_user, get_db

router = APIRouter(
    prefix="/stats",
    tags=["statistics"],
)

BASE_DIR = "CDRRMO files"


def get_folder_size(folder_path: str) -> int:
    """Calculate total size of a folder recursively"""
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(folder_path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if os.path.exists(fp):
                    total_size += os.path.getsize(fp)
    except Exception:
        pass
    return total_size


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    """
    Get comprehensive dashboard statistics including storage and task metrics
    """
    # Total users
    total_users = db.query(func.count(models.User.id)).scalar()
    
    # Total files
    total_files = db.query(func.count(models.FileMetadata.id)).scalar()
    
    # Files by folder
    operation_files = db.query(func.count(models.FileMetadata.id)).filter(
        models.FileMetadata.folder.like('Operation%')
    ).scalar()
    
    research_files = db.query(func.count(models.FileMetadata.id)).filter(
        models.FileMetadata.folder.like('Research%')
    ).scalar()
    
    training_files = db.query(func.count(models.FileMetadata.id)).filter(
        models.FileMetadata.folder.like('Training%')
    ).scalar()
    
    # Storage usage by folder
    storage = {
        "Operation": get_folder_size(os.path.join(BASE_DIR, "Operation")),
        "Research": get_folder_size(os.path.join(BASE_DIR, "Research")),
        "Training": get_folder_size(os.path.join(BASE_DIR, "Training")),
    }
    storage["total"] = sum(storage.values())
    
    # Task completion metrics
    total_assigned = db.query(func.count(models.FileMetadata.id)).filter(
        models.FileMetadata.assigned_to_id.isnot(None)
    ).scalar()
    
    completed_tasks = db.query(func.count(models.FileMetadata.id)).filter(
        models.FileMetadata.assigned_to_id.isnot(None),
        models.FileMetadata.status == "Done"
    ).scalar()
    
    pending_tasks = db.query(func.count(models.FileMetadata.id)).filter(
        models.FileMetadata.assigned_to_id.isnot(None),
        models.FileMetadata.status == "Pending"
    ).scalar()
    
    # Overdue tasks
    now = datetime.now(timezone.utc)
    overdue_tasks = db.query(func.count(models.FileMetadata.id)).filter(
        models.FileMetadata.due_date.isnot(None),
        models.FileMetadata.due_date < now,
        models.FileMetadata.status != "Done"
    ).scalar()
    
    # File type distribution
    file_types = {}
    all_files = db.query(models.FileMetadata.filename).all()
    for (filename,) in all_files:
        ext = filename.split('.')[-1].upper() if '.' in filename else 'OTHER'
        file_types[ext] = file_types.get(ext, 0) + 1
    
    # Recent activity logs (last 10)
    recent_activities = db.query(models.ActivityLog).order_by(
        models.ActivityLog.timestamp.desc()
    ).limit(10).all()
    
    # Format activity logs
    activity_logs = [
        {
            "id": log.id,
            "user": log.user.username if log.user else "Unknown",
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.isoformat()
        }
        for log in recent_activities
    ]
    
    # User list for assignment
    users = db.query(models.User).all()
    user_list = [
        {
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin
        }
        for user in users
    ]
    
    return {
        "total_users": total_users,
        "total_files": total_files,
        "folder_distribution": {
            "Operation": operation_files,
            "Research": research_files,
            "Training": training_files
        },
        "storage": storage,
        "task_metrics": {
            "total_assigned": total_assigned,
            "completed": completed_tasks,
            "pending": pending_tasks,
            "overdue": overdue_tasks,
            "completion_rate": round((completed_tasks / total_assigned * 100) if total_assigned > 0 else 0, 1)
        },
        "file_types": file_types,
        "recent_activities": activity_logs,
        "users": user_list
    }

