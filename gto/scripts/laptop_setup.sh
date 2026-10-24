#!/usr/bin/env bash
# One-time setup for solving on an Ubuntu (or WSL) laptop: tools, a Python environment and the GTO engine.
# Safe to run again. Run it from anywhere:   bash gto/scripts/laptop_setup.sh
set -euo pipefail

GTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${FU_VENV:-$HOME/fu-env}"

echo "1/4  Installing build tools (asks for your Ubuntu password)..."
sudo apt-get update
sudo apt-get install -y git build-essential cmake python3-pip python3-venv python3-dev

echo "2/4  Making the Python environment at $VENV..."
[ -d "$VENV" ] || python3 -m venv "$VENV"
# shellcheck disable=SC1091
source "$VENV/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet -r "$GTO_DIR/requirements.txt"

echo "3/4  Building the engine (a few minutes)..."
cd "$GTO_DIR"
cmake -S engine -B build -DPython3_EXECUTABLE="$(which python3)" > /dev/null
cmake --build build -j"$(nproc)" --target _engine

echo "4/4  Checking it loads..."
python3 -c "from flipup_gto import _engine; print('engine ok')"
echo
echo "Done. Next: bash $GTO_DIR/scripts/laptop_flops.sh"
