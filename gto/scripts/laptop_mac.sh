#!/usr/bin/env bash
# Runs this Mac's share of the flop library in the background: one process solves, one uploads to the coach.
# The Mac counterpart of laptop_setup.sh + laptop_service.sh (a Mac has no apt and no systemd).
#
#   bash gto/scripts/laptop_mac.sh setup       one time: tools, Python environment, engine (about 10 minutes)
#   bash gto/scripts/laptop_mac.sh start b     start solving laptop B's matchups: sb_bb, sb_limp
#                                              (or "a" for bb_btn_3bet, utg_bb; never the same letter as the other laptop)
#   bash gto/scripts/laptop_mac.sh status      what it's doing now
#   bash gto/scripts/laptop_mac.sh stop        stop both
#
# Keeps the Mac awake while it runs (caffeinate). It stops if the Mac restarts: run "start" again, it carries
# on where it left off and never redoes a flop.
set -euo pipefail

GTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${FU_VENV:-$HOME/fu-env}"
OUT="${FLOPS_DIR:-$HOME/flops}"
ENV_FILE="$HOME/.config/flipup-flops.env"
COACH="${FLIPUP_COACH:-https://flipup-gto.fly.dev}"
RUN="$OUT/run"   # pid files

alive() { [ -f "$RUN/$1.pid" ] && kill -0 "$(cat "$RUN/$1.pid")" 2>/dev/null; }

case "${1:-}" in
  setup)
    [ "$(uname)" = Darwin ] || { echo "This script is for a Mac. On Ubuntu use laptop_setup.sh."; exit 1; }
    if ! command -v brew >/dev/null; then
      echo "Homebrew isn't installed. Install it from https://brew.sh (one command, asks for your password), then run this again."
      exit 1
    fi
    echo "1/4  Installing build tools..."
    brew install cmake libomp python@3.12 git
    echo "2/4  Making the Python environment at $VENV..."
    PY="$(brew --prefix python@3.12)/bin/python3.12"
    [ -d "$VENV" ] || "$PY" -m venv "$VENV"
    # shellcheck disable=SC1091
    source "$VENV/bin/activate"
    pip install --quiet --upgrade pip
    pip install --quiet -r "$GTO_DIR/requirements.txt"
    echo "3/4  Building the engine (a few minutes)..."
    OMP="$(brew --prefix libomp)"
    cd "$GTO_DIR"
    rm -rf build
    cmake -S engine -B build -DPython3_EXECUTABLE="$(which python3)" \
      -DOpenMP_CXX_FLAGS="-Xpreprocessor -fopenmp -I$OMP/include" -DOpenMP_CXX_LIB_NAMES=omp \
      -DOpenMP_omp_LIBRARY="$OMP/lib/libomp.dylib" > /dev/null
    cmake --build build -j"$(sysctl -n hw.ncpu)" --target _engine
    echo "4/4  Checking it loads..."
    python3 -c "from flipup_gto import _engine; print('engine ok')"
    echo; echo "Done. Next: bash $0 start b"
    exit 0 ;;
  status)
    for n in solve upload; do
      if alive $n; then echo "$n: running (pid $(cat "$RUN/$n.pid"))"; else echo "$n: NOT running"; fi
    done
    echo; echo "== solving (last lines of $OUT/log.txt)"; tail -n 6 "$OUT/log.txt" 2>/dev/null || true
    echo; echo "== uploading (last lines of $OUT/upload.txt)"; tail -n 4 "$OUT/upload.txt" 2>/dev/null || true
    echo; echo "== heat: if the underside is too hot to rest a hand on, lift the Mac onto a stand"
    exit 0 ;;
  stop)
    for n in solve upload; do
      if alive $n; then kill "$(cat "$RUN/$n.pid")"; echo "stopped $n"; fi
      rm -f "$RUN/$n.pid"
    done
    pkill -f "scripts/top_up_flops.py" 2>/dev/null || true   # in case caffeinate left the solver behind
    exit 0 ;;
  start) ;;
  *) echo "usage: bash $0 setup | start a|b | status | stop"; exit 1 ;;
esac

case "${2:-}" in
  a) SPOTS="bb_btn_3bet,utg_bb" ;;
  a1) SPOTS="bb_btn_3bet" ;;
  a2) SPOTS="utg_bb" ;;
  b) SPOTS="sb_bb,sb_limp" ;;
  *) echo "usage: bash $0 start a|a1|a2|b"; exit 1 ;;
esac
if [ ! -x "$VENV/bin/python3" ]; then echo "Run setup first: bash $0 setup"; exit 1; fi
if alive solve || alive upload; then echo "Already running. Check it with: bash $0 status"; exit 1; fi

echo "1/3  Upload token"
if [ -z "${FLIPUP_UPLOAD_TOKEN:-}" ] && [ -f "$ENV_FILE" ]; then
  FLIPUP_UPLOAD_TOKEN="$(sed -n 's/^FLIPUP_UPLOAD_TOKEN=//p' "$ENV_FILE")"
fi
if [ -z "${FLIPUP_UPLOAD_TOKEN:-}" ]; then
  read -rsp "Paste the upload token (it won't show): " FLIPUP_UPLOAD_TOKEN; echo
fi
mkdir -p "$(dirname "$ENV_FILE")" "$RUN"
umask 077
printf 'FLIPUP_COACH=%s\nFLIPUP_UPLOAD_TOKEN=%s\n' "$COACH" "$FLIPUP_UPLOAD_TOKEN" > "$ENV_FILE"
umask 022

echo "2/3  Checking the coach and what's left for matchups $SPOTS..."
set -a; source "$ENV_FILE"; set +a
cd "$GTO_DIR"
"$VENV/bin/python3" -u scripts/top_up_flops.py --out "$OUT" --spots "$SPOTS" --dry-run

echo "3/3  Starting (kept awake with caffeinate)..."
nohup caffeinate -dims "$VENV/bin/python3" -u scripts/top_up_flops.py --out "$OUT" --spots "$SPOTS" >> "$OUT/log.txt" 2>&1 &
echo $! > "$RUN/solve.pid"
nohup "$VENV/bin/python3" -u scripts/upload_flops.py --out "$OUT" --spots "$SPOTS" --every 1800 --stop-when-idle 6 >> "$OUT/upload.txt" 2>&1 &
echo $! > "$RUN/upload.pid"
echo
echo "Running. Check on it with:  bash $0 status"
echo "Leave the Mac plugged in. Closing the lid on battery will stop it."
