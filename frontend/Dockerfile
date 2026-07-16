# syntax=docker/dockerfile:1

# ── Stage 1: deps ────────────────────────────────────────────────────────────
# Nur Abhängigkeiten installieren (eigener Layer für besseres Caching).
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# NEXT_PUBLIC_* wird zur BUILD-Zeit in das Bundle eingebacken → als Build-Arg setzen.
# Prod-Default: relativ (/api/v1), damit die Calls same-origin über den Rewrite-Proxy laufen.
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: runner ──────────────────────────────────────────────────────────
# Schlankes Laufzeit-Image: nur der standalone-Output (server.js + minimale node_modules).
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root Nutzer.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone-Output enthält server.js + die nötigen node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Statische Assets und public/ werden vom standalone-Server NICHT automatisch mitkopiert.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
