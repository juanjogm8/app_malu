#!/usr/bin/env bash
# Corre las migraciones y las pruebas SQL contra un Postgres desechable.
# Uso: pnpm test:sql            (levanta un clúster temporal con initdb/pg_ctl)
#      DATABASE_URL=... pnpm test:sql   (usa una base vacía existente, p. ej. en CI)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP=""
RUNAS=()

cleanup() {
  if [[ -n "$TMP" ]]; then
    "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$TMP"
  fi
}
trap cleanup EXIT

if [[ -z "${DATABASE_URL:-}" ]]; then
  PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
  [[ -x "$PGBIN/initdb" ]] || { echo "No encontré initdb; define PGBIN o DATABASE_URL"; exit 1; }
  TMP="$(mktemp -d)"
  if [[ "$(id -u)" == "0" ]]; then chown -R postgres "$TMP"; RUNAS=(runuser -u postgres --); fi
  "${RUNAS[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p 54329 -c listen_addresses=''" -w start >/dev/null
  DATABASE_URL="postgresql://postgres@/postgres?host=$TMP&port=54329"
fi

export PGOPTIONS="-c client_min_messages=error"
PSQL=(psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -o /dev/null)
"${PSQL[@]}" -f "$ROOT/tests/sql/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f"
done
for f in "$ROOT"/tests/sql/[1-9]*.sql; do
  echo "▶ $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "✔ Pruebas SQL en verde"
