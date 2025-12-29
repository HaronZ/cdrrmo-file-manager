import os
import shutil
import uuid
import zlib
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query

from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
import zipfile
import io
import mimetypes

import crud
import models
import schemas
from dependencies import get_current_admin_user, get_current_user, get_db

router = APIRouter(
    prefix="/files",
    tags=["files"],
)

BASE_DIR = "CDRRMO files"
VERSIONS_DIR = "file_versions"
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".pptx"}
PREVIEW_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB



@router.post("/sync")
def sync_files(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """
    Scans the file system and adds any missing files to the database.
    """
    added_count = 0
    
    # Get all known files from DB to avoid duplicates
    # We'll use a set of (folder, filename) tuples for fast lookup
    db_files = db.query(models.FileMetadata).all()
    known_files = {(f.folder, f.filename) for f in db_files}
    
    for root, dirs, files in os.walk(BASE_DIR):
        for filename in files:
            # Calculate relative path (folder)
            rel_path = os.path.relpath(root, BASE_DIR)
            folder = "/" if rel_path == "." else rel_path.replace("\\", "/")
            
            if (folder, filename) not in known_files:
                # File exists on disk but not in DB
                full_path = os.path.join(root, filename)
                try:
                    # Create metadata
                    file_size = os.path.getsize(full_path)
                    created_at = datetime.fromtimestamp(os.path.getctime(full_path))
                    
                    new_file = models.FileMetadata(
                        filename=filename,
                        folder=folder,
                        owner_id=current_user.id, # Assign to admin running the sync
                        created_at=created_at,
                        status="Synced"
                    )
                    db.add(new_file)
                    added_count += 1
                except Exception as e:
                    print(f"Error syncing file {filename}: {e}")
                    continue
    
    if added_count > 0:
        db.commit()
        
    return {"message": f"Sync complete. {added_count} files added.", "added_count": added_count}


@router.get("/", response_model=List[schemas.FileMetadata])
def list_files(
    path: str = Query("/", description="Relative path to list files from"),
    search: Optional[str] = Query(None, description="Search query for filenames"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if search:
        try:
            # Global search mode
            print(f"Searching for: {search}")
            db_files = crud.search_files(db, search)
            print(f"Found {len(db_files)} files in DB")
            
            results = []
            seen_paths = set()

            # Process DB files
            for file in db_files:
                try:
                    # Convert DB model to Pydantic schema
                    file_data = schemas.FileMetadata.model_validate(file)
                    
                    # Calculate file path and size
                    # Handle case where folder might be None (though it shouldn't be)
                    folder_str = file.folder if file.folder else "/"
                    folder_path = "" if folder_str == "/" else folder_str
                    full_path = os.path.join(BASE_DIR, folder_path, file.filename)
                    
                    if os.path.exists(full_path) and os.path.isfile(full_path):
                        file_data.size = os.path.getsize(full_path)
                        seen_paths.add(full_path)
                    else:
                        file_data.size = 0
                        
                    results.append(file_data)
                except Exception as e:
                    print(f"Error processing file {file.id}: {e}")
                    continue

            # Supplement with FS search for unindexed files
            # Walk through the BASE_DIR to find matching files not in DB
            for root, dirs, files in os.walk(BASE_DIR):
                for filename in files:
                    if search.lower() in filename.lower():
                        full_path = os.path.join(root, filename)
                        
                        # Skip if already added from DB
                        if full_path in seen_paths:
                            continue
                            
                        # Create dummy metadata for unindexed file
                        rel_path = os.path.relpath(root, BASE_DIR)
                        folder = "/" if rel_path == "." else rel_path.replace("\\", "/")
                        
                        # Generate negative ID
                        dummy_id = -abs(zlib.adler32(full_path.encode()))
                        
                        try:
                            file_size = os.path.getsize(full_path)
                            created_at = datetime.fromtimestamp(os.path.getctime(full_path))
                            
                            results.append(schemas.FileMetadata(
                                id=dummy_id,
                                filename=filename,
                                folder=folder,
                                owner_id=0, # System/Unknown
                                created_at=created_at,
                                is_dir=False,
                                size=file_size,
                                status="Unindexed"
                            ))
                        except Exception as e:
                            print(f"Error processing FS file {filename}: {e}")
                            continue

            return results
        except Exception as e:
            print(f"Search error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # Sanitize path
    safe_path = os.path.normpath(path).lstrip(os.sep)
    if ".." in safe_path:
        raise HTTPException(status_code=400, detail="Invalid path")
    
    full_path = os.path.join(BASE_DIR, safe_path)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Path not found")
    
    if not os.path.isdir(full_path):
        raise HTTPException(status_code=400, detail="Path is not a directory")

    # Get files from DB for this folder path
    # Note: We store "folder" in DB as the relative path where file resides.
    # For root, path is "/". For subfolders, it's "Subfolder".
    # We need to match how we store it.
    # In upload, we store `folder` as the path provided.
    
    # Normalize DB folder query
    db_folder_query = path if path == "/" else safe_path.replace("\\", "/")
    
    # Get all files in this folder from DB
    db_files = crud.get_files_by_folder(db, folder=db_folder_query)
    
    # Also list directories from FS (since we don't track dirs in DB yet explicitly as items)
    fs_items = os.listdir(full_path)
    
    result = []
    
    # Map DB files by filename for easy lookup
    db_file_map = {f.filename: f for f in db_files}
    
    for item in fs_items:
        item_path = os.path.join(full_path, item)
        if os.path.isdir(item_path):
            # It's a directory, create a dummy FileMetadata for it
            # We don't have owner/date for dirs in DB yet, so use defaults or FS stats
            
            # Calculate directory size
            dir_size = get_directory_size(item_path)
            
            # Generate a unique negative ID based on path hash to avoid key collisions in frontend
            # We use negative numbers to distinguish from real DB IDs (which are positive)
            dummy_id = -abs(zlib.adler32(item_path.encode()))
            
            result.append(schemas.FileMetadata(
                id=dummy_id, 
                filename=item,
                folder=db_folder_query,
                owner_id=0, # System/Unknown
                created_at=datetime.fromtimestamp(os.path.getctime(item_path)),
                is_dir=True,
                size=dir_size
            ))
        else:
            # It's a file
            if item in db_file_map:
                # Use DB metadata
                db_file = db_file_map[item]
                db_file.is_dir = False
                # Populate size dynamically
                try:
                    db_file.size = os.path.getsize(item_path)
                except OSError:
                    db_file.size = 0
                result.append(db_file)
            else:
                # File exists in FS but not DB
                # Automatically sync (add to DB)
                try:
                    file_size = os.path.getsize(item_path)
                    created_at = datetime.fromtimestamp(os.path.getctime(item_path))
                    
                    new_file = models.FileMetadata(
                        filename=item,
                        folder=db_folder_query,
                        owner_id=current_user.id, # Assign to current user (likely admin or viewer)
                        created_at=created_at,
                        status="Synced",
                        size=file_size
                    )
                    db.add(new_file)
                    db.commit() # Commit immediately so it has an ID
                    db.refresh(new_file)
                    
                    result.append(new_file)
                except Exception as e:
                    print(f"Error auto-syncing file {item}: {e}")
                    # Fallback to dummy if DB add fails
                    dummy_id = -abs(zlib.adler32(item_path.encode()))
                    result.append(schemas.FileMetadata(
                        id=dummy_id,
                        filename=item,
                        folder=db_folder_query,
                        owner_id=0,
                        created_at=datetime.fromtimestamp(os.path.getctime(item_path)),
                        is_dir=False,
                        size=os.path.getsize(item_path),
                        status="Unindexed"
                    ))
                
    return result


@router.post("/upload", response_model=schemas.FileMetadata)
async def upload_file(
    folder: str = Form(...),
    file: UploadFile = File(...),
    assigned_to_id: Optional[int] = Form(None),
    instruction: Optional[str] = Form(None),
    due_date: Optional[str] = Form(None),  # ISO format datetime string
    overwrite: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Sanitize folder path
    safe_folder = os.path.normpath(folder).lstrip(os.sep)
    if ".." in safe_folder:
        raise HTTPException(status_code=400, detail="Invalid folder path")
        
    # Ensure folder exists
    full_folder_path = os.path.join(BASE_DIR, safe_folder)
    if not os.path.exists(full_folder_path):
        os.makedirs(full_folder_path, exist_ok=True)
        
    file_path = os.path.join(full_folder_path, file.filename)
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE/1024/1024}MB"
        )

    # Check if file exists
    db_folder_query = folder if folder == "/" else safe_folder.replace("\\", "/")
    existing_file = crud.get_file_by_folder_and_name(db, folder=db_folder_query, filename=file.filename)
    
    if os.path.exists(file_path) and not overwrite:
        raise HTTPException(status_code=409, detail="File already exists")

    # If overwriting, save the old version first
    if existing_file and os.path.exists(file_path) and overwrite:
        # Get next version number
        max_version = db.query(models.FileVersion).filter(
            models.FileVersion.file_id == existing_file.id
        ).order_by(models.FileVersion.version_number.desc()).first()
        
        next_version = (max_version.version_number + 1) if max_version else 1
        
        # Save old file to versions directory
        os.makedirs(VERSIONS_DIR, exist_ok=True)
        version_filename = f"{existing_file.id}_{next_version}_{uuid.uuid4().hex[:8]}_{file.filename}"
        version_path = os.path.join(VERSIONS_DIR, version_filename)
        
        shutil.copy2(file_path, version_path)
        
        # Create version record
        old_size = os.path.getsize(file_path)
        version_record = models.FileVersion(
            file_id=existing_file.id,
            version_number=next_version,
            filename=file.filename,
            file_path=version_path,
            size=old_size,
            created_by_id=current_user.id
        )
        db.add(version_record)

    # Save new file to FS
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Parse due_date if provided
    parsed_due_date = None
    if due_date:
        try:
            parsed_due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        except ValueError:
            pass  # Ignore invalid date format

    if existing_file:
        # Update existing record
        update_data = schemas.FileMetadataUpdate(
            filename=file.filename,
            folder=db_folder_query,
            assigned_to_id=assigned_to_id,
            instruction=instruction,
            due_date=parsed_due_date
        )
        db_file = crud.update_file_metadata(db, existing_file.id, update_data)
        
        # Update size
        db_file.size = file_size
        db.commit()
        db.refresh(db_file)
        
        action = "OVERWRITE"
    else:
        # Create new record
        file_metadata = schemas.FileMetadataCreate(
            filename=file.filename, 
            folder=db_folder_query,
            assigned_to_id=assigned_to_id,
            instruction=instruction,
            due_date=parsed_due_date
        )
        db_file = crud.create_file_metadata(db=db, file=file_metadata, owner_id=current_user.id)
        
        # Update size
        db_file.size = file_size
        db.commit()
        db.refresh(db_file)
        
        action = "UPLOAD"
    
    # Create notification for assigned user
    if assigned_to_id and assigned_to_id != current_user.id:
        notification = models.Notification(
            user_id=assigned_to_id,
            title="New Task Assigned",
            message=f"You have been assigned to: {file.filename}",
            type="task_assigned",
            is_urgent=parsed_due_date is not None,
            related_file_id=db_file.id
        )
        db.add(notification)
        db.commit()
    
    # Log Activity
    crud.create_activity_log(db, schemas.ActivityLogCreate(
        action=action,
        details=f"{action.title()}ed {file.filename} to {folder}"
    ), user_id=current_user.id)

    return db_file


@router.get("/download/{file_id}")
async def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_file = crud.get_file_by_id(db, file_id=file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Sanitize and validate the file path
    safe_file_path = os.path.abspath(
        os.path.join(BASE_DIR, db_file.folder.strip("/\\"), db_file.filename)
    )
    if not safe_file_path.startswith(os.path.abspath(BASE_DIR)):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not os.path.isfile(safe_file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(safe_file_path, filename=os.path.basename(safe_file_path))


@router.get("/download_path/")
async def download_file_by_path(
    path: str,
    current_user: models.User = Depends(get_current_user),
):
    # Sanitize and validate the path
    # Path comes as relative path from BASE_DIR, e.g. "Operations/report.pdf"
    safe_file_path = os.path.abspath(os.path.join(BASE_DIR, path.strip("/\\")))
    
    if not safe_file_path.startswith(os.path.abspath(BASE_DIR)):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not os.path.isfile(safe_file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(safe_file_path, filename=os.path.basename(safe_file_path))


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_file = crud.get_file_by_id(db, file_id=file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if not current_user.is_admin and db_file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")

    # Sanitize and validate the file path
    safe_file_path = os.path.abspath(
        os.path.join(BASE_DIR, db_file.folder.strip("/\\"), db_file.filename)
    )
    if not safe_file_path.startswith(os.path.abspath(BASE_DIR)):
        # This case should ideally not be hit if data is clean, but as a safeguard
        raise HTTPException(status_code=400, detail="Invalid file path")

    if os.path.exists(safe_file_path):
        os.remove(safe_file_path)

    crud.delete_file_metadata(db=db, file=db_file)

    crud.create_activity_log(db, schemas.ActivityLogCreate(
        action="DELETE",
        details=f"Deleted {db_file.filename}"
    ), user_id=current_user.id)

    return {"message": f"File '{db_file.filename}' deleted successfully"}


@router.post("/dir")
async def create_directory(
    path: str = Form(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    # Sanitize and validate the path
    safe_path = os.path.abspath(os.path.join(BASE_DIR, path.strip("/\\")))
    if not safe_path.startswith(os.path.abspath(BASE_DIR)):
        raise HTTPException(status_code=400, detail="Invalid path")

    if os.path.exists(safe_path):
        raise HTTPException(status_code=400, detail="Directory already exists")

    os.makedirs(safe_path)
    
    crud.create_activity_log(db, schemas.ActivityLogCreate(
        action="CREATE_DIRECTORY",
        details=f"Created directory {path}"
    ), user_id=current_user.id)

    return {"message": f"Directory '{path}' created successfully"}


@router.delete("/dir/{folder_path:path}")
async def delete_directory(
    folder_path: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    # Sanitize and validate the path
    safe_path = os.path.abspath(os.path.join(BASE_DIR, folder_path.strip("/\\")))
    if not safe_path.startswith(os.path.abspath(BASE_DIR)):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.isdir(safe_path):
        raise HTTPException(status_code=404, detail="Directory not found")

    # Find all file metadata records within this directory
    files_to_delete = (
        db.query(models.FileMetadata)
        .filter(models.FileMetadata.folder.startswith(folder_path))
        .all()
    )

    for file_metadata in files_to_delete:
        db.delete(file_metadata)

    db.commit()

    # Now, delete the directory from the filesystem
    shutil.rmtree(safe_path)

    crud.create_activity_log(db, schemas.ActivityLogCreate(
        action="DELETE_DIRECTORY",
        details=f"Deleted directory {folder_path}"
    ), user_id=current_user.id)

    return {
        "message": f"Directory '{folder_path}' and all its contents deleted successfully"
    }


@router.put("/{file_id}/instruction", response_model=schemas.FileMetadata)
async def update_instruction(
    file_id: int,
    instruction: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_file = crud.get_file_by_id(db, file_id=file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    if not current_user.is_admin and db_file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = schemas.FileMetadataUpdate(instruction=instruction)
    updated_file = crud.update_file_metadata(db, file_id, update_data)
    
    crud.create_activity_log(db, schemas.ActivityLogCreate(
        action="UPDATE",
        details=f"Updated instruction for {db_file.filename}"
    ), user_id=current_user.id)
    
    return updated_file


@router.put("/{file_id}/status", response_model=schemas.FileMetadata)
async def update_status(
    file_id: int,
    status: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_file = crud.get_file_by_id(db, file_id=file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Only assigned user or admin can update status
    if not current_user.is_admin and db_file.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = schemas.FileMetadataUpdate(status=status)
    updated_file = crud.update_file_metadata(db, file_id, update_data)
    
    crud.create_activity_log(db, schemas.ActivityLogCreate(
        action="UPDATE_STATUS",
        details=f"Updated status of {db_file.filename} to {status}"
    ), user_id=current_user.id)
    
    return updated_file


@router.get("/assigned", response_model=List[schemas.FileMetadata])
async def get_assigned_files(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_files_assigned_to_user(db, user_id=current_user.id)

@router.get("/all_assigned", response_model=List[schemas.FileMetadata])
async def get_all_assigned_files(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    return crud.get_all_assigned_files(db)


@router.post("/batch/delete")
async def bulk_delete_files(
    batch: schemas.BatchFileIds,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    deleted_count = 0
    for file_id in batch.file_ids:
        db_file = crud.get_file_by_id(db, file_id=file_id)
        if not db_file:
            continue
            
        if not current_user.is_admin and db_file.owner_id != current_user.id:
            continue

        # Sanitize and validate the file path
        safe_file_path = os.path.abspath(
            os.path.join(BASE_DIR, db_file.folder.strip("/\\"), db_file.filename)
        )
        if os.path.exists(safe_file_path) and safe_file_path.startswith(os.path.abspath(BASE_DIR)):
            os.remove(safe_file_path)

        crud.delete_file_metadata(db=db, file=db_file)
        deleted_count += 1

    crud.create_activity_log(db, schemas.ActivityLogCreate(
        action="BULK_DELETE",
        details=f"Deleted {deleted_count} files"
    ), user_id=current_user.id)

    return {"message": f"Successfully deleted {deleted_count} files"}


@router.post("/batch/download")
async def bulk_download_files(
    batch: schemas.BatchFileIds,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Create a zip file in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_id in batch.file_ids:
            db_file = crud.get_file_by_id(db, file_id=file_id)
            if not db_file:
                continue
            
            if not current_user.is_admin and db_file.owner_id != current_user.id:
                continue

            safe_file_path = os.path.abspath(
                os.path.join(BASE_DIR, db_file.folder.strip("/\\"), db_file.filename)
            )
            
            if os.path.exists(safe_file_path) and safe_file_path.startswith(os.path.abspath(BASE_DIR)):
                zip_file.write(safe_file_path, db_file.filename)

    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=files.zip"}
    )


def get_directory_size(path: str) -> int:
    """Calculate total size of a directory recursively."""
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                # skip if it is symbolic link
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
    except Exception:
        pass # Ignore permission errors etc
    return total_size


@router.get("/download_dir/")
async def download_directory(
    path: str,
    current_user: models.User = Depends(get_current_user),
):
    # Sanitize and validate the path
    safe_path = os.path.abspath(os.path.join(BASE_DIR, path.strip("/\\")))
    if not safe_path.startswith(os.path.abspath(BASE_DIR)):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.isdir(safe_path):
        raise HTTPException(status_code=404, detail="Directory not found")

    # Create a zip file in memory
    zip_buffer = io.BytesIO()
    folder_name = os.path.basename(safe_path)
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(safe_path):
            for file in files:
                file_path = os.path.join(root, file)
                # Calculate relative path for zip archive
                arcname = os.path.relpath(file_path, os.path.dirname(safe_path))
                zip_file.write(file_path, arcname)

    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={folder_name}.zip"}
    )


# ==================== FILE PREVIEW ====================

@router.get("/{file_id}/preview")
def get_file_preview(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get file for preview. Only supports PDF and images.
    Returns the file with appropriate content-type for browser preview.
    """
    file = crud.get_file_by_id(db, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check permission
    if not current_user.is_admin and file.owner_id != current_user.id and file.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to preview this file")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in PREVIEW_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Preview not supported for {ext} files. Only PDF and images are supported.")
    
    file_path = os.path.join(BASE_DIR, file.folder.strip("/\\"), file.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "application/octet-stream"
    
    return FileResponse(
        file_path,
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename={file.filename}"}
    )


# ==================== FILE VERSION HISTORY ====================

@router.get("/{file_id}/versions", response_model=List[schemas.FileVersion])
def get_file_versions(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get version history for a file"""
    file = crud.get_file_by_id(db, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check permission
    if not current_user.is_admin and file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    versions = db.query(models.FileVersion).filter(
        models.FileVersion.file_id == file_id
    ).order_by(models.FileVersion.version_number.desc()).all()
    
    return versions


@router.post("/{file_id}/restore/{version_id}")
def restore_file_version(
    file_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Restore a file to a previous version.
    
    HOW ROLLBACK WORKS:
    1. When a file is overwritten, the OLD version is saved to file_versions/ folder
    2. Each version has a unique path stored in the database
    3. When you restore, we:
       - Save current file as a new version (so you can undo the restore)
       - Copy the selected version back to the original location
       - Update file metadata (size, etc.)
    """
    file = crud.get_file_by_id(db, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check permission - only admin or owner can restore
    if not current_user.is_admin and file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to restore this file")
    
    # Get the version to restore
    version = db.query(models.FileVersion).filter(
        models.FileVersion.id == version_id,
        models.FileVersion.file_id == file_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Check if version file exists
    if not os.path.exists(version.file_path):
        raise HTTPException(status_code=404, detail="Version file no longer exists on disk")
    
    # Current file path
    current_file_path = os.path.join(BASE_DIR, file.folder.strip("/\\"), file.filename)
    
    # First, save current file as a new version (so restore can be undone)
    if os.path.exists(current_file_path):
        # Get next version number
        max_version = db.query(models.FileVersion).filter(
            models.FileVersion.file_id == file_id
        ).order_by(models.FileVersion.version_number.desc()).first()
        
        next_version = (max_version.version_number + 1) if max_version else 1
        
        # Save current file to versions
        version_filename = f"{file_id}_{next_version}_{uuid.uuid4().hex[:8]}_{file.filename}"
        version_path = os.path.join(VERSIONS_DIR, version_filename)
        
        os.makedirs(VERSIONS_DIR, exist_ok=True)
        shutil.copy2(current_file_path, version_path)
        
        # Create version record for current file
        new_version = models.FileVersion(
            file_id=file_id,
            version_number=next_version,
            filename=file.filename,
            file_path=version_path,
            size=os.path.getsize(version_path),
            created_by_id=current_user.id
        )
        db.add(new_version)
    
    # Now restore the selected version
    shutil.copy2(version.file_path, current_file_path)
    
    # Update file metadata
    file.size = os.path.getsize(current_file_path)
    
    # Log the action
    log = models.ActivityLog(
        user_id=current_user.id,
        action="RESTORE_VERSION",
        details=f"Restored {file.filename} to version {version.version_number}"
    )
    db.add(log)
    
    db.commit()
    
    return {
        "message": f"File restored to version {version.version_number}",
        "restored_from": version.version_number,
        "file_id": file_id
    }


# ==================== ADVANCED SEARCH ====================

@router.get("/search/advanced", response_model=List[schemas.FileMetadata])
def advanced_search(
    q: Optional[str] = Query(None, description="Search query for filename"),
    folder: Optional[str] = Query(None, description="Filter by folder"),
    file_type: Optional[str] = Query(None, description="Filter by extension (pdf, docx, xlsx)"),
    date_from: Optional[datetime] = Query(None, description="Filter files created after this date"),
    date_to: Optional[datetime] = Query(None, description="Filter files created before this date"),
    uploader_id: Optional[int] = Query(None, description="Filter by uploader ID"),
    status: Optional[str] = Query(None, description="Filter by status (Pending, Done)"),
    assigned_to_id: Optional[int] = Query(None, description="Filter by assigned user ID"),
    has_due_date: Optional[bool] = Query(None, description="Filter files with/without due dates"),
    overdue_only: Optional[bool] = Query(False, description="Show only overdue files"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Advanced search with multiple filters.
    Regular users can only see their own files and files assigned to them.
    Admins can see all files.
    """
    query = db.query(models.FileMetadata)
    
    # Permission filter
    if not current_user.is_admin:
        query = query.filter(
            (models.FileMetadata.owner_id == current_user.id) |
            (models.FileMetadata.assigned_to_id == current_user.id)
        )
    
    # Apply filters
    if q:
        query = query.filter(models.FileMetadata.filename.ilike(f"%{q}%"))
    
    if folder:
        query = query.filter(models.FileMetadata.folder == folder)
    
    if file_type:
        ext = f".{file_type.lower()}" if not file_type.startswith(".") else file_type.lower()
        query = query.filter(models.FileMetadata.filename.ilike(f"%{ext}"))
    
    if date_from:
        query = query.filter(models.FileMetadata.created_at >= date_from)
    
    if date_to:
        query = query.filter(models.FileMetadata.created_at <= date_to)
    
    if uploader_id:
        query = query.filter(models.FileMetadata.owner_id == uploader_id)
    
    if status:
        query = query.filter(models.FileMetadata.status == status)
    
    if assigned_to_id:
        query = query.filter(models.FileMetadata.assigned_to_id == assigned_to_id)
    
    if has_due_date is True:
        query = query.filter(models.FileMetadata.due_date.isnot(None))
    elif has_due_date is False:
        query = query.filter(models.FileMetadata.due_date.is_(None))
    
    if overdue_only:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        query = query.filter(
            models.FileMetadata.due_date.isnot(None),
            models.FileMetadata.due_date < now,
            models.FileMetadata.status != "Done"
        )
    
    return query.order_by(models.FileMetadata.created_at.desc()).offset(skip).limit(limit).all()


# ==================== BULK OPERATIONS ====================

@router.post("/batch/assign")
def bulk_assign_files(
    batch: schemas.BatchAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    """Assign multiple files to a user (Admin only)"""
    # Verify target user exists
    target_user = db.query(models.User).filter(models.User.id == batch.assigned_to_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    updated_count = 0
    for file_id in batch.file_ids:
        file = crud.get_file_by_id(db, file_id)
        if file and not file.is_dir:
            file.assigned_to_id = batch.assigned_to_id
            if batch.instruction:
                file.instruction = batch.instruction
            if batch.due_date:
                file.due_date = batch.due_date
            file.status = "Pending"
            updated_count += 1
            
            # Create notification for the assigned user
            notification = models.Notification(
                user_id=batch.assigned_to_id,
                title="New Task Assigned",
                message=f"You have been assigned to: {file.filename}",
                type="task_assigned",
                is_urgent=batch.due_date is not None,
                related_file_id=file_id
            )
            db.add(notification)
    
    # Log the action
    log = models.ActivityLog(
        user_id=current_user.id,
        action="BULK_ASSIGN",
        details=f"Assigned {updated_count} files to user {target_user.username}"
    )
    db.add(log)
    
    db.commit()
    
    return {"message": f"Assigned {updated_count} files to {target_user.username}"}


@router.post("/batch/move")
def bulk_move_files(
    batch: schemas.BatchMove,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Move multiple files to a different folder"""
    # Validate destination folder exists
    dest_path = os.path.join(BASE_DIR, batch.destination_folder.strip("/\\"))
    if not os.path.exists(dest_path):
        os.makedirs(dest_path, exist_ok=True)
    
    moved_count = 0
    errors = []
    
    for file_id in batch.file_ids:
        file = crud.get_file_by_id(db, file_id)
        if not file:
            continue
        
        # Permission check
        if not current_user.is_admin and file.owner_id != current_user.id:
            errors.append(f"No permission to move {file.filename}")
            continue
        
        if file.is_dir:
            errors.append(f"Cannot move directory {file.filename}")
            continue
        
        # Current and new paths
        current_path = os.path.join(BASE_DIR, file.folder.strip("/\\"), file.filename)
        new_path = os.path.join(dest_path, file.filename)
        
        if os.path.exists(new_path):
            errors.append(f"File {file.filename} already exists in destination")
            continue
        
        try:
            shutil.move(current_path, new_path)
            file.folder = batch.destination_folder
            moved_count += 1
        except Exception as e:
            errors.append(f"Failed to move {file.filename}: {str(e)}")
    
    # Log the action
    log = models.ActivityLog(
        user_id=current_user.id,
        action="BULK_MOVE",
        details=f"Moved {moved_count} files to {batch.destination_folder}"
    )
    db.add(log)
    
    db.commit()
    
    return {
        "message": f"Moved {moved_count} files",
        "moved_count": moved_count,
        "errors": errors if errors else None
    }


# ==================== FILE DETAILS ====================

@router.get("/{file_id}/details")
def get_file_details(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get detailed information about a file including version count"""
    file = crud.get_file_by_id(db, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Permission check
    if not current_user.is_admin and file.owner_id != current_user.id and file.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get version count
    version_count = db.query(models.FileVersion).filter(
        models.FileVersion.file_id == file_id
    ).count()
    
    # Get file path for size
    file_path = os.path.join(BASE_DIR, file.folder.strip("/\\"), file.filename)
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    
    # Check if preview is available
    ext = os.path.splitext(file.filename)[1].lower()
    can_preview = ext in PREVIEW_EXTENSIONS
    
    return {
        "id": file.id,
        "filename": file.filename,
        "folder": file.folder,
        "size": file_size,
        "owner": file.owner.username if file.owner else None,
        "owner_id": file.owner_id,
        "assigned_to": file.assigned_to.username if file.assigned_to else None,
        "assigned_to_id": file.assigned_to_id,
        "instruction": file.instruction,
        "status": file.status,
        "due_date": file.due_date.isoformat() if file.due_date else None,
        "created_at": file.created_at.isoformat() if file.created_at else None,
        "version_count": version_count,
        "can_preview": can_preview,
        "file_type": ext.replace(".", "").upper() if ext else "Unknown"
    }