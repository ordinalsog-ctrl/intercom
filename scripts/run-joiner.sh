#!/usr/bin/env bash
set -euo pipefail

# ============
# Joiner Peer Runner (Intercom / Pear)
# Joins an existing subnet/app created by the admin peer.
#
# Requirements:
# - Node.js >= 22
# - pear installed globally: npm i -g pear
#
# Usage:
#   SUBNET_BOOTSTRAP=<admin-writer-key-hex> bash scripts/run-joiner.sh
#
# Notes:
# - SUBNET_BOOTSTRAP is the 32-byte hex "Peer Writer" key shown by the admin peer.
# ============

# Must be provided (admin peer writer key hex)
SUBNET_BOOTSTRAP="${SUBNET_BOOTSTRAP:-}"

if [[ -z "${SUBNET_BOOTSTRAP}" ]]; then
  echo "ERROR: SUBNET_BOOTSTRAP is required."
  echo "Example:"
  echo "  SUBNET_BOOTSTRAP=<admin-writer-key-hex> bash scripts/run-joiner.sh"
  exit 1
fi

# Must match the admin's subnet channel
SUBNET_CHANNEL="${SUBNET_CHANNEL:-card-rwa-dev}"

# Local store names (folders under stores/)
PEER_STORE="${PEER_STORE:-joiner1}"
MSB_STORE="${MSB_STORE:-joiner1-msb}"

# SC-Bridge (optional for joiner; keep off by default)
SC_BRIDGE="${SC_BRIDGE:-0}"
SC_BRIDGE_HOST="${SC_BRIDGE_HOST:-127.0.0.1}"
SC_BRIDGE_PORT="${SC_BRIDGE_PORT:-8788}"
SC_BRIDGE_TOKEN="${SC_BRIDGE_TOKEN:-CHANGE_ME_TO_A_LONG_RANDOM_TOKEN}"

echo "=== Intercom Joiner Runner ==="
echo "Subnet channel:     ${SUBNET_CHANNEL}"
echo "Subnet bootstrap:   ${SUBNET_BOOTSTRAP}"
echo "Peer store name:    ${PEER_STORE}"
echo "MSB store name:     ${MSB_STORE}"
echo "SC-Bridge enabled:  ${SC_BRIDGE}"
if [[ "${SC_BRIDGE}" == "1" ]]; then
  echo "SC-Bridge endpoint: ws://${SC_BRIDGE_HOST}:${SC_BRIDGE_PORT}"
fi
echo ""
echo "Starting peer via Pear..."
echo ""

# Build command
CMD=(pear run . \
  --peer-store-name "${PEER_STORE}" \
  --msb-store-name "${MSB_STORE}" \
  --subnet-channel "${SUBNET_CHANNEL}" \
  --subnet-bootstrap "${SUBNET_BOOTSTRAP}" \
)

# Optional SC-Bridge for joiner (handy for multi-client demos)
if [[ "${SC_BRIDGE}" == "1" ]]; then
  CMD+=(--sc-bridge 1 --sc-bridge-host "${SC_BRIDGE_HOST}" --sc-bridge-port "${SC_BRIDGE_PORT}" --sc-bridge-token "${SC_BRIDGE_TOKEN}")
fi

"${CMD[@]}"
