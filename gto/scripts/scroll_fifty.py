#!/usr/bin/env python3
"""Make a small private Scroll pack from stored answers. Zero poker solves, no network work."""
import argparse
from collections import deque
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from flipup_gto.library_questions import load_questions
from flipup_gto.value_data import atomic_json


def choose(questions,limit=5):
    """Cap each board/matchup; favour mixes while retaining ordinary decisions."""
    result=[];seen=set()
    ordered=sorted(questions,key=lambda item:({'mixed':0,'close':1,'standard':2}[item[0]['difficulty']],item[0]['id']))
    for q,_,_ in ordered:
        key=tuple(q['cards'])
        if key in seen:continue
        seen.add(key);result.append(q)
        if len(result)==limit:break
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--library',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    source=a.library.expanduser().resolve();out=a.out.expanduser().resolve()
    if not source.is_dir() or source==out or source in out.parents:raise ValueError('valid source and separate output directory required')
    out.mkdir(parents=True,exist_ok=True)
    pack=out/'pack.json'
    if pack.exists():
        print('Pack already exists; preserved:',pack);return
    groups=[]
    for directory in sorted(source.iterdir()):
        if not directory.is_dir():continue
        paths=sorted(directory.glob('*.npz'),key=lambda path:hashlib.sha256(path.name.encode()).hexdigest())
        if paths:groups.append(deque(paths))
    selected=[];errors=[];attempts=0;used_boards=set()
    while groups and len(selected)<50 and attempts<100:
        remaining=[]
        for queue in groups:
            if len(selected)>=50 or attempts>=100:break
            path=queue.popleft();attempts+=1
            if queue:remaining.append(queue)
            try:
                _,questions=load_questions(path,per_node=4)
                if not questions:continue
                board=tuple(questions[0][0]['board'])
                if board in used_boards:continue
                picked=choose(questions,min(5,50-len(selected)))
                selected.extend(picked);used_boards.add(board)
                print(f'{len(selected)}/50 questions; {path.parent.name}/{path.name}',flush=True)
            except (ValueError,KeyError,TypeError,OSError) as exc:errors.append(dict(file=str(path),error=str(exc)))
        groups=remaining
    result=dict(schema='library-scroll-pack-v1',count=len(selected),target=50,questions=selected,
                publicationApproved=False,solvesRun=0,filesExamined=attempts,errors=errors,
                note='Stored limited-tree solver answers; source review and original-player adapter still required before publication.')
    atomic_json(pack,result)
    print(f'Saved {len(selected)} private scenarios: {pack}. No uploads or training.')
    if len(selected)!=50:raise SystemExit('Not enough acceptable source questions; partial pack preserved.')


if __name__=='__main__':main()
