# =============================================================================
# JoonaPay USDC Wallet API - Production Dockerfile
# =============================================================================
# Multi-stage build for optimized production image
# Uses Bun for fast dependency installation and building
# Final image: ~150MB (Alpine-based)
#
# Usage:
#   docker build -t usdc-wallet-api .
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies - Install dependencies with Bun (10-20x faster)
# -----------------------------------------------------------------------------
FROM oven/bun:1-alpine AS deps

# Install build dependencies for native modules (bcrypt, sharp)
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock* ./
COPY packages/ ./packages/

# Install all dependencies (bun is 10-20x faster than npm)
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# -----------------------------------------------------------------------------
# Stage 2: Builder - Build the application
# -----------------------------------------------------------------------------
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/ ./packages/

# Re-link workspace packages (bun symlinks resolve to host paths)
RUN rm -rf node_modules/@joonapay/verify-hq-sdk && \
    mkdir -p node_modules/@joonapay && \
    ln -s ../../packages/verify-hq-sdk node_modules/@joonapay/verify-hq-sdk

# Copy source code and config files needed for build
COPY src ./src
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY tsconfig.prod.json ./
COPY nest-cli.json ./

# Build the application using bun
RUN bun run build

# Remove devDependencies for smaller production image
RUN bun install --production

# -----------------------------------------------------------------------------
# Stage 3: Runner - Minimal production image (Node.js for runtime)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Labels for container registry
LABEL org.opencontainers.image.title="JoonaPay USDC Wallet API"
LABEL org.opencontainers.image.description="NestJS API for USDC Wallet"
LABEL org.opencontainers.image.vendor="JoonaPay"
LABEL org.opencontainers.image.source="https://github.com/joonapay/usdc-wallet"

# Install runtime dependencies
# - vips: image processing for sharp
# - dumb-init: proper PID 1 signal handling
# - curl: for health checks (more reliable than wget)
# - tini: alternative init system (optional, using dumb-init)
RUN apk add --no-cache \
    vips \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user and group for security
# Using fixed UID/GID for consistency across environments
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Create app directory with proper ownership
WORKDIR /app
RUN chown nestjs:nodejs /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built application from builder stage
# Order matters: most stable files first for better layer caching
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.prod.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY .env.docker .env

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check with curl (more reliable than node script)
# - interval: how often to check
# - timeout: how long to wait for response
# - start-period: grace period for container startup
# - retries: number of consecutive failures before unhealthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Use dumb-init as PID 1 for proper signal handling
# This ensures:
# - SIGTERM is properly forwarded to Node.js
# - Zombie processes are reaped
# - Clean shutdown on container stop
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
# Using exec form to ensure node receives signals
ENV TS_NODE_PROJECT=tsconfig.prod.json
CMD ["node", "-r", "tsconfig-paths/register", "dist/src/main.js"]
