#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/npm-clean-env.sh run lint
./scripts/npm-clean-env.sh run test
./scripts/npm-clean-env.sh run build

required_files=(
  "docs/audits/2026-04-23-product-audit.md"
  "docs/launch/premium-first-choice-execution.md"
  "docs/launch/pulsechain-trust-page.md"
)

for f in "${required_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing required launch file: $f" >&2
    exit 1
  fi
done

echo "Launch readiness checks passed."
