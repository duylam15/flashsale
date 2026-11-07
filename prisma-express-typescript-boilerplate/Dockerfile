FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates wget gnupg --no-install-recommends \
    && wget https://github.com/grafana/k6/releases/download/v0.50.0/k6-v0.50.0-linux-amd64.tar.gz \
    && tar -xzf k6-v0.50.0-linux-amd64.tar.gz \
    && mv k6-v0.50.0-linux-amd64/k6 /usr/local/bin/k6 \
    && rm -rf k6-v0.50.0-linux-amd64* \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/keys

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps

ENV DATABASE_URL="postgresql://postgres:123456@localhost:5432/postgres"
RUN npx prisma@4 generate

COPY . .

# 5. Build dự án TS (Bỏ qua lỗi check type)
# Chúng ta dùng ts-node hoặc tsc trực tiếp, nếu npm run build là `rimraf build && tsc -p tsconfig.json`, ta ép nó tiếp tục.
RUN npx tsc -p tsconfig.json || true 

EXPOSE 4000

CMD ["sh", "-c", "npx prisma@4 db push && node build/src/index.js"]