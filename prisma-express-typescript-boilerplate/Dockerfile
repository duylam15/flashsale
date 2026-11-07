# Stage 1: Build Backend
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

RUN npx prisma generate

COPY . .

RUN npm run build


# Stage 2: Download K6
FROM node:20-bookworm-slim AS k6-downloader

WORKDIR /tmp

RUN apt-get update 
    && apt-get install -y --no-install-recommends wget ca-certificates 
    && wget -q https://github.com/grafana/k6/releases/download/v0.50.0/k6-v0.50.0-linux-amd64.tar.gz 
    && tar -xzf k6-v0.50.0-linux-amd64.tar.gz 
    && mv k6-v0.50.0-linux-amd64/k6 /usr/local/bin/k6 
    && rm -rf /var/lib/apt/lists/*


# Stage 3: Production
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update 
    && apt-get install -y --no-install-recommends openssl ca-certificates 
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts

COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

# Copy Prisma Client đã generate
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy K6 binary
COPY --from=k6-downloader /usr/local/bin/k6 /usr/local/bin/k6

# Copy K6 test scripts (FIX)
COPY --from=builder /app/src/tests ./src/tests

RUN mkdir -p /app/keys

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && node build/src/index.js"]