#!/usr/bin/env bash
# Runs this laptop's share of the flop library in the background: one service solves, one uploads to the coach.
# Both start on boot and pick up where they left off. Run laptop_setup.sh first.
#
#   bash gto/scripts/laptop_service.sh a        laptop A: bb_btn_3bet, utg_bb
#   bash gto/scripts/laptop_service.sh b        laptop B: sb_bb, sb_limp
#   bash gto/scripts/laptop_service.sh status   what it's doing now
#   bash gto/scripts/laptop_service.sh stop     stop both services (start again with: sudo systemctl start flipup-solve flipup-upload)
#
# The two laptops never share a matchup, and both skip every flop the coach already has, so nothing is solved twice.
set -euo pipefail

GTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${FU_VENV:-$HOME/fu-env}"
OUT="${FLOPS_DIR:-$HOME/flops}"
ENV_FILE="$HOME/.config/flipup-flops.env"
COACH="${FLIPUP_COACH:-https://flipup-gto.fly.dev}"

case "${1:-}" in
  a) SPOTS="bb_btn_3bet,utg_bb" ;;
  b) SPOTS="sb_bb,sb_limp" ;;
  status)
    systemctl --no-pager --lines=0 status flipup-solve flipup-upload || true
    echo; echo "== solving (last lines of $OUT/log.txt)"; tail -n 5 "$OUT/log.txt" 2>/dev/null || true
    echo; echo "== uploading (last lines of $OUT/upload.txt)"; tail -n 5 "$OUT/upload.txt" 2>/dev/null || true
    exit 0 ;;
  stop) sudo systemctl stop flipup-solve flipup-upload; echo "stopped"; exit 0 ;;
  *) echo "usage: bash $0 a|b|status|stop"; exit 1 ;;
esac

if [ ! -x "$VENV/bin/python3" ]; then
  echo "No Python environment at $VENV. Run: bash $GTO_DIR/scripts/laptop_setup.sh"
  exit 1
fi

echo "1/4  Upload token"
if [ -z "${FLIPUP_UPLOAD_TOKEN:-}" ] && [ -f "$ENV_FILE" ]; then
  FLIPUP_UPLOAD_TOKEN="$(sed -n 's/^FLIPUP_UPLOAD_TOKEN=//p' "$ENV_FILE")"
fi
if [ -z "${FLIPUP_UPLOAD_TOKEN:-}" ]; then
  read -rsp "Paste the upload token (it won't show): " FLIPUP_UPLOAD_TOKEN; echo
fi
mkdir -p "$(dirname "$ENV_FILE")" "$OUT"
umask 077
cat > "$ENV_FILE" <<EOF
FLIPUP_COACH=$COACH
FLIPUP_UPLOAD_TOKEN=$FLIPUP_UPLOAD_TOKEN
EOF
umask 022

echo "2/4  Checking the coach and what's left for matchups $SPOTS..."
set -a; source "$ENV_FILE"; set +a
"$VENV/bin/python3" -u "$GTO_DIR/scripts/top_up_flops.py" --out "$OUT" --spots "$SPOTS" --dry-run

echo "3/4  Keeping the laptop awake with the lid shut (asks for your password)..."
sudo mkdir -p /etc/systemd/logind.conf.d
printf '[Login]\nHandleLidSwitch=ignore\nHandleLidSwitchExternalPower=ignore\nIdleAction=ignore\n' \
  | sudo tee /etc/systemd/logind.conf.d/flipup.conf > /dev/null
sudo systemctl mask --quiet sleep.target suspend.target hibernate.target hybrid-sleep.target

echo "4/4  Installing the services..."
unit() {  # name, description, restart policy, command, log file
  sudo tee "/etc/systemd/system/$1.service" > /dev/null <<EOF
[Unit]
Description=$2
Wants=network-online.target
After=network-online.target

[Service]
User=$(id -un)
WorkingDirectory=$GTO_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$VENV/bin/python3 -u $4
Restart=$3
RestartSec=60
StandardOutput=append:$5
StandardError=append:$5

[Install]
WantedBy=multi-user.target
EOF
}
unit flipup-solve "FlipUp flop library: solve $SPOTS" on-failure \
  "$GTO_DIR/scripts/top_up_flops.py --out $OUT --spots $SPOTS" "$OUT/log.txt"
unit flipup-upload "FlipUp flop library: upload to the coach" on-failure \
  "$GTO_DIR/scripts/upload_flops.py --out $OUT --spots $SPOTS --every 1800 --stop-when-idle 6" "$OUT/upload.txt"
sudo systemctl daemon-reload
sudo systemctl enable --now flipup-solve flipup-upload

echo
echo "Running. Check on it with:  bash $0 status"
echo "The lid setting takes full effect after the next restart; until then, leave the lid open."
