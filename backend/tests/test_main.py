from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the CDRRMO File Manager API"}
    
def test_docs():
    response = client.get("/docs")
    assert response.status_code == 200
