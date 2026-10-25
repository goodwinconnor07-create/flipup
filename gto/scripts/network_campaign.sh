#!/usr/bin/env bash
set -euo pipefail
GTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${FU_NET_VENV:-$HOME/flipup-net-env}"
CONFIG="$HOME/.config/flipup-network-campaign.env"
case "${1:-}" in
  setup)
    bash "$GTO_DIR/scripts/network_laptop.sh" setup
    "$VENV/bin/python" -m pip install torch --index-url https://download.pytorch.org/whl/cpu
    ;;
  configure)
    mkdir -p "$(dirname "$CONFIG")"
    read -rp 'Coach URL [https://flipup-gto.fly.dev]: ' COACH
    COACH="${COACH:-https://flipup-gto.fly.dev}"
    [[ "$COACH" == https://* ]] || { echo 'Use the HTTPS coach URL'; exit 1; }
    read -rsp 'Existing FLIPUP_UPLOAD_TOKEN: ' TOKEN; echo
    [ -n "$TOKEN" ] || { echo 'Token is required'; exit 1; }
    umask 077
    printf 'export FLIPUP_COACH=%q\nexport FLIPUP_UPLOAD_TOKEN=%q\n' "$COACH" "$TOKEN" > "$CONFIG"
    echo 'Saved privately. This token is used for backup, not model activation.'
    ;;
  start)
    ROLE="${2:?use start fast or start slow}";CAMPAIGN="${3:?give both laptops the same campaign name}"
    case "$ROLE" in fast|slow) ;; *) exit 1;; esac
    [[ "$CAMPAIGN" =~ ^[a-zA-Z0-9_-]{1,50}$ ]] || { echo 'Invalid campaign name'; exit 1; }
    [ -f "$CONFIG" ] || { echo "Run configure first";exit 1; }
    # shellcheck disable=SC1090
    source "$CONFIG"
    WORKER=0;[ "$ROLE" != fast ] || WORKER=1
    "$VENV/bin/python" "$GTO_DIR/scripts/campaign_sync.py" probe --root /tmp --run "$CAMPAIGN-worker$WORKER"
    mkdir -p "$HOME/flipup-campaigns/$CAMPAIGN"
    SESSION="fu-campaign-$ROLE"
    tmux has-session -t "$SESSION" 2>/dev/null && { echo 'Campaign already running';exit 1; }
    # Token is inherited by tmux via a private config sourced inside the job, never placed on its command line.
    printf -v CFG '%q' "$CONFIG"
    CMD=(env "OMP_NUM_THREADS=${FU_NET_THREADS:-2}" OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
         "$VENV/bin/python" -u "$GTO_DIR/scripts/run_network_campaign.py" --role "$ROLE" --campaign "$CAMPAIGN"
         --hours "${FU_CAMPAIGN_HOURS:-168}" --memory-mb "${FU_NET_MEMORY_MB:-2048}" --library "${FLOPS_DIR:-$HOME/flops}")
    printf -v LINE '%q ' "${CMD[@]}"
    printf -v LOG '%q' "$HOME/flipup-campaigns/$CAMPAIGN/$ROLE.log"
    tmux new-session -d -s "$SESSION" "source $CFG; $LINE >> $LOG 2>&1"
    echo "Started $SESSION. Keep plugged in, lid open, sleep disabled in Ubuntu's Power settings."
    echo "Logs: $HOME/flipup-campaigns/$CAMPAIGN/$ROLE.log"
    ;;
  status)
    tmux list-sessions 2>/dev/null || true
    ;;
  stop)
    ROLE="${2:?fast or slow}";case "$ROLE" in fast|slow) ;; *) exit 1;; esac
    tmux send-keys -t "fu-campaign-$ROLE" C-c
    ;;
  *) echo "usage: bash $0 setup|configure|start fast NAME|start slow NAME|status|stop fast|stop slow";exit 1;;
esac
