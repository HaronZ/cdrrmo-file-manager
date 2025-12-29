from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class FileMetadataBase(BaseModel):
    filename: str
    folder: str


class FileMetadataCreate(FileMetadataBase):
    assigned_to_id: Optional[int] = None
    instruction: Optional[str] = None
    due_date: Optional[datetime] = None


class FileMetadataUpdate(BaseModel):
    filename: Optional[str] = None
    folder: Optional[str] = None
    assigned_to_id: Optional[int] = None
    instruction: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None


class FileMetadata(FileMetadataBase):
    id: int
    owner_id: int
    assigned_to_id: Optional[int] = None
    instruction: Optional[str] = None
    status: str = "Pending"
    created_at: datetime
    due_date: Optional[datetime] = None
    owner: Optional['UserBase'] = None
    assigned_to: Optional['UserBase'] = None
    is_dir: bool = False
    size: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# File Version Schemas
class FileVersionBase(BaseModel):
    version_number: int
    filename: str
    size: int


class FileVersion(FileVersionBase):
    id: int
    file_id: int
    file_path: str
    created_at: datetime
    created_by_id: int
    created_by: Optional['UserBase'] = None

    model_config = ConfigDict(from_attributes=True)


# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    type: str
    is_urgent: bool = False


class NotificationCreate(NotificationBase):
    user_id: int
    related_file_id: Optional[int] = None


class Notification(NotificationBase):
    id: int
    user_id: int
    is_read: bool = False
    created_at: datetime
    related_file_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


# User Preferences Schemas
class UserPreferencesBase(BaseModel):
    view_mode: str = "grid"
    visible_columns: str = "name,size,date,uploader,status"
    sort_key: str = "filename"
    sort_direction: str = "asc"
    theme: str = "system"


class UserPreferencesCreate(UserPreferencesBase):
    pass


class UserPreferencesUpdate(BaseModel):
    view_mode: Optional[str] = None
    visible_columns: Optional[str] = None
    sort_key: Optional[str] = None
    sort_direction: Optional[str] = None
    theme: Optional[str] = None


class UserPreferences(UserPreferencesBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# Search Filters Schema
class SearchFilters(BaseModel):
    q: Optional[str] = None
    folder: Optional[str] = None
    file_type: Optional[str] = None  # 'pdf', 'docx', 'xlsx', etc.
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    uploader_id: Optional[int] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None


class ActivityLogBase(BaseModel):
    action: str
    details: str


class ActivityLogCreate(ActivityLogBase):
    pass


class ActivityLog(ActivityLogBase):
    id: int
    user_id: int
    timestamp: datetime
    user: Optional['UserBase'] = None

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str
    is_admin: bool = False


class UserUpdate(BaseModel):
    username: Optional[str] = None
    is_admin: Optional[bool] = None


class User(UserBase):
    id: int
    is_admin: bool
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class BatchFileIds(BaseModel):
    file_ids: List[int]


class BatchAssign(BaseModel):
    file_ids: List[int]
    assigned_to_id: int
    instruction: Optional[str] = None
    due_date: Optional[datetime] = None


class BatchMove(BaseModel):
    file_ids: List[int]
    destination_folder: str

