"""File-wise data cache and train-only, probability-corrected row sampling."""
import hashlib
import json
from pathlib import Path
import time
import numpy as np
from . import SEED
from .audit import audit
from .data import build_dataset,domain
from .features import board_group,texture

def prepare(root,out):
    out=Path(out); out.mkdir(parents=True,exist_ok=True)
    entries,info=audit(root,out)
    if not entries: raise ValueError('No retained solved files')
    if any(e.meta.get('synthetic',False) for e in entries): raise ValueError('Real run cannot include synthetic fixtures')
    domains=domain(entries)
    (out/'domain.json').write_text(json.dumps(domains))
    records=[]; started=time.perf_counter()
    for i,e in enumerate(entries):
        d=build_dataset([e],out/'cache')
        digest=hashlib.sha256((e.spot+'/'+e.path.name).encode()+e.path.read_bytes()+b'1024'+b'features-v2-batch-exact').hexdigest()
        path=out/'cache'/(digest+'.npz')
        assert path.exists()
        records.append({'cache':str(path),'source':str(e.path),'spot':e.spot,'board':e.path.stem,'group':board_group(e.board),'texture':texture(e.board),'rows':len(d['x'])})
        if i%25==0 or i==len(entries)-1:
            print('features',i+1,'/',len(entries),'seconds',round(time.perf_counter()-started,1),flush=True)
        del d
    (out/'feature_manifest.json').write_text(json.dumps(records,indent=2))
    return records,domains,info

def load(record):
    with np.load(record['cache'],allow_pickle=False) as f: return {k:f[k] for k in f.files}

def sample(records,per_node=64,seed=SEED):
    """Uniform positive-reach rows within each node; inverse inclusion correction.

    Every board and node with nonzero training weight contributes. Sampling is
    keyed by board/node, so learning-curve subsets preserve identical examples.
    Zero-weight rows do not affect the weighted training objective.
    """
    chunks={}; counts={'population_rows':0,'positive_reach_rows':0,'sampled_rows':0,'files':len(records),'per_node':per_node}
    for record in records:
        d=load(record); counts['population_rows']+=len(d['x'])
        selected=[]; correction=[]
        for node in np.unique(d['node']):
            ids=np.flatnonzero((d['node']==node)&(d['weight']>0))
            counts['positive_reach_rows']+=len(ids)
            if not len(ids): continue
            key=f'{seed}:{record["spot"]}:{record["board"]}:{node}'.encode()
            rng=np.random.default_rng(int.from_bytes(hashlib.sha256(key).digest()[:8],'little'))
            kept=np.sort(rng.choice(ids,min(per_node,len(ids)),replace=False))
            selected.extend(kept); correction.extend([len(ids)/len(kept)]*len(kept))
        ids=np.asarray(selected,dtype=int)
        for k,v in d.items(): chunks.setdefault(k,[]).append(v[ids])
        chunks['weight'][-1]=chunks['weight'][-1]*np.asarray(correction,np.float32)
        counts['sampled_rows']+=len(ids)
    if not counts['sampled_rows']: raise ValueError('No positive reach in fitting split')
    return {k:np.concatenate(v) for k,v in chunks.items()},counts

if __name__=='__main__':
    import argparse
    ap=argparse.ArgumentParser(); ap.add_argument('--data',default='ml/data/flops'); ap.add_argument('--out',default='ml/out/real')
    a=ap.parse_args(); prepare(a.data,a.out)
