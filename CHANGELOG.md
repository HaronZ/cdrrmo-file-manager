# Changelog

All notable changes to the CDRRMO File Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-29

### Added
- **Authentication System**
  - JWT-based authentication with secure token management
  - Role-based access control (Admin vs Staff)
  - Password hashing using PBKDF2-SHA256
  - First registered user automatically becomes admin

- **File Management**
  - Upload files with drag-and-drop support
  - Download individual files or bulk download as ZIP
  - File versioning with rollback capability
  - Support for PDF, DOCX, XLSX, PPTX formats
  - 100MB maximum file size

- **Folder Organization**
  - Three default departments: Operation, Research, Training
  - Create custom subdirectories (Admin only)
  - Navigate with breadcrumb navigation

- **Task Assignment**
  - Assign files to users with instructions
  - Set due dates for tasks
  - Track task status (Pending, In Progress, Done)
  - View overdue tasks

- **Notifications**
  - In-app notification system
  - Task assignment notifications
  - Mark as read / Mark all as read

- **Dashboard & Analytics**
  - File distribution charts
  - Storage usage statistics
  - Task completion metrics
  - Recent activity feed

- **User Management (Admin)**
  - View all users
  - Update user roles
  - Delete users
  - Activity logging

- **UI/UX Features**
  - Dark mode support
  - Responsive design
  - Loading skeletons
  - Toast notifications

- **DevOps**
  - Docker support with docker-compose
  - GitHub Actions CI/CD pipeline
  - Multi-stage Docker builds

### Security
- Path traversal protection
- File type validation (whitelist)
- CORS configuration
- SQL injection protection via SQLAlchemy ORM

---

## [Unreleased]

### Planned
- Email notifications
- File sharing with external users
- Advanced search filters
- Audit log export
