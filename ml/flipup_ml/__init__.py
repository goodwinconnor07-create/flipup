"""Isolated CPU experiment; never imports or calls the hosted service."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / 'gto'))
import flipup_gto  # noqa: E402

# CMake builds in a scratch source copy, leaving gto/ read-only.
flipup_gto.__path__.append(str(ROOT / 'ml/.build-src/flipup_gto'))

SEED = 20261022
SPOTS = ['btn_bb', 'co_bb', 'utg_bb', 'sb_bb', 'sb_limp', 'bb_btn_3bet']
SLOTS = ['fold', 'check', 'call', 'bet33', 'bet75', 'bet125', 'raise', 'allin']
