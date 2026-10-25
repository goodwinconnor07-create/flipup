#!/usr/bin/env python3
"""Train an action-conditioned policy and action-value model; export NumPy inference weights."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
import torch
from torch import nn
from flipup_gto.strategy import CONTEXT_DIM, ACTION_DIM, FEATURES, MAX_ACTIONS
from flipup_gto.value_data import atomic_json, atomic_npz, board_group, canonical_board, digest, split_for


class PolicyNet(nn.Module):
    def __init__(self, hidden=128):
        super().__init__()
        self.body = nn.Sequential(nn.Linear(CONTEXT_DIM+ACTION_DIM, hidden), nn.ReLU(),
                                  nn.Linear(hidden, hidden), nn.ReLU(), nn.Linear(hidden, 2))
    def forward(self, c, a, mask):
        inp = torch.cat([c[:, None, :].expand(-1, MAX_ACTIONS, -1), a], dim=-1)
        raw = self.body(inp)
        return raw[:, :, 0].masked_fill(~mask, -1e9), raw[:, :, 1]


def load_rows(jobs, max_games=2000):
    rows, versions, ids = [], set(), set()
    for root in jobs:
        root = Path(root)
        manifest = json.loads((root/'manifest.json').read_text())
        versions.add((manifest['source'], manifest.get('players', 2), manifest['street']))
        for p in sorted(root.glob('*.npz'))[:max_games]:
            with np.load(p, allow_pickle=False) as d:
                if 'policy_context' not in d:
                    raise ValueError(f'{p}: lacks strategy targets; use --strategy generation')
                m = json.loads(str(d['metadata']))
                uid = (m['job'], m['sample_id'])
                if uid in ids:
                    raise ValueError('duplicate strategy game')
                ids.add(uid)
                if m['job'] != digest(manifest) or m['gap_pct'] > manifest['target']:
                    raise ValueError('invalid teacher provenance/convergence')
                if m['split'] != split_for(d['board']):
                    raise ValueError('invalid split')
                arrays = [d['policy_'+key].copy() for key in ('context','actions','mask','target','ev')]
                c,a,mask,target,ev=arrays
                if c.ndim!=2 or c.shape[1]!=CONTEXT_DIM or a.shape!=(len(c),MAX_ACTIONS,ACTION_DIM):
                    raise ValueError('invalid policy dimensions')
                if mask.shape!=target.shape or mask.shape!=ev.shape or mask.shape!=(len(c),MAX_ACTIONS):
                    raise ValueError('invalid policy labels')
                if not all(np.isfinite(x).all() for x in arrays) or not np.allclose(target.sum(1),1,atol=1e-4):
                    raise ValueError('nonfinite/invalid policy labels')
                if np.any(target[~mask.astype(bool)]!=0):
                    raise ValueError('policy target puts mass on illegal actions')
                rows.append(dict(arrays=arrays, split=m['split'], group=board_group(d['board']),
                                 root=canonical_board(d['board']), uid=uid, sha=hashlib.sha256(p.read_bytes()).hexdigest()))
    if len(versions)!=1:
        raise ValueError('policy jobs must use one teacher, player count and street')
    roots={}
    for r in rows: roots.setdefault(r['root'],set()).add(r['split'])
    rows=[r for r in rows if len(roots[r['root']])==1]
    if not rows: raise ValueError('no policy data')
    return rows, next(iter(versions))


def tensors(rows):
    return [torch.tensor(np.concatenate([r['arrays'][i] for r in rows]), dtype=torch.bool if i==2 else torch.float32)
            for i in range(5)]


def score(net, rows):
    if not rows: return {'games':0,'rows':0}
    losses, tvs, evs = [],[],[]
    with torch.no_grad():
        for r in rows:
            c,a,m,t,e=tensors([r]); logits,pred_ev=net(c,a,m); p=logits.softmax(-1)
            loss=(e.masked_fill(~m,-1e9).max(1).values-(p*e).sum(1)).clamp_min(0)
            losses.append(float(loss.mean()))
            tvs.append(float((.5*(p-t).abs().sum(1)).mean()))
            evs.append(float(((pred_ev-e).abs()*m).sum()/m.sum()))
    return dict(groups=len({r['group'] for r in rows}),games=len(rows),rows=sum(len(r['arrays'][0]) for r in rows),
                local_loss_mean=float(np.mean(losses)),local_loss_p95=float(np.quantile(losses,.95)),
                policy_tv_mean=float(np.mean(tvs)),action_ev_mae=float(np.mean(evs)))


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('jobs',nargs='+'); ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--epochs',type=int,default=100);ap.add_argument('--threads',type=int,default=2)
    ap.add_argument('--hidden',type=int,default=128);ap.add_argument('--max-games',type=int,default=2000)
    ap.add_argument('--seed',type=int,default=31)
    args=ap.parse_args()
    if min(args.epochs,args.threads,args.hidden,args.max_games)<1: ap.error('positive limits required')
    if args.out.exists(): ap.error('choose a new candidate filename')
    args.out.parent.mkdir(parents=True,exist_ok=True)
    torch.manual_seed(args.seed);torch.set_num_threads(args.threads)
    rows,version=load_rows(args.jobs,args.max_games)
    tr=[r for r in rows if r['split']=='train']; va=[r for r in rows if r['split']=='validation']; te=[r for r in rows if r['split']=='test']
    if min(map(len,(tr,va,te)))<2: ap.error('need at least two games in each held-out split')
    net=PolicyNet(args.hidden);opt=torch.optim.Adam(net.parameters(),lr=1e-3)
    c,a,m,t,e=tensors(tr); best=float('inf'); best_state=None
    for epoch in range(args.epochs):
        net.train(); perm=torch.randperm(len(c))
        for start in range(0,len(c),256):
            ix=perm[start:start+256];opt.zero_grad();logits,ev=net(c[ix],a[ix],m[ix])
            policy=-(t[ix]*logits.log_softmax(-1)).sum(1).mean()
            value=(nn.functional.huber_loss(ev,e[ix],reduction='none')*m[ix]).sum()/m[ix].sum()
            loss=policy+value
            if not torch.isfinite(loss):raise ValueError('nonfinite loss')
            loss.backward();opt.step()
        if (epoch+1)%10==0 or epoch+1==args.epochs:
            net.eval(); val=score(net,va)
            objective=val['local_loss_mean']+0.05*val['policy_tv_mean']+0.05*val['action_ev_mae']
            print(f'epoch {epoch+1}: {val}',flush=True)
            if objective<best:
                best=objective; best_state={k:v.detach().clone() for k,v in net.state_dict().items()}
    net.load_state_dict(best_state);net.eval()
    val,test=score(net,va),score(net,te)
    # Test used only after checkpoint selection. This is an engineering gate, not a Nash certificate.
    passed=(len(tr)>=100 and len(va)>=20 and len(te)>=20 and val['groups']>=20 and test['groups']>=20 and
            test['local_loss_mean']<=.005 and test['local_loss_p95']<=.02 and
            test['policy_tv_mean']<=.10 and test['action_ev_mae']<=.03)
    meta=dict(features=FEATURES,teacher=version[0],players=version[1],street=version[2],
              status='candidate',gate_passed=passed,validation=val,test=test,seed=args.seed,
              data=digest([(r['uid'],r['sha']) for r in rows]),
              warning='Local teacher-continuation metrics; not full-policy exploitability or out-of-domain approval.')
    layers=[x for x in net.body if isinstance(x,nn.Linear)]
    atomic_npz(args.out,layers=np.asarray(len(layers)),metadata=np.asarray(json.dumps(meta)),
               **{f'w{i}':l.weight.detach().numpy() for i,l in enumerate(layers)},
               **{f'b{i}':l.bias.detach().numpy() for i,l in enumerate(layers)})
    atomic_json(args.out.with_suffix('.report.json'),meta)
    print(json.dumps(meta,indent=2))


if __name__=='__main__': main()
