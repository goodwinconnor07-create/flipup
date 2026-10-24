#!/usr/bin/env bash
# Solve flops on the laptop until each matchup has 20% of the 1,755 flops (351), counting what's already in
# ~/flops. Extra arguments go to top_up_flops.py, for example:
#   bash gto/scripts/laptop_flops.sh --dry-run                  show what's left, solve nothing
#   bash gto/scripts/laptop_flops.sh --spots btn_bb,co_bb,utg_bb   only these matchups (the other laptop does the rest)
#   bash gto/scripts/laptop_flops.sh --max-hours 8              stop after eight hours
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
cd "$GTO_DIR"
python3 -u scripts/top_up_flops.py --out "$OUT" "$@" 2>&1 | tee -a "$OUT/log.txt"
