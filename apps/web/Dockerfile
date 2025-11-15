# Railway-optimized Next.js Dockerfile with dedicated development and production stages

# Base dependencies stage
FROM node:18-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./

RUN npm install

# Development stage used by docker-compose for local development
FROM base AS development

ENV NODE_ENV=development

COPY . .

# Production build stage
FROM base AS builder

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Accept build-time environment variables for NEXT_PUBLIC_* vars
# These must be set in Railway before building
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY . .

RUN npm run build

# Production runtime stage (Railway default)
FROM node:18-alpine AS production

WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
