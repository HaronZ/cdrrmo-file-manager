# =============================================================================
# CDRRMO File Manager - Backend Dockerfile
# =============================================================================
# This Dockerfile creates a production-ready container for the FastAPI backend.
#
# HEALTHCHECK EXPLAINED:
# - Docker checks if the app is healthy by calling /health every 30 seconds
# - If 3 checks fail in a row, the container is marked "unhealthy"
# - Orchestrators (Docker Compose, Kubernetes) can restart unhealthy containers
# =============================================================================

FROM python:3.9-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for files if it doesn't exist
RUN mkdir -p "CDRRMO files"

# Health check - Docker will call this to verify the app is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

