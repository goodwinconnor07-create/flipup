#!/usr/bin/env bash
# Ubuntu runner. Does not change lid settings, deploy, upload, or modify old flop jobs.
set -euo pipefail
GTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${FU_NET_VENV:-$HOME/flipup-net-env}"
DATA="${FU_NET_DATA:-$HOME/flipup-network-data}"
THREADS="${FU_NET_THREADS:-2}"
MEMORY="${FU_NET_MEMORY_MB:-2048}"
HOURS="${FU_NET_HOURS:-8}"
SAMPLES="${FU_NET_SAMPLES:-10000}"
LIBRARY="${FLOPS_DIR:-$HOME/flops}"
case "${1:-}" in
  setup)
    sudo apt-get update
    sudo apt-get install -y git build-essential cmake python3-venv python3-dev tmux rsync
    [ -d "$VENV" ] || python3 -m venv "$VENV"
    "$VENV/bin/python" -m pip install -r "$GTO_DIR/requirements.txt"
    cmake -S "$GTO_DIR/engine" -B "$GTO_DIR/build-network" -DPython3_EXECUTABLE="$VENV/bin/python"
    cmake --build "$GTO_DIR/build-network" -j "$THREADS" --target _engine test_solver
    (cd "$GTO_DIR" && OMP_NUM_THREADS="$THREADS" "$VENV/bin/python" -c 'from flipup_gto import _engine; print("engine ready")')
    echo "Setup complete. Stop other heavy solving jobs first; then: bash $0 start river (laptop A), or start turn (laptop B)."
    ;;
  start)
    STREET="${2:?use start river or start turn}"
    case "$STREET" in river) WORKER=0;; turn) WORKER=1;; *) echo 'choose river or turn' >&2; exit 1;; esac
    [ -x "$VENV/bin/python" ] || { echo "Run setup first" >&2; exit 1; }
    mkdir -p "$DATA"
    SESSION="flipup-net-$STREET"
    if tmux has-session -t "$SESSION" 2>/dev/null; then echo "$SESSION already running"; exit 1; fi
    # Quote every path/argument once, including paths with spaces.
    CMD=("$VENV/bin/python" -u "$GTO_DIR/scripts/generate_value_data.py" --street "$STREET" --worker "$WORKER"
         --out "$DATA/$STREET-worker$WORKER" --samples "$SAMPLES" --memory-mb "$MEMORY" --max-hours "$HOURS")
    [ "$STREET" != turn ] || CMD+=(--library "$LIBRARY")
    printf -v LINE '%q ' env "OMP_NUM_THREADS=$THREADS" OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 "${CMD[@]}"
    printf -v LOG '%q' "$DATA/$STREET.log"
    tmux new-session -d -s "$SESSION" "set -o pipefail; $LINE >> $LOG 2>&1"
    echo "Started $SESSION; budget $HOURS hours (checked between samples), $THREADS threads, $MEMORY MB engine storage cap."
    echo "Keep the laptop plugged in and awake with the lid open. This tmux job survives terminal closure, not a reboot."
    echo "Check: bash $0 status"
    ;;
  status)
    tmux list-sessions 2>/dev/null || true
    for STREET in river turn; do
      [ ! -f "$DATA/$STREET.log" ] || { echo "== $STREET =="; tail -n 8 "$DATA/$STREET.log"; }
    done
    ;;
  stop)
    STREET="${2:?use stop river or stop turn}"
    case "$STREET" in river|turn) ;; *) exit 1;; esac
    tmux send-keys -t "flipup-net-$STREET" C-c
    echo "Interrupt sent. The current solve may need to finish its C++ batch; completed files remain safe."
    ;;
  *) echo "usage: bash $0 setup|start river|start turn|status|stop river|stop turn"; exit 1;;
esac
