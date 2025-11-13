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

COPY . .

RUN npm run build

# Production runtime stage (Railway default)
FROM node:18-alpine AS production

WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app ./

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE $PORT

ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
