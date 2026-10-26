#!/usr/bin/env python3
"""Laptop-only one-question trial from one existing library file. No poker solves."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
import time
import zipfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto.library_questions import load_questions
from flipup_gto.flop_library import SPOTS
from flipup_gto.value_data import atomic_json


def range_export(path,question):
    with np.load(path,allow_pickle=False) as data:
        meta=json.loads(str(data['meta']));nodes=meta['nodes'];initial={}
        for key in sorted(nodes,key=lambda k:len(k.split('.')) if k else 0):
            p=nodes[key]['player']
            if p not in initial and (not key or len(key.split('.'))==1):initial[p]=np.asarray(data['r:'+key],dtype=float)
        root=[initial[p].copy() for p in (0,1)];reached=[r.copy() for r in root]
        tokens=question['source']['node'].split('.') if question['source']['node'] else []
        for depth,index in enumerate(tokens):
            key='.'.join(tokens[:depth]);p=nodes[key]['player']
            reached[p]*=np.asarray(data['s:'+key],dtype=float)[int(index)]
        ranges=[]
        for p in (0,1):
            cs=np.asarray(data['combos'+str(p)],dtype=int)
            a=np.zeros(1326);b=np.zeros(1326);a[cs]=root[p];b[cs]=reached[p]
            ranges.append(dict(player=p,rootWeights=a.tolist(),reachedWeights=b.tolist()))
        return dict(ranges=ranges,rootPot=meta['pot'],rootStack=meta['stack'],storedNodes=meta['nodes'],
                    comboIndex='For card ids a>b, index=a*(a-1)/2+b. Card id=rank*4+suit; ranks 23456789TJQKA, suits cdhs.',
                    settingsVerified=False,unknowns=['original engine version','exact original future-street tree configuration','original preflop model configuration'],
                    comparisonNote='Match numeric ranges, stack, pot, rake, action history, menus and future-street model. Different future betting models make frequency comparisons inconclusive.')


def label(option,pot):
    name=option['kind'].capitalize()
    if option['kind'] in ('bet','raise','allin'):return f"{name} to {option['to']:.3f}bb (+{option['added']:.3f}bb)"
    return name


def grade(question,index):
    options=question['options'];best=max(o['ev'] for o in options);loss=max(0,best-options[index]['ev'])
    # Match the ORIGINAL animated Scroll player's gradeChoice in src/quiz/hands.ts.
    return dict(pick=index,lossBb=loss,colour='green' if loss<=max(.05,.01*question['pot']) else 'yellow' if loss<=max(.5,.05*question['pot']) else 'red')


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--library',type=Path,required=True)
    p.add_argument('--source',type=Path,help='Optional exact source NPZ');p.add_argument('--out',type=Path,required=True)
    p.add_argument('--play',action='store_true');a=p.parse_args();start=time.perf_counter()
    root=a.library.expanduser().resolve();out=a.out.expanduser().resolve()
    if not root.is_dir() or out==root or root in out.parents:raise ValueError('valid source and separate output required')
    out.mkdir(parents=True,exist_ok=True)
    if any(out.iterdir()):raise ValueError('Output already contains files; preserve it and choose a new trial name')
    if a.source:path=a.source.expanduser().resolve()
    else:
        # One source only. Prefer the common BTN/BB matchup, with reproducible board selection.
        paths=list((root/'btn_bb').glob('*.npz'))
        if not paths:paths=list(root.glob('*/*.npz'))
        if not paths:raise ValueError('No library NPZ files found')
        path=min(paths,key=lambda q:hashlib.sha256(q.name.encode()).hexdigest())
    print('Reading one saved solution:',path,flush=True)
    sha,questions=load_questions(path,per_node=4)
    if not questions:raise ValueError('This source has no eligible question; no output answers fabricated')
    question=min((q for q,_,_ in questions),key=lambda q:({'mixed':0,'close':1,'standard':2}[q['difficulty']],-sum(-o['freq']*np.log(max(o['freq'],1e-30)) for o in q['options']),q['id']))
    info=range_export(path,question)
    if question['source']['matchup'] in SPOTS:
        preflop,ip,oop,_=SPOTS[question['source']['matchup']]
        info.update(preflopActionKinds=preflop,seats=dict(oop=oop,ip=ip),seatOrder=['UTG','HJ','CO','BTN','SB','BB'])
    atomic_json(out/'question.json',question);atomic_json(out/'comparison.json',info)
    shutil.copyfile(path,out/'source.npz')
    elapsed=time.perf_counter()-start
    timing=dict(extractionSeconds=elapsed,sourceFilesRead=1,questionsSaved=1,pokerSolvesRun=0,networkTrainingRun=False,sourceSha256=sha,publicationApproved=False)
    atomic_json(out/'timing.json',timing)
    prompt=[f"Your cards: {' '.join(question['cards'])}",f"Flop: {' '.join(question['board'])}",
            f"Matchup: {question['source']['matchup']} | You: {'OOP' if question['hero']==0 else 'IP'}",
            f"Pot: {question['pot']:.3f}bb | Behind: {question['stacks']}bb | To call: {question['toCall']:.3f}bb",
            'Flop history: '+json.dumps(question['history']),
            *[f'{i+1}. {label(o,question["pot"])}' for i,o in enumerate(question['options'])]]
    solution=['Stored-model answer (not a new solve):']
    best=max(o['ev'] for o in question['options'])
    solution.extend(f"{label(o,question['pot'])}: {o['freq']*100:.3f}% | EV {o['ev']:.5f}bb | loss {max(0,best-o['ev']):.5f}bb" for o in question['options'])
    solution.extend([f"Extraction and export: {elapsed:.2f} seconds.",
                     'Answers inherit the original library betting abstraction and float16 rounding.',
                     'This is one decision scenario, not a complete hand replay. The app adapter is not tested by this console trial.',
                     'Use comparison.json for ranges/history; original full tree settings were not stored, so confirm comparability before interpreting a Wizard difference.'])
    (out/'review.txt').write_text('\n'.join(prompt+['']+solution)+'\n')
    print('\n'.join(prompt),flush=True)
    if a.play:
        try:
            pick=input('Your move (number): ').strip()
            index=int(pick)-1
            if not 0<=index<len(question['options']):raise ValueError('out of range')
            answer=grade(question,index);atomic_json(out/'choice.json',answer);print(json.dumps(answer))
        except (ValueError,EOFError):print('No valid choice recorded; saved question is unchanged.')
    print('\n'.join(solution))
    with zipfile.ZipFile(out/'trial.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(out.iterdir()):
            if file.name!='trial.zip' and file.is_file():archive.write(file,file.name)
    print('Send back:',out/'trial.zip')


if __name__=='__main__':main()
