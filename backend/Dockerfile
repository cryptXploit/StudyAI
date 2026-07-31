FROM node:22-bookworm-slim AS build

WORKDIR /app

# Install yt-dlp as system binary (for hybrid transcript engine)
RUN apt-get update && apt-get install -y ca-certificates curl --no-install-recommends \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY backend ./backend
RUN npx tsc -p backend/tsconfig.production.json

FROM node:22-bookworm-slim AS production

WORKDIR /app
ENV NODE_ENV=production

# Install yt-dlp in production stage too (python3 needed to run yt-dlp)
RUN apt-get update && apt-get install -y ca-certificates curl python3 --no-install-recommends \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist

EXPOSE 5000
CMD ["npm", "run", "start", "--workspace=backend"]
