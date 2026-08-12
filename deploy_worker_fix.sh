#!/bin/bash
echo "=== Moving fixed worker files into project ==="
cp /home/azureuser/worker.ts /home/azureuser/StudyAI/backend/src/queue/worker.ts
cp /home/azureuser/fileProcessing.worker.ts /home/azureuser/StudyAI/backend/src/workers/fileProcessing.worker.ts

echo "=== Rebuilding Docker container ==="
cd /home/azureuser/StudyAI
docker compose build backend 2>&1 | tail -30

echo "=== Restarting backend ==="
docker compose up -d backend

echo "=== Waiting 8s for startup ==="
sleep 8

echo "=== Container status ==="
docker ps | grep studyai

echo "=== Last 40 lines of logs ==="
docker logs studyai-backend-1 --tail 40 2>&1

echo "=== DONE ==="
