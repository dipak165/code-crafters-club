# ---------- Dependencies ----------
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Install OpenSSL
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./

RUN npm ci --omit=dev


# ---------- Build ----------
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Install OpenSSL BEFORE Prisma generate
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./

RUN npm ci

COPY server ./

# Generate Prisma Client inside Linux Docker environment
RUN npx prisma generate --schema=./prisma/schema.prisma


# ---------- Production ----------
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

# IMPORTANT: Install OpenSSL in runtime container
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r app && useradd -r -g app app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy generated Prisma engine
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy application code
COPY server ./

# Storage directory
RUN mkdir -p storage \
    && chown -R app:app /app

VOLUME ["/app/storage"]

USER app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]