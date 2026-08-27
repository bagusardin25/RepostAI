FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY backend ./backend

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV FFMPEG_PATH=/usr/bin/ffmpeg

EXPOSE 8080

CMD ["node", "backend/server.js"]
