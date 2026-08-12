#!/bin/bash
echo "=== BACKEND CONTAINER LOGS (last 100 lines) ==="
docker logs studyai-backend-1 --tail 100 2>&1

echo ""
echo "=== BACKEND CONTAINER ERRORS ONLY ==="
docker logs studyai-backend-1 --tail 200 2>&1 | grep -iE "error|fail|warn|exception|upload|index|worker|queue|bull|redis" | tail -50

echo ""
echo "=== WORKER PROCESS CHECK ==="
docker exec studyai-backend-1 ps aux 2>/dev/null | grep -v grep

echo ""
echo "=== BACKEND ENV VARS (sensitive hidden) ==="
docker exec studyai-backend-1 env 2>/dev/null | grep -E "REDIS|BULL|GEMINI|GOOGLE|SUPABASE_URL|NODE_ENV" | sed 's/=.*/=***/'

echo ""
echo "=== REDIS CONNECTION CHECK ==="
docker exec studyai-redis-1 redis-cli ping 2>/dev/null

echo ""
echo "=== BULL QUEUE STATUS (via redis) ==="
docker exec studyai-redis-1 redis-cli keys "*bull*" 2>/dev/null | head -20
