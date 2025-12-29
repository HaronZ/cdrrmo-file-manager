# CDRRMO File Manager

A full-stack file management system designed for the City Disaster Risk Reduction and Management Office (CDRRMO). Built with FastAPI (Python) backend and React (Vite) frontend.

## Features

- 🔐 **Secure Authentication** - JWT-based authentication with role-based access control
- 📁 **File Management** - Upload, download, organize files in department folders (Operation, Research, Training)
- 👥 **User Management** - Admin panel for managing users and permissions
- 📝 **Task Assignment** - Assign files to users with instructions
- 📊 **Dashboard Analytics** - Overview of files, users, and recent activity
- 🌙 **Dark Mode** - Theme toggle for user preference
- 📋 **Activity Logging** - Comprehensive audit trail of all actions

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT with python-jose
- **Password Hashing**: Passlib with PBKDF2

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cdrrmo-file-manager.git
   cd cdrrmo-file-manager
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your values**
   ```env
   DB_USER=postgres
   DB_PASSWORD=your_secure_password
   SECRET_KEY=your_secret_key_here  # Generate with: openssl rand -hex 32
   ```

4. **Start the application**
   ```bash
   docker-compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Local Development

#### Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | Required |
| `DB_NAME` | Database name | `cdrrmo_db` |
| `SECRET_KEY` | JWT secret key | Required |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration | `30` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173` |
| `VITE_API_URL` | Frontend API URL | `http://localhost:8000` |

---

## API Documentation

### Authentication

#### Login
```http
POST /users/token
Content-Type: application/x-www-form-urlencoded

username=admin&password=secret
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "is_admin": true
  }
}
```

#### Register User
```http
POST /users/
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123"
}
```

---

### Users

#### Get Current User
```http
GET /users/me
Authorization: Bearer <token>
```

#### List All Users (Admin only)
```http
GET /users/?skip=0&limit=100&search=query
Authorization: Bearer <token>
```

#### Update User (Admin only)
```http
PUT /users/{user_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "updated_name",
  "is_admin": false
}
```

#### Delete User (Admin only)
```http
DELETE /users/{user_id}
Authorization: Bearer <token>
```

---

### Files

#### List Files in Directory
```http
GET /files/?path=/Operation&search=report
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "filename": "report.pdf",
    "folder": "Operation",
    "owner_id": 1,
    "assigned_to_id": 2,
    "instruction": "Review and approve",
    "status": "Pending",
    "created_at": "2024-01-15T10:30:00",
    "is_dir": false,
    "size": 1024000
  }
]
```

#### Upload File
```http
POST /files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

folder: /Operation
file: <binary>
assigned_to_id: 2 (optional)
instruction: "Please review" (optional)
overwrite: false (optional)
```

#### Download File
```http
GET /files/download/{file_id}
Authorization: Bearer <token>
```

#### Delete File
```http
DELETE /files/{file_id}
Authorization: Bearer <token>
```

#### Create Directory (Admin only)
```http
POST /files/dir
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

path=/NewFolder
```

#### Delete Directory (Admin only)
```http
DELETE /files/dir/{folder_path}
Authorization: Bearer <token>
```

#### Update File Status
```http
PUT /files/{file_id}/status
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

status=Done
```

#### Get Assigned Files (Current User)
```http
GET /files/assigned
Authorization: Bearer <token>
```

#### Get All Assigned Files (Admin only)
```http
GET /files/all_assigned
Authorization: Bearer <token>
```

#### Batch Delete Files
```http
POST /files/batch/delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "file_ids": [1, 2, 3]
}
```

#### Batch Download Files (as ZIP)
```http
POST /files/batch/download
Authorization: Bearer <token>
Content-Type: application/json

{
  "file_ids": [1, 2, 3]
}
```

---

### Statistics (Admin only)

#### Get Dashboard Stats
```http
GET /stats/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_users": 10,
  "total_files": 150,
  "folder_distribution": {
    "Operation": 50,
    "Research": 60,
    "Training": 40
  },
  "recent_activities": [...],
  "users": [...]
}
```

---

### Activity Logs (Admin only)

#### Get Activity Logs
```http
GET /activity_logs/?skip=0&limit=100
Authorization: Bearer <token>
```

---

## Allowed File Types

- PDF (`.pdf`)
- Word (`.docx`)
- Excel (`.xlsx`)
- PowerPoint (`.pptx`)

Maximum file size: **100 MB**

---

## Project Structure

```
Project/
├── backend/
│   ├── routers/           # API route handlers
│   │   ├── files.py       # File operations
│   │   ├── users.py       # User management
│   │   └── stats.py       # Statistics
│   ├── main.py            # FastAPI application
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   ├── crud.py            # Database operations
│   ├── security.py        # JWT & password utilities
│   ├── dependencies.py    # Dependency injection
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   └── services/      # API service layer
│   └── package.json       # Node dependencies
├── docker-compose.yml     # Container orchestration
└── .env.example           # Environment template
```

---

## License

This project is proprietary software for CDRRMO internal use.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
