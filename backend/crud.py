from sqlalchemy.orm import Session, joinedload

import models
import schemas
import security


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, is_admin=user.is_admin)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_file_metadata(db: Session, file: schemas.FileMetadataCreate, owner_id: int):
    db_file = models.FileMetadata(
        filename=file.filename,
        folder=file.folder,
        owner_id=owner_id,
        assigned_to_id=file.assigned_to_id,
        instruction=file.instruction
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def get_file_by_id(db: Session, file_id: int):
    return db.query(models.FileMetadata).filter(models.FileMetadata.id == file_id).first()


def delete_file_metadata(db: Session, file: models.FileMetadata):
    db.delete(file)
    db.commit()


def create_activity_log(db: Session, log: schemas.ActivityLogCreate, user_id: int):
    db_log = models.ActivityLog(**log.model_dump(), user_id=user_id)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def get_activity_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc()).offset(skip).limit(limit).all()


def get_files_by_folder(db: Session, folder: str):
    return db.query(models.FileMetadata).filter(models.FileMetadata.folder == folder).all()


def search_files(db: Session, query_str: str):
    return db.query(models.FileMetadata).filter(models.FileMetadata.filename.ilike(f"%{query_str}%")).all()


def get_file_by_folder_and_name(db: Session, folder: str, filename: str):
    return db.query(models.FileMetadata).filter(models.FileMetadata.folder == folder, models.FileMetadata.filename == filename).first()


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(models.User)
    if search:
        query = query.filter(models.User.username.ilike(f"%{search}%"))
    return query.offset(skip).limit(limit).all()


def update_user(db: Session, user_id: int, user: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    user_data = user.model_dump(exclude_unset=True)
    for key, value in user_data.items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    db.delete(db_user)
    db.commit()
    return db_user


def update_file_metadata(db: Session, file_id: int, file_update: schemas.FileMetadataUpdate):
    db_file = get_file_by_id(db, file_id)
    if not db_file:
        return None
    
    # Update fields if provided
    if file_update.filename:
        db_file.filename = file_update.filename
    if file_update.folder:
        db_file.folder = file_update.folder
    if file_update.assigned_to_id is not None:
        db_file.assigned_to_id = file_update.assigned_to_id
    if file_update.instruction is not None:
        db_file.instruction = file_update.instruction
    if file_update.status is not None:
        db_file.status = file_update.status
        
    db.commit()
    db.refresh(db_file)
    return db_file


def get_files_assigned_to_user(db: Session, user_id: int):
    return db.query(models.FileMetadata).filter(models.FileMetadata.assigned_to_id == user_id).all()

def get_all_assigned_files(db: Session):
    return db.query(models.FileMetadata).options(joinedload(models.FileMetadata.assigned_to)).filter(models.FileMetadata.assigned_to_id != None).all()
