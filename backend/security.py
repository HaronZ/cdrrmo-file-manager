"""
Security Utilities for CDRRMO File Manager

This module handles:
- Password hashing and verification
- JWT token creation and validation
- Security configuration

SECURITY NOTES:
- Uses PBKDF2-SHA256 for password hashing (industry standard)
- JWT tokens expire after 30 minutes by default
- SECRET_KEY must be at least 32 characters
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

import schemas

# Load and validate SECRET_KEY
SECRET_KEY = os.getenv("SECRET_KEY", "")

# Validate SECRET_KEY on module load
if not SECRET_KEY:
    raise ValueError(
        "❌ SECRET_KEY environment variable is required!\n"
        "   Generate one with: openssl rand -hex 32\n"
        "   Then add to your .env file: SECRET_KEY=your_generated_key"
    )

if len(SECRET_KEY) < 32:
    raise ValueError(
        f"❌ SECRET_KEY must be at least 32 characters (currently {len(SECRET_KEY)}).\n"
        "   Generate a secure key with: openssl rand -hex 32"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing context using PBKDF2-SHA256
# This is computationally expensive (good for security - slows down brute force attacks)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: The password entered by the user
        hashed_password: The hash stored in the database
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password for secure storage.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data (usually {"sub": username})
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

