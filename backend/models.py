from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)

    files = relationship("FileMetadata", foreign_keys="FileMetadata.owner_id", back_populates="owner")
    activity_logs = relationship("ActivityLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False)


class FileMetadata(Base):
    __tablename__ = "file_metadata"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    folder = Column(String, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    instruction = Column(String, nullable=True)
    status = Column(String, default="Pending", index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    due_date = Column(DateTime, nullable=True, index=True)  # New: task due date
    size = Column(BigInteger, default=0)  # File size in bytes
    is_dir = Column(Boolean, default=False)  # Is directory

    owner = relationship("User", foreign_keys=[owner_id], back_populates="files")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    versions = relationship("FileVersion", back_populates="file", cascade="all, delete-orphan")


class FileVersion(Base):
    """Track file version history"""
    __tablename__ = "file_versions"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("file_metadata.id", ondelete="CASCADE"), index=True)
    version_number = Column(Integer, default=1)
    filename = Column(String)
    file_path = Column(String)  # Path to versioned file
    size = Column(BigInteger, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by_id = Column(Integer, ForeignKey("users.id"), index=True)

    file = relationship("FileMetadata", back_populates="versions")
    created_by = relationship("User")


class Notification(Base):
    """In-app notifications"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String)
    message = Column(Text)
    type = Column(String, index=True)  # 'task_assigned', 'task_due', 'file_update', 'system'
    is_read = Column(Boolean, default=False, index=True)
    is_urgent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    related_file_id = Column(Integer, ForeignKey("file_metadata.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="notifications")
    related_file = relationship("FileMetadata")


class UserPreferences(Base):
    """User view preferences"""
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    view_mode = Column(String, default="grid")  # 'grid' or 'list'
    visible_columns = Column(Text, default="name,size,date,uploader,status")  # Comma-separated
    sort_key = Column(String, default="filename")
    sort_direction = Column(String, default="asc")
    theme = Column(String, default="system")  # 'light', 'dark', 'system'

    user = relationship("User", back_populates="preferences")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    action = Column(String)
    details = Column(String)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="activity_logs")

