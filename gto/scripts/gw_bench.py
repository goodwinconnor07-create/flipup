"""6-max 100bb preflop with GTO Wizard settings, printed next to their published numbers.

    python3 scripts/gw_bench.py nl50|nl500 [options-json] [max-players-to-flop]

Benchmarks and references are tracked in docs/GTO_PLAYBOOK.md section 11.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from flipup_gto.preflop import PreflopSpot
rake, cap = (0.05, 4.0) if (len(sys.argv) < 2 or sys.argv[1] == "nl50") else (0.05, 0.6)
spot = PreflopSpot(num_players=6, stack=100, rake_rate=rake, rake_cap=cap, open_size=[2.0, 2.0, 2.3, 2.5, 3.0, 3.5], options=json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}, max_players_flop=int(sys.argv[3]) if len(sys.argv) > 3 else 3)
t = time.time(); spot.solve(600, 0.002, 100); print("solved", round(time.time() - t), "s", flush=True)
def rs(path):
    return {k: round(100 * v, 1) for k, v in spot.node(path).range_strategy().items()}
for i, n in enumerate(spot.names[:5]):
    print(n, "RFI", rs(["fold"] * i))
print("BB vs BTN", rs(["fold", "fold", "fold", "raise", "fold"]), "  GW NL50: call ~26, 3bet ~14, fold ~60")
print("BB vs CO", rs(["fold", "fold", "raise", "fold", "fold"]))
print("BB vs UTG", rs(["raise", "fold", "fold", "fold", "fold"]))
print("SB vs BTN", rs(["fold", "fold", "fold", "raise"]))
print("BTN vs UTG", rs(["raise", "fold", "fold"]), "  GW NL500: call 8.2, 3bet 7.5")
print("BTN vs CO", rs(["fold", "fold", "raise"]), "  GW NL500: 3bet ~12, call ~5")
print("CO vs BTN 3bet", rs(["fold", "fold", "raise", "raise", "fold", "fold"]), "  GW NL500: fold 52.3, 4bet 19.3, call ~28")
print("BTN vs BB 3bet", rs(["fold", "fold", "fold", "raise", "fold", "raise"]))
print("UTG chart", " ".join(f"{c}:{100*(1-v['fold']):.0f}" for c, v in spot.node([]).chart().items() if v["fold"] < 0.95))
print("GW: UTG 17.6 (NL500/NL50), BTN 42 (NL50), SB folds ~54")
