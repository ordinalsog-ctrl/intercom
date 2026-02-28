#!/usr/bin/env bash
set -euo pipefail

# ============
# Admin Peer Runner (Intercom / Pear)
# Creates a new subnet/app and exposes SC-Bridge for local clients/apps.
#
# Requirements:
# - Node.js >= 22
# - pear installed globally: npm i -g pear
#
# Usage:
#   bash scripts/run-admin.sh
#
# After first run:
# - Copy the "Peer Writer" key (32-byte hex) from the output.
#   You will need it as --subnet-bootstrap for joiners.
# ============

# Pick a stable subnet channel name for your dev app.
# Change this if you want a new "app instance".
SUBNET_CHANNEL="${SUBNET_CHANNEL:-card-rwa-dev}"

# Local store names (folders under stores/).
PEER_STORE="${PEER_STORE:-admin}"
MSB_STORE="${MSB_STORE:-admin-msb}"

# SC-Bridge
SC_BRIDGE_HOST="${SC_BRIDGE_HOST:-127.0.0.1}"
SC_BRIDGE_PORT="${SC_BRIDGE_PORT:-8787}"

# Set a token for SC-Bridge authentication.
# IMPORTANT: Change this value before sharing anything publicly.
SC_BRIDGE_TOKEN="${SC_BRIDGE_TOKEN:-CHANGE_ME_TO_A_LONG_RANDOM_TOKEN}"

echo "=== Intercom Admin Runner ==="
echo "Subnet channel:      ${SUBNET_CHANNEL}"
echo "Peer store name:     ${PEER_STORE}"
echo "MSB store name:      ${MSB_STORE}"
echo "SC-Bridge endpoint:  ws://${SC_BRIDGE_HOST}:${SC_BRIDGE_PORT}"
echo "SC-Bridge token set: ${SC_BRIDGE_TOKEN}"
echo ""
echo "Starting peer via Pear..."
echo ""

pear run . \
  --peer-store-name "${PEER_STORE}" \
  --msb-store-name "${MSB_STORE}" \
  --subnet-channel "${SUBNET_CHANNEL}" \
  --sc-bridge 1 \
  --sc-bridge-host "${SC_BRIDGE_HOST}" \
  --sc-bridge-port "${SC_BRIDGE_PORT}" \
  --sc-bridge-token "${SC_BRIDGE_TOKEN}"
