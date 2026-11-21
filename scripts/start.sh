#!/bin/sh
set -e

FUNNELS_DIR="${FUNNELS_DATA_DIR:-/app/data/funnels}"

# Named volumes are root-owned on first mount — fix before app starts.
mkdir -p "$FUNNELS_DIR"
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs "$FUNNELS_DIR" 2>/dev/null || chown -R 1001:1001 "$FUNNELS_DIR" 2>/dev/null || true
  chmod -R u+rwX,g+rwX,o+rwX "$FUNNELS_DIR" 2>/dev/null || true
fi

# Fail early with a clear log if storage is not writable
if ! su-exec nextjs sh -c "touch \"$FUNNELS_DIR/.write_test\" && rm -f \"$FUNNELS_DIR/.write_test\"" 2>/dev/null; then
  if ! sh -c "touch \"$FUNNELS_DIR/.write_test\" && rm -f \"$FUNNELS_DIR/.write_test\"" 2>/dev/null; then
    echo "[start] ERROR: cannot write to $FUNNELS_DIR — check volume permissions"
  else
    echo "[start] WARNING: funnels dir writable only as root; chmod applied"
    chmod -R a+rwX "$FUNNELS_DIR" || true
  fi
else
  echo "[start] Funnels storage OK: $FUNNELS_DIR"
fi

echo "[start] Waiting for database..."
for i in $(seq 1 30); do
  if node -e "const n=require('net');const s=n.connect(5432,'db',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; then
    echo "[start] Database is up"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[start] Database not reachable"
    exit 1
  fi
  sleep 2
done

run_as_app() {
  if [ "$(id -u)" = "0" ] && command -v su-exec >/dev/null 2>&1; then
    su-exec nextjs "$@"
  else
    "$@"
  fi
}

echo "[start] Running migrations..."
run_as_app node ./node_modules/prisma/build/index.js migrate deploy

echo "[start] Seeding admin user..."
run_as_app node ./scripts/seed-admin.js

echo "[start] Starting Next.js..."
if [ "$(id -u)" = "0" ] && command -v su-exec >/dev/null 2>&1; then
  exec su-exec nextjs node server.js
fi
exec node server.js
