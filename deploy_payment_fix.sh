#!/bin/bash
echo "=== Moving fixed payment controller into project ==="
cp /home/azureuser/payment.controller.ts /home/azureuser/StudyAI/backend/src/controllers/payment.controller.ts

echo "=== Rebuilding Docker container ==="
cd /home/azureuser/StudyAI
docker compose build backend 2>&1 | tail -30

echo "=== Restarting backend ==="
docker compose up -d backend

echo "=== Waiting 8s for startup ==="
sleep 8

echo "=== Container status ==="
docker ps | grep studyai

echo "=== DONE ==="
