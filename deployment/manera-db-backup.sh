#!/bin/bash
# Daily logical backup of the Manera CRM database.
set -euo pipefail

DB_NAME="manera_crm"
BACKUP_DIR="/var/backups/manera-crm"
RETENTION_DAYS=30
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="${BACKUP_DIR}/${DB_NAME}-${STAMP}.sql.gz"

cd /tmp
mkdir -p "${BACKUP_DIR}"

# Write to a temp file first so a failed dump never leaves a truncated backup behind.
TMP="$(mktemp "${BACKUP_DIR}/.inprogress-XXXXXX")"
trap 'rm -f "${TMP}"' EXIT

sudo -u postgres pg_dump --format=plain --no-owner --no-privileges "${DB_NAME}" | gzip -6 > "${TMP}"

# A valid gzip dump of this database is never this small; treat anything smaller as a failure.
SIZE=$(stat -c%s "${TMP}")
if [ "${SIZE}" -lt 1024 ]; then
  echo "backup aborted: dump is only ${SIZE} bytes" >&2
  exit 1
fi
gzip -t "${TMP}"

mv "${TMP}" "${TARGET}"
trap - EXIT
chmod 600 "${TARGET}"

find "${BACKUP_DIR}" -name "${DB_NAME}-*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "backup ok: ${TARGET} ($(du -h "${TARGET}" | cut -f1))"
