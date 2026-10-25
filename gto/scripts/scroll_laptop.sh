#!/usr/bin/env bash
set -euo pipefail
GTO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${FU_NET_VENV:-$HOME/flipup-net-env}"
CONFIG="$HOME/.config/flipup-network-campaign.env"
case "${1:-}" in
  setup) bash "$GTO/scripts/network_laptop.sh" setup ;;
  configure) bash "$GTO/scripts/network_campaign.sh" configure ;;
  status|pause|resume)
    [ -f "$CONFIG" ] || { echo 'Run configure first';exit 1; }
    # shellcheck disable=SC1090
    source "$CONFIG"
    "$VENV/bin/python" "$GTO/scripts/scroll_remote.py" "$1"
    ;;
  start)
    ROLE="${2:?fast or slow}";NAME="${3:?a run name}"
    case "$ROLE" in fast|slow) ;; *) exit 1;; esac
    [[ "$NAME" =~ ^[a-zA-Z0-9_-]{1,40}$ ]] || exit 1
    [ -f "$CONFIG" ] || { echo 'Run configure first';exit 1; }
    # shellcheck disable=SC1090
    source "$CONFIG"
    "$VENV/bin/python" "$GTO/scripts/scroll_remote.py" status
    SESSION="scroll-$ROLE"
    tmux has-session -t "$SESSION" 2>/dev/null && { echo 'Already running';exit 1; }
    OUT="$HOME/flipup-scroll-data/$NAME/$ROLE";mkdir -p "$OUT"
    printf -v CFG '%q' "$CONFIG"
    CMD=(env "OMP_NUM_THREADS=${FU_NET_THREADS:-2}" OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
      "$VENV/bin/python" -u "$GTO/scripts/scroll_worker.py" --role "$ROLE" --out "$OUT"
      --hours "${FU_SCROLL_HOURS:-48}" --memory-mb "${FU_NET_MEMORY_MB:-1536}")
    printf -v LINE '%q ' "${CMD[@]}";printf -v LOG '%q' "$OUT/worker.log"
    tmux new-session -d -s "$SESSION" "source $CFG; $LINE >> $LOG 2>&1"
    echo "Running $SESSION. Keep the laptop awake and plugged in. Data, downloads and logs: $OUT"
    ;;
  stop) ROLE="${2:?fast or slow}";case "$ROLE" in fast|slow) ;; *) exit 1;; esac;tmux send-keys -t "scroll-$ROLE" C-c ;;
  *) echo 'usage: setup | configure | start fast NAME | start slow NAME | status | pause | resume | stop fast|slow';exit 1 ;;
esac
