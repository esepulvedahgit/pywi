#!/bin/sh
set -e

# Ensure the data directory exists and is owned by the node user (UID 1000).
# This handles the case where ./data is bind-mounted from a host directory
# owned by root — without this the node process gets EACCES on first write.
mkdir -p /app/data/app_data
chown -R node:node /app/data
# dist/ is an anonymous volume created as root — make it writable by node
mkdir -p /app/dist
chown node:node /app/dist

# Drop privileges: exec the CMD as the node user
exec gosu node "$@"
