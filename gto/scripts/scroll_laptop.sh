#!/usr/bin/env bash
set -euo pipefail
GTO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${FU_NET_VENV:-$HOME/flipup-net-env}"
CONFIG="$HOME/.config/flipup-network-campaign.env"
if [ ! -f "$CONFIG" ] && [ -f "$HOME/.config/flipup-flops.env" ];then CONFIG="$HOME/.config/flipup-flops.env";fi
case "${1:-}" in
  setup) bash "$GTO/scripts/network_laptop.sh" setup ;;
  setup-models) "$VENV/bin/python" -m pip install torch --index-url https://download.pytorch.org/whl/cpu ;;
  configure) bash "$GTO/scripts/network_campaign.sh" configure ;;
  status|pause|resume)
    [ -f "$CONFIG" ] || { echo 'Run configure first';exit 1; }
    # shellcheck disable=SC1090
    source "$CONFIG"
    "$VENV/bin/python" "$GTO/scripts/scroll_remote.py" "$1"
    ;;
  whole-auto)
    ROLE="${2:?fast or slow}";NAME="${3:?run name}"
    case "$ROLE" in fast|slow) ;; *) exit 1;; esac
    [[ "$NAME" =~ ^[a-zA-Z0-9_-]{1,40}$ ]] || exit 1
    for SESSION in "scroll-draft-$ROLE" "scroll-whole-$ROLE" "scroll-auto-$ROLE";do
      if tmux has-session -t "$SESSION" 2>/dev/null;then echo "$SESSION is already running; stop it before starting a new workload.";exit 1;fi
    done
    OUT="$HOME/flipup-whole-data/$NAME/$ROLE";mkdir -p "$OUT"
    CMD=(env "OMP_NUM_THREADS=${FU_NET_THREADS:-2}" OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
      "$VENV/bin/python" -u "$GTO/scripts/scroll_bootstrap.py" --role "$ROLE" --out "$OUT"
      --hours "${FU_SCROLL_HOURS:-48}" --memory-mb "${FU_NET_MEMORY_MB:-1536}")
    printf -v LINE '%q ' "${CMD[@]}";printf -v LOG '%q' "$OUT/bootstrap.log"
    PREFIX='';if [ -f "$CONFIG" ];then printf -v CFG '%q' "$CONFIG";PREFIX="source $CFG; ";fi
    tmux new-session -d -s "scroll-auto-$ROLE" "${PREFIX}$LINE >> $LOG 2>&1"
    echo "Started scroll-auto-$ROLE: rebuild, numerical audit, then whole-hand candidates."
    echo "Status: $OUT/bootstrap-status.json; logs: $OUT/*.log"
    echo 'No hand publishes automatically. Keep the laptop awake and plugged in.'
    ;;
  draft|whole)
    ROLE="${2:?fast or slow}";NAME="${3:?run name}"
    case "$ROLE" in fast|slow) ;; *) exit 1;; esac
    [[ "$NAME" =~ ^[a-zA-Z0-9_-]{1,40}$ ]] || exit 1
    AUDIT="${FU_SCROLL_AUDIT:-$HOME/flipup-engine-audit/internal-audit.json}"
    [ -f "$AUDIT" ] || { echo "Missing passing internal audit: $AUDIT";exit 1; }
    MODE="$1"
    SESSION="scroll-$MODE-$ROLE"
    OTHER=draft;[ "$MODE" != draft ] || OTHER=whole
    if tmux has-session -t "scroll-$OTHER-$ROLE" 2>/dev/null;then echo "The $OTHER job is still running. Stop it before starting $MODE on the same laptop.";exit 1;fi
    tmux has-session -t "$SESSION" 2>/dev/null && { echo 'Already running';exit 1; }
    OUT="$HOME/flipup-draft-data/$NAME/$ROLE"
    [ "$MODE" != whole ] || OUT="$HOME/flipup-whole-data/$NAME/$ROLE";mkdir -p "$OUT"
    CMD=(env "OMP_NUM_THREADS=${FU_NET_THREADS:-2}" OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
      "$VENV/bin/python" -u "$GTO/scripts/scroll_drafts.py" --role "$ROLE" --out "$OUT"
      --audit "$AUDIT" --hours "${FU_SCROLL_HOURS:-48}" --memory-mb "${FU_NET_MEMORY_MB:-1536}")
    printf -v LINE '%q ' "${CMD[@]}";printf -v LOG '%q' "$OUT/runner.log"
    [ "$MODE" != whole ] || CMD+=(--whole-hands)
    "${CMD[@]}" --preflight
    printf -v LINE '%q ' "${CMD[@]}"
    PREFIX=''
    if [ -f "$CONFIG" ];then printf -v CFG '%q' "$CONFIG";PREFIX="source $CFG; ";fi
    tmux new-session -d -s "$SESSION" "${PREFIX}$LINE >> $LOG 2>&1"
    echo "Draft computation started in $SESSION. These candidates never publish to Scroll."
    echo "Status: $OUT/status.json; logs: $OUT/batch-*/worker.log"
    echo 'Keep the laptop awake, plugged in and lid open. Close the terminal if needed.'
    ;;
  draft-status)
    ROLE="${2:?fast or slow}";NAME="${3:?run name}"
    [[ "$NAME" =~ ^[a-zA-Z0-9_-]{1,40}$ ]] || exit 1
    case "$ROLE" in fast|slow) ;; *) exit 1;; esac
    cat "$HOME/flipup-draft-data/$NAME/$ROLE/status.json"
    ;;
  start)
    ROLE="${2:?fast or slow}";NAME="${3:?a run name}"
    case "$ROLE" in fast|slow) ;; *) exit 1;; esac
    [[ "$NAME" =~ ^[a-zA-Z0-9_-]{1,40}$ ]] || exit 1
    [ -f "$CONFIG" ] || { echo 'Run configure first';exit 1; }
    # shellcheck disable=SC1090
    source "$CONFIG"
    "$VENV/bin/python" "$GTO/scripts/scroll_remote.py" status
    JOBS="${FU_SCROLL_JOBS:?set FU_SCROLL_JOBS to your traceable input spot library}"
    VALIDATION="${FU_SCROLL_VALIDATION:?set FU_SCROLL_VALIDATION to the passing laptop validation receipt}"
    SESSION="scroll-$ROLE"
    tmux has-session -t "$SESSION" 2>/dev/null && { echo 'Already running';exit 1; }
    OUT="$HOME/flipup-scroll-data/$NAME/$ROLE";mkdir -p "$OUT"
    printf -v CFG '%q' "$CONFIG"
    CMD=(env "OMP_NUM_THREADS=${FU_NET_THREADS:-2}" OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
      "$VENV/bin/python" -u "$GTO/scripts/scroll_worker.py" --role "$ROLE" --out "$OUT"
      --jobs "$JOBS" --validation "$VALIDATION" --hours "${FU_SCROLL_HOURS:-48}" --memory-mb "${FU_NET_MEMORY_MB:-1536}")
    printf -v LINE '%q ' "${CMD[@]}";printf -v LOG '%q' "$OUT/worker.log"
    tmux new-session -d -s "$SESSION" "source $CFG; $LINE >> $LOG 2>&1"
    echo "Running $SESSION. Keep the laptop awake and plugged in. Data, downloads and logs: $OUT"
    ;;
  stop) ROLE="${2:?fast or slow}";case "$ROLE" in fast|slow) ;; *) exit 1;; esac;tmux send-keys -t "scroll-$ROLE" C-c ;;
  *) echo 'usage: setup | configure | start fast NAME | start slow NAME | status | pause | resume | stop fast|slow';exit 1 ;;
esac
