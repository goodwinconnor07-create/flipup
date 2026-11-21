#!/usr/bin/env bash
# Builds the app's recorded table sounds from Kenney's Casino Audio (CC0, https://kenney.nl/assets/casino-audio,
# mirrored at https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips).
# Each clip is trimmed to its first sound, cut short with a 40ms fade, made mono 44.1kHz and peaked at -1 dB.
# Usage: scripts/recordedSounds.sh /path/to/kenney_casino-audio/Audio
# These files replace renderSounds.mjs's synthesised deal, flip, fold and check, so that script skips them.
set -euo pipefail
S="${1:?path to the Kenney Audio folder}"
O="$(dirname "$0")/../native/assets/sounds"
T="$(mktemp -d)"

proc() { # source out seconds [gain dB]
  local st; st=$(awk "BEGIN{printf \"%.3f\", $3-0.04}")
  ffmpeg -v error -y -i "$1" -ac 1 -ar 44100 \
    -af "silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:$3,afade=t=in:d=0.002,afade=t=out:st=$st:d=0.04" "$T/p.wav"
  local m; m=$(ffmpeg -i "$T/p.wav" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(.*\) dB/\1/p')
  local g; g=$(awk "BEGIN{printf \"%.2f\", -1 - ($m) + ${4:-0}}")
  ffmpeg -v error -y -i "$T/p.wav" -af "volume=${g}dB" -c:a pcm_s16le "$2"
}

proc "$S/card-shove-1.ogg" "$O/deal.wav" 0.40
proc "$S/card-fan-1.ogg" "$O/flip.wav" 0.28
proc "$S/card-slide-2.ogg" "$O/fold.wav" 0.42 -3
# A check is two knocks on the table.
proc "$S/card-place-2.ogg" "$T/tap.wav" 0.12
ffmpeg -v error -y -i "$T/tap.wav" -i "$T/tap.wav" \
  -filter_complex "[1]adelay=95,volume=0.8[b];[0][b]amix=inputs=2:normalize=0" -c:a pcm_s16le "$O/check.wav"
# Three takes each, picked at random, so repeats never sound like a loop.
for i in 1 2 3; do proc "$S/chip-lay-$i.ogg" "$O/chip-$i.wav" 0.24; done
n=1; for i in 1 3 4; do proc "$S/card-place-$i.ogg" "$O/place-$n.wav" 0.35; n=$((n + 1)); done
rm -rf "$T"
