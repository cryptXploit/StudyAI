# BullMQ Background Workers Quickstart

Background processing is the backbone of Prepia's performance. Instead of blocking the API thread during heavy AI tasks, we offload them to BullMQ.

## What the Workers Do
1. **Document Processing (extract-and-embed)**: Splits uploaded PDFs, extracts text/images, and uses Gemini Vision for OCR.
2. **Vector Generation**: Converts text into vector embeddings and stores them in Supabase pgvector.

## How to Run Locally
1. Make sure Redis is running: docker run -p 6379:6379 -d redis
2. Start the backend server: cd backend && npm run dev
3. The Express server automatically spins up the BullMQ workers listening on the documentQueue.

## Error Handling
If a worker hits an API rate limit (e.g., Gemini 429), it automatically pauses and retries. If a task fails completely, the database status is updated to ailed so the frontend UI can reflect the error state.
