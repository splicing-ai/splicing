#!/bin/bash

# Function to handle Redis shutdown
shutdown_redis() {
    echo "Shutting down Redis..."

    # Save Redis data
    echo "Saving Redis data..."
    redis-cli SAVE

    # Stop Redis
    echo "Stopping Redis..."
    redis-cli SHUTDOWN

    exit 0
}

# Set up signal trap for Redis
trap shutdown_redis SIGTERM SIGINT

# Create the persistent directory if it doesn't exist
mkdir -p /app/.splicing

# Start Redis in the background with persistence
echo "Starting Redis..."
redis-server --dir /app/.splicing --daemonize yes

# Change to frontend directory and start Next.js
cd /app/splicing/frontend
echo "Starting Frontend..."
npm start &

# Change to backend directory and start FastAPI in development mode with auto-reload
cd /app/splicing/backend
echo "Starting Backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
