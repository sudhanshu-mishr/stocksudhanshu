# Use official lightweight Python image
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . .

# Ensure the database directory exists and initialize it with data
RUN python backend/data_service.py

# Command to run the application using $PORT env var (defaulting to 8000 if not set)
CMD uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}
