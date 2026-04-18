#!/bin/sh
set -e

echo "J1.Notes startet..."

# DB-Schema anwenden je nach Provider
if [ "$DATABASE_PROVIDER" = "postgresql" ]; then
  echo "PostgreSQL: wende Migrations an..."
  npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss 2>/dev/null || echo "DB-Migration uebersprungen"
else
  echo "SQLite: wende Schema an..."
  npx prisma db push --accept-data-loss 2>/dev/null || echo "DB-Push uebersprungen"
fi

echo "Datenbank bereit"
echo "Server startet auf Port ${PORT:-3000}..."

exec node server.js
