import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, configure_mappers
from sqlalchemy.pool import StaticPool
import os

from main import app
from database import Base
from dependencies import get_db
import models

# --- Setup Test DB ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_comprehensive.db"

if os.path.exists("./test_comprehensive.db"):
    os.remove("./test_comprehensive.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

configure_mappers()

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

import shutil

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Patch BASE_DIR to use a temp directory
    TEST_BASE_DIR = "TEST_CDRRMO_FILES"
    if os.path.exists(TEST_BASE_DIR):
        shutil.rmtree(TEST_BASE_DIR)
    os.makedirs(TEST_BASE_DIR)
    
    # We need to patch it in main and routers.files
    # Since we import app from main, and main imports routers, they are already loaded.
    # We can patch them directly.
    import main
    import routers.files
    
    original_main_base_dir = main.BASE_DIR
    original_router_base_dir = routers.files.BASE_DIR
    
    main.BASE_DIR = TEST_BASE_DIR
    routers.files.BASE_DIR = TEST_BASE_DIR
    
    models.Base.metadata.create_all(bind=engine)
    yield
    models.Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_comprehensive.db"):
        os.remove("./test_comprehensive.db")
    
    # Cleanup temp dir
    if os.path.exists(TEST_BASE_DIR):
        shutil.rmtree(TEST_BASE_DIR)
        
    # Restore (though module scope means it ends here anyway)
    main.BASE_DIR = original_main_base_dir
    routers.files.BASE_DIR = original_router_base_dir

# --- Fixtures ---

@pytest.fixture(scope="module")
def admin_token():
    # Register admin
    client.post("/users/", json={"username": "admin", "password": "password123"})
    # Login admin
    response = client.post("/users/token", data={"username": "admin", "password": "password123"})
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def uploaded_file(admin_token):
    files = {'file': ('fixture_test.txt', b'Fixture Content', 'text/plain')}
    response = client.post(
        "/files/upload/", 
        headers={"Authorization": f"Bearer {admin_token}"},
        files=files,
        data={"folder": "Operation"}
    )
    assert response.status_code == 200
    return response.json()

@pytest.fixture(scope="module")
def user_token():
    # Register user
    client.post("/users/", json={"username": "user", "password": "password123"})
    # Login user
    response = client.post("/users/token", data={"username": "user", "password": "password123"})
    return response.json()["access_token"]

# --- Tests ---

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the CDRRMO File Manager API"}

# 1. Authentication & User Management

def test_register_duplicate_admin(admin_token):
    # Try to register admin again (should fail or return 400 if unique constraint)
    # But our logic says first user is admin. "admin" is already created by fixture.
    response = client.post("/users/", json={"username": "admin", "password": "password123"})
    assert response.status_code == 400

def test_get_users_as_admin(admin_token, user_token):
    response = client.get("/users/", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert len(response.json()) >= 2

def test_get_users_as_regular_user_forbidden(user_token):
    response = client.get("/users/", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code in [403, 401]

# 2. File Operations

def test_upload_file(admin_token):
    files = {'file': ('test.txt', b'Hello World', 'text/plain')}
    response = client.post(
        "/files/upload/", 
        headers={"Authorization": f"Bearer {admin_token}"},
        files=files,
        data={"folder": "Operation"}
    )
    assert response.status_code == 200
    assert response.json()["filename"] == "test.txt"

def test_list_files(admin_token, uploaded_file):
    response = client.get("/files/?path=Operation", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert len(response.json()) >= 1
    # Check if our fixture file is there
    filenames = [f["filename"] for f in response.json()]
    assert "fixture_test.txt" in filenames

def test_update_file_instruction(admin_token, uploaded_file):
    # Get file ID first (we can just use uploaded_file["id"] directly, but let's verify list works)
    # But wait, uploaded_file fixture returns the file object.
    file_id = uploaded_file["id"]
    
    response = client.put(
        f"/files/{file_id}/instruction",
        headers={"Authorization": f"Bearer {admin_token}"},
        data={"instruction": "Review this file"}
    )
    assert response.status_code == 200
    assert response.json()["instruction"] == "Review this file"

def test_delete_file(admin_token):
    # Upload another file to delete
    files = {'file': ('delete_me.txt', b'Delete Me', 'text/plain')}
    client.post(
        "/files/upload/", 
        headers={"Authorization": f"Bearer {admin_token}"},
        files=files,
        data={"folder": "Research"}
    )
    
    # Get file ID
    file_list = client.get("/files/?path=Research", headers={"Authorization": f"Bearer {admin_token}"}).json()
    file_id = file_list[0]["id"]
    
    response = client.delete(f"/files/{file_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["message"] == f"File 'delete_me.txt' deleted successfully"

# 3. Activity Logs

def test_activity_logs(admin_token, uploaded_file):
    response = client.get("/activity_logs/", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert len(response.json()) > 0
