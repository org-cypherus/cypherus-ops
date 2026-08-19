FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_USE_MOCKS=false
ARG NEXT_PUBLIC_PLATFORM_ADMIN_DOMAINS=cypherops.com.br
ARG NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS=
ENV NEXT_PUBLIC_USE_MOCKS=$NEXT_PUBLIC_USE_MOCKS
ENV NEXT_PUBLIC_PLATFORM_ADMIN_DOMAINS=$NEXT_PUBLIC_PLATFORM_ADMIN_DOMAINS
ENV NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS=$NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
