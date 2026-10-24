#!/usr/bin/env bash
# Solve flops on the laptop in the foreground, until each matchup has all 1,755 flops, counting what's already in
# ~/flops and (once laptop_service.sh has saved the coach's address and token) what the coach already has.
# For running nonstop in the background with uploads, use laptop_service.sh instead. Extra arguments go to
# top_up_flops.py, for example:
#   bash gto/scripts/laptop_flops.sh --dry-run                    show what's left, solve nothing
#   bash gto/scripts/laptop_flops.sh --spots sb_bb,sb_limp        only these matchups (the other laptop does the rest)
#   bash gto/scripts/laptop_flops.sh --max-hours 8                stop after eight hours
# Stop any time with Ctrl+C. Run it again and it carries on where it left off. Progress is also written to
# ~/flops/log.txt.
set -euo pipefail

GTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${FU_VENV:-$HOME/fu-env}"
OUT="${FLOPS_DIR:-$HOME/flops}"

if [ ! -f "$VENV/bin/activate" ]; then
  echo "No Python environment at $VENV. Run: bash $GTO_DIR/scripts/laptop_setup.sh"
  exit 1
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"
mkdir -p "$OUT"
ENV_FILE="$HOME/.config/flipup-flops.env"
# shellcheck disable=SC1090
if [ -f "$ENV_FILE" ]; then set -a; source "$ENV_FILE"; set +a; fi
cd "$GTO_DIR"
python3 -u scripts/top_up_flops.py --out "$OUT" "$@" 2>&1 | tee -a "$OUT/log.txt"
