"""
Standardized Exception Handling for CDRRMO File Manager

This module provides consistent error responses across the API.

WHY THIS FILE EXISTS:
- Before: Error messages were inconsistent ("File not found" vs "file not found" vs "Not found")
- After: All errors follow the same format, making frontend error handling easier

USAGE:
    from exceptions import AppException
    
    # Instead of:
    raise HTTPException(status_code=404, detail="File not found")
    
    # Use:
    raise AppException.not_found("File")
"""

from fastapi import HTTPException, status


class AppException:
    """
    Centralized exception factory for consistent API error responses.
    
    All methods raise HTTPException with standardized messages.
    """
    
    @staticmethod
    def not_found(resource: str) -> HTTPException:
        """
        Resource not found (404).
        
        Args:
            resource: Name of the resource (e.g., "File", "User", "Directory")
            
        Example:
            raise AppException.not_found("File")
            # Returns: {"detail": "File not found"}
        """
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found"
        )
    
    @staticmethod
    def unauthorized(message: str = "Authentication required") -> HTTPException:
        """
        Authentication required (401).
        
        Example:
            raise AppException.unauthorized()
            # Returns: {"detail": "Authentication required"}
        """
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message,
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    @staticmethod
    def forbidden(message: str = "You don't have permission to perform this action") -> HTTPException:
        """
        Access denied (403).
        
        Example:
            raise AppException.forbidden("Only admins can delete users")
        """
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message
        )
    
    @staticmethod
    def bad_request(message: str) -> HTTPException:
        """
        Invalid request (400).
        
        Example:
            raise AppException.bad_request("Invalid file type")
        """
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    @staticmethod
    def conflict(message: str) -> HTTPException:
        """
        Resource conflict (409).
        
        Example:
            raise AppException.conflict("File already exists")
        """
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message
        )
    
    @staticmethod
    def payload_too_large(message: str = "File size exceeds the maximum allowed limit") -> HTTPException:
        """
        File too large (413).
        
        Example:
            raise AppException.payload_too_large("Maximum file size is 100MB")
        """
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=message
        )
    
    @staticmethod
    def internal_error(message: str = "An unexpected error occurred") -> HTTPException:
        """
        Server error (500).
        
        Example:
            raise AppException.internal_error("Database connection failed")
        """
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=message
        )
