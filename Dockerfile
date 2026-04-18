# Stage 1: Dependencies (with build tools for native addons)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
# Alle Deps (inkl. dev) — tailwindcss, postcss etc. werden zur Build-Zeit gebraucht.
# npm ci kompiliert native Module (better-sqlite3) für die Zielplattform (Linux/Alpine) neu.
RUN npm ci && npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-Argument: sqlite (default) oder postgresql
ARG DATABASE_PROVIDER=sqlite

# Für PostgreSQL-Build das postgres Schema verwenden
RUN if [ "$DATABASE_PROVIDER" = "postgresql" ]; then \
      cp prisma/schema.postgres.prisma prisma/schema.prisma; \
    fi

# Prisma Client generieren
RUN npx prisma generate

# Next.js Build
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/data/j1notes.db
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user für Sicherheit
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Notwendige Dateien kopieren
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# better-sqlite3 nativen Addon für die Zielplattform kopieren
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3

# Uploads-Verzeichnis erstellen (persistiert via Docker Volume)
RUN mkdir -p /app/public/uploads && chown nextjs:nodejs /app/public/uploads

# Daten-Verzeichnis für SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data

# Entrypoint kopieren und ausführbar machen
COPY --from=builder /app/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/docker-entrypoint.sh"]
