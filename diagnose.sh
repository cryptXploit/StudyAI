#!/bin/bash
echo "=== DOCKER CONTAINERS ==="
docker ps 2>/dev/null || echo "Docker not running"

echo ""
echo "=== RUNNING NODE PROCESSES ==="
ps aux | grep node | grep -v grep

echo ""
echo "=== PM2 STATUS ==="
~/.npm-global/bin/pm2 list 2>/dev/null || /usr/local/bin/pm2 list 2>/dev/null || $(npm root -g)/pm2/bin/pm2 list 2>/dev/null || echo "PM2 not found in common paths"

echo ""
echo "=== NVM NODE PATH ==="
ls ~/.nvm/versions/node/ 2>/dev/null || echo "NVM not found"

echo ""
echo "=== SYSTEMD SERVICES ==="
systemctl list-units --type=service --state=running 2>/dev/null | grep -i -E "node|study|backend|api"

echo ""
echo "=== BACKEND ENV (REDIS/BULL keys only) ==="
grep -E "REDIS|BULL|QUEUE|SUPABASE_URL" /home/azureuser/StudyAI/backend/.env 2>/dev/null | sed 's/=.*/=***HIDDEN***/'

echo ""
echo "=== RECENT SYSTEM LOGS ==="
journalctl -n 30 --no-pager 2>/dev/null | tail -30

echo ""
echo "=== BACKEND LOGS (if pm2) ==="
ls ~/.pm2/logs/ 2>/dev/null && tail -50 ~/.pm2/logs/*.err.log 2>/dev/null
