#!/bin/bash
set -e

echo "=== Copying updated files to server ==="
# Files will be copied via scp before this script runs

echo "=== Rebuilding Docker container ==="
cd /home/azureuser/StudyAI
docker compose build backend 2>&1 | tail -20

echo "=== Restarting backend container ==="
docker compose up -d backend

echo "=== Waiting 5s for startup ==="
sleep 5

echo "=== Container status ==="
docker ps | grep studyai-backend

echo "=== Last 30 lines of logs ==="
docker logs studyai-backend-1 --tail 30 2>&1

echo "=== DONE ==="
