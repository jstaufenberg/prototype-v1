#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DEST_DIR="$ROOT_DIR/prototype-app/src/mock-data"
SRC_DIR="$ROOT_DIR/data/ehr-mock-data"

mkdir -p "$DEST_DIR"
cp "$SRC_DIR"/pt-0*-*.json "$DEST_DIR"/
cp "$SRC_DIR"/reference-*.json "$DEST_DIR"/
cp "$SRC_DIR"/schema-v1.json "$DEST_DIR"/

echo "Mock data synced to $DEST_DIR"
