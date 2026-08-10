# Deployment & Building Guide

Prepia is designed to be deployed seamlessly across scalable infrastructure.

## Vercel Deployment (Recommended for Frontend)
1. Install the Vercel CLI: 
pm install -g vercel
2. Run ercel in the rontend/ directory.
3. Add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY when prompted.

## Docker Deployment (Self-Hosted)
Prepia includes a docker-compose.yml file for unified backend deployment.
1. Ensure Docker and Docker Compose are installed.
2. Run docker compose up -d --build in the root directory.
3. This will spin up the Node.js API, the Redis server, and the BullMQ background workers.

## Pre-Flight Checklist
- [x] Lighthouse performance score > 90.
- [x] All environment variables are set in the production environment.
- [x] Supabase Auth Redirect URIs include your production domain.
