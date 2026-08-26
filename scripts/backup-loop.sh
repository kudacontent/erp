#!/bin/sh
set -eu

mkdir -p /backups

while true; do
  stamp="$(date +%Y%m%d-%H%M%S)"
  file="/backups/kudalabs-erp-${stamp}.dump"

  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h db \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -Fc \
    -f "${file}"

  find /backups -name "kudalabs-erp-*.dump" -mtime +30 -delete
  sleep 86400
done
