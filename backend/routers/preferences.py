from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies import get_db, get_current_user
import models
import schemas

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.get("/", response_model=schemas.UserPreferences)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's preferences"""
    prefs = db.query(models.UserPreferences).filter(
        models.UserPreferences.user_id == current_user.id
    ).first()
    
    if not prefs:
        # Create default preferences
        prefs = models.UserPreferences(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return prefs


@router.put("/", response_model=schemas.UserPreferences)
def update_preferences(
    prefs_update: schemas.UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user's preferences"""
    prefs = db.query(models.UserPreferences).filter(
        models.UserPreferences.user_id == current_user.id
    ).first()
    
    if not prefs:
        prefs = models.UserPreferences(user_id=current_user.id)
        db.add(prefs)
    
    update_data = prefs_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)
    
    db.commit()
    db.refresh(prefs)
    return prefs
