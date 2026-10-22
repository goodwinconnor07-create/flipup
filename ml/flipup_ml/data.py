"""Strict NPZ ingestion, root-range reconstruction and row assembly."""
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import numpy as np
from . import SPOTS
from .features import board_group, texture, frequency, slots_for, feature_rows
from flipup_gto.cards import parse_cards, combo_cards

@dataclass
class Entry:
    path: Path
    spot: str
    board: tuple
    meta: dict
    arrays: dict
    roots: list

def read_entry(path):
    path = Path(path)
    if path.parent.name not in SPOTS:
        raise ValueError('Unknown spot directory')
    board = tuple(parse_cards(path.stem))
    if len(board)!=3:
        raise ValueError('Not a flop')
    with np.load(path,allow_pickle=False) as f:
        arrays = {k:f[k] for k in f.files}
    meta = json.loads(str(arrays['meta']))
    if meta['pot']<=0 or meta['stack']<=0 or not np.isfinite(meta['exploitability_pct']):
        raise ValueError('Invalid metadata')
    if '' not in meta['nodes']:
        raise ValueError('Missing root')
    for p in (0,1):
        cs=arrays[f'combos{p}']
        if len(set(cs))!=len(cs) or np.any(cs<0) or np.any(cs>=1326):
            raise ValueError('Invalid combos')
        if any(set(combo_cards(int(c))) & set(board) for c in cs):
            raise ValueError('Board-blocked hand stored')
    roots=[]
    for p in (0,1):
        first=[]
        for key,n in meta['nodes'].items():
            toks=[] if not key else key.split('.')
            if n['player']==p and not any(meta['nodes']['.'.join(toks[:i])]['player']==p for i in range(len(toks))):
                first.append(key)
        if not first:
            raise ValueError(f'Cannot recover player {p} root reach')
        root=np.zeros(1326,np.float32)
        root[arrays[f'combos{p}']]=arrays['r:'+min(first,key=len)]
        roots.append(root)
    for key,n in meta['nodes'].items():
        if (len(key.split('.')) if key else 0)>3:
            raise ValueError('Stored decision deeper than three')
        slots_for(meta,key)
        s,e,r=(np.asarray(arrays[x+':'+key],np.float32) for x in ('s','e','r'))
        expected=(len(n['actions']),len(arrays[f'combos{n["player"]}']))
        if s.shape!=expected or e.shape!=expected or r.shape!=(expected[1],):
            raise ValueError(f'Wrong shape {key}')
        if not all(np.isfinite(x).all() for x in (s,e,r)) or np.any(s<0) or np.any(r<0):
            raise ValueError(f'Invalid target {key}')
        if np.max(np.abs(s.sum(0)-1))>.003:
            raise ValueError(f'Unnormalised strategy {key}')
    return Entry(path,path.parent.name,board,meta,arrays,roots)

def load_entries(root):
    entries,failed,dropped=[],[],[]
    for path in sorted(Path(root).rglob('*.npz')):
        try:
            e=read_entry(path)
            if e.meta['exploitability_pct']>.5:
                dropped.append(str(path))
            else:
                entries.append(e)
        except Exception as exc:
            failed.append({'file':str(path),'reason':str(exc)})
    return entries,failed,dropped

def domain(entries):
    out={}
    for e in entries:
        item=out.setdefault(e.spot,{'pot':e.meta['pot'],'stack':e.meta['stack'],'roots':[[None]*1326,[None]*1326],'nodes':e.meta['nodes']})
        if item['pot']!=e.meta['pot'] or item['stack']!=e.meta['stack']:
            raise ValueError(f'Mixed pot/stack in {e.spot}')
        if item['nodes']!=e.meta['nodes']:
            raise ValueError(f'Mixed stored trees in {e.spot}')
        for p in (0,1):
            for c in e.arrays[f'combos{p}']:
                old=item['roots'][p][int(c)]
                new=float(e.roots[p][c])
                if old is not None and abs(old-new)>max(.001,abs(old)*.002):
                    raise ValueError(f'Mixed root ranges for {e.spot}, player {p}, combo {c}')
                item['roots'][p][int(c)]=new
    for spot,item in out.items():
        es=[e for e in entries if e.spot==spot]
        item['unresolved_combos']=[c for c in range(1326) if all(set(combo_cards(c))&set(e.board) for e in es)]
        for e in es:
            for p in (0,1):
                present=set(map(int,e.arrays[f'combos{p}']))
                for c,v in enumerate(item['roots'][p]):
                    if v is not None and v>0 and c not in present and not set(combo_cards(c))&set(e.board):
                        raise ValueError(f'Mixed root ranges: unblocked combo {c} absent from {e.path}')
    return out

def build_dataset(entries,cache,eq_samples=1024):
    Path(cache).mkdir(parents=True,exist_ok=True)
    fields={k:[] for k in ('x','ev','strategy','mask','reach','weight','pot','group','texture','spot','depth','player','strength','handclass','node','board')}
    for entry in entries:
        digest=hashlib.sha256(entry.path.read_bytes()+str(eq_samples).encode()+b'features-v1').hexdigest()
        cp=Path(cache)/(digest+'.npz')
        if cp.exists():
            with np.load(cp) as f:
                for k in fields: fields[k].append(f[k])
            continue
        chunk={k:[] for k in fields}
        for key,n in entry.meta['nodes'].items():
            cs=entry.arrays[f'combos{n["player"]}']
            x,mask,strength,hc=feature_rows(entry.spot,entry.board,entry.meta,key,cs,entry.roots,eq_samples)
            size=len(cs)
            ev=np.zeros((size,8),np.float32); strategy=ev.copy()
            slots=slots_for(entry.meta,key)
            ev[:,slots]=entry.arrays['e:'+key].T
            strategy[:,slots]=entry.arrays['s:'+key].T
            strategy/=strategy.sum(1,keepdims=True)
            reach=entry.arrays['r:'+key].astype(np.float32)
            values={'x':x,'ev':ev,'strategy':strategy,'mask':np.tile(mask,(size,1)),'reach':reach,'weight':reach*frequency(entry.board),'pot':np.full(size,n['pot']), 'group':np.full(size,board_group(entry.board)),'texture':np.full(size,texture(entry.board)),'spot':np.full(size,entry.spot),'depth':np.full(size,len(key.split('.')) if key else 0),'player':np.full(size,n['player']),'strength':strength,'handclass':hc,'node':np.full(size,key),'board':np.full(size,entry.path.stem)}
            for k,v in values.items(): chunk[k].append(v)
        chunk={k:np.concatenate(v) for k,v in chunk.items()}
        np.savez_compressed(cp,**chunk)
        for k in fields: fields[k].append(chunk[k])
    return {k:np.concatenate(v) for k,v in fields.items()}

def subset(data,idx):
    return {k:v[idx] for k,v in data.items()}
