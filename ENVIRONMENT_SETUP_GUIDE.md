# Environment Variables & Credentials Setup

To run Prepia locally and in production, you must configure the environment variables correctly.

## Frontend (rontend/.env.local)
You need the following keys from your Supabase Dashboard (Settings > API):
`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`

## Backend (ackend/.env)
The backend requires access to Supabase Service keys, Gemini APIs, and Redis:
`env
# Supabase Admin
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Providers
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Webhooks
SMS_SECRET_HEADER=your_secret_password
`

**Security Warning**: Never commit your .env files. They are already added to .gitignore.
