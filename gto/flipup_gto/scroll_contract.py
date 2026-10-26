"""Pure-data publication contract. Importing this module never builds or solves a tree."""
import hashlib
import json
import math
from pathlib import Path


def fingerprint():
    root=Path(__file__).resolve().parents[1]
    paths=sorted([*root.glob('engine/src/*.cpp'),*root.glob('engine/include/flipup/*.h'),
                  *root.glob('flipup_gto/*.py'),root/'scripts/laptop_scroll_validation.py',
                  root/'scripts/generate_scroll_scenarios.py'])
    return hashlib.sha256(b''.join(str(p.relative_to(root)).encode()+p.read_bytes() for p in paths)).hexdigest()


def validate_job(spec):
    profile=spec.get('profile',{})
    # Never map unsupported games onto no-rake, equal-stack cash games.
    if profile.get('utility')!='chip-ev':raise ValueError('ICM/bounty/payout utility is not implemented')
    if profile.get('rake_rate')!=0 or profile.get('rake_cap')!=0:raise ValueError('raked Scroll profiles are not yet validated')
    if spec.get('players') not in (2,3):raise ValueError('four-plus-player Scroll is not validated')
    if spec.get('stack',0)<=0 or spec.get('pot',0)<=0:raise ValueError('invalid stack/pot')
    if not spec.get('range_origin',{}).get('source') or not spec['range_origin'].get('history'):
        raise ValueError('full range origin and reached history are required; synthetic random ranges cannot be published')
    if spec['range_origin'].get('synthetic',True):raise ValueError('synthetic ranges are research data only')
    ranges=spec.get('ranges',[])
    if len(ranges)!=spec['players'] or any(len(r)!=1326 for r in ranges):raise ValueError('full numeric ranges required')
    for weights in ranges:
        if any(not isinstance(w,(int,float)) or not math.isfinite(w) or w<0 for w in weights) or sum(weights)<=0:
            raise ValueError('ranges must contain finite nonnegative weights with positive mass')
    board=spec.get('board',[])
    if len(board) not in (3,4,5) or len(set(board))!=len(board) or any(type(c) is not int or not 0<=c<52 for c in board):
        raise ValueError('a valid unique numeric board is required')
    json.dumps(spec,allow_nan=False)


def require_validation(path,players=None,street=None):
    report=json.loads(Path(path).read_text())
    if report.get('engine')!=fingerprint() or report.get('passed') is not True:
        raise ValueError('laptop validation missing, failed or stale after an engine change')
    if players is not None:
        if [players,street] not in report.get('coverage',[]):raise ValueError('this player/street profile has no passing reference case')
    return report
