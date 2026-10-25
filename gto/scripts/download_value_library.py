#!/usr/bin/env python3
"""Download missing flops and preflop caches using existing coach admin credentials; never upload."""
import argparse
from pathlib import Path
from coach_client import Coach


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--coach', default='https://flipup-gto.fly.dev')
    args = ap.parse_args()
    coach = Coach(args.coach)
    listing = coach.listing()
    done = 0
    for spot, names in listing['spots'].items():
        # Only server-issued known matchup names; prevent a malformed listing writing elsewhere.
        if not spot.replace('_', '').isalnum():
            raise ValueError('invalid matchup name')
        for name in names:
            if not name.isalnum():
                raise ValueError('invalid flop name')
            path = args.out.expanduser() / spot / f'{name}.npz'
            if not path.exists():
                coach.get_flop(spot, name, str(path))
                done += 1
        print(f'{spot}: {len(names)} remote files checked, {done} total downloaded', flush=True)
    print('Done. Existing local files were left untouched. No uploads made.')


if __name__ == '__main__':
    main()
