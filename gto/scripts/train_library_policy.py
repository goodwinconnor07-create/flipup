#!/usr/bin/env python3
"""LAPTOP ONLY: distinct flop-library policy/EV candidate; never activates a model."""
import argparse
import json
import os
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from flipup_gto.library_questions import CONTEXT,FEATURES
from flipup_gto.value_data import atomic_json,atomic_npz,split_for,board_group,digest


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--data',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--epochs',type=int,default=20);p.add_argument('--max-rows',type=int,default=100000);a=p.parse_args()
    if a.epochs<1 or a.max_rows<1:raise ValueError('positive training limits required')
    a.out.mkdir(parents=True,exist_ok=True);splits={k:[] for k in ('train','validation','test')};groups={k:set() for k in splits};sources=[];count=0
    for path in sorted(a.data.glob('*.npz')):
        with np.load(path,allow_pickle=False) as d:
            meta=json.loads(str(d['metadata']));split=split_for(d['board'])
            if meta['features']!=FEATURES or meta['split']!=split or meta.get('reviewed') is not True or not meta.get('reviewDigest'):raise ValueError('invalid/unreviewed teacher feature/split')
            arrays=[d[k].copy() for k in ('context','actions','mask','target','ev')];c,acts,mask,target,ev=arrays
            if c.ndim!=2 or c.shape[1]!=CONTEXT or acts.shape!=(len(c),16,8) or mask.shape!=(len(c),16) or target.shape!=mask.shape or ev.shape!=mask.shape:raise ValueError('invalid label shape')
            if not all(np.isfinite(v).all() for v in arrays) or not np.allclose(target.sum(1),1,atol=1e-5) or (target<0).any() or (target[~mask.astype(bool)]!=0).any():raise ValueError('invalid labels')
            if meta['source'] in sources:raise ValueError('duplicate source')
            if count+len(c)>a.max_rows:break
            sources.append(meta['source']);count+=len(c);splits[split].append(arrays);groups[split].add(tuple(board_group(d['board'])))
    counts={k:len(v) for k,v in groups.items()}
    if counts['train']<100 or counts['validation']<20 or counts['test']<20:
        atomic_json(a.out/'status.json',dict(stage='waiting for reviewed board coverage',groups=counts,activated=False));return
    import torch
    from torch import nn
    torch.manual_seed(7);torch.set_num_threads(int(os.environ.get('FU_NET_THREADS','2')))
    datasets={k:[torch.as_tensor(np.concatenate([row[j] for row in v]),dtype=torch.bool if j==2 else torch.float32) for j in range(5)] for k,v in splits.items()}
    net=nn.Sequential(nn.Linear(CONTEXT+8,128),nn.ReLU(),nn.Linear(128,128),nn.ReLU(),nn.Linear(128,2))
    optimizer=torch.optim.Adam(net.parameters(),lr=.001)
    def forward(c,acts,mask):
        raw=net(torch.cat([c[:,None,:].expand(-1,16,-1),acts],-1))
        return raw[:,:,0].masked_fill(~mask,-1e9),raw[:,:,1]
    def evaluate(data):
        c,acts,mask,target,ev=data
        with torch.no_grad():
            logits,pred_ev=forward(c,acts,mask);prob=logits.softmax(-1)
            best=ev.masked_fill(~mask,-1e9).max(1).values
            return dict(policyTV=float((prob-target).abs().sum(1).mean()/2),evMAEPot=float((pred_ev-ev)[mask].abs().mean()),
                        expectedLossPot=float((best-(prob*ev).sum(1)).mean()))
    best=float('inf');weights=None
    for epoch in range(a.epochs):
        c,acts,mask,target,ev=datasets['train']
        for batch in torch.randperm(len(c)).split(256):
            logits,pred=forward(c[batch],acts[batch],mask[batch]);loss=-(target[batch]*logits.log_softmax(-1)).sum(1).mean()+((pred-ev[batch])[mask[batch]]**2).mean()
            optimizer.zero_grad();loss.backward();optimizer.step()
        metrics=evaluate(datasets['validation']);score=metrics['policyTV']+metrics['evMAEPot']
        if score<best:best=score;weights={k:v.detach().clone() for k,v in net.state_dict().items()}
        atomic_json(a.out/'status.json',dict(stage='training',epoch=epoch+1,validation=metrics,groups=counts,activated=False))
    net.load_state_dict(weights);validation=evaluate(datasets['validation']);test=evaluate(datasets['test'])
    passed=test['policyTV']<=.15 and test['evMAEPot']<=.05 and test['expectedLossPot']<=.02
    version=digest(sources);destination=a.out/version;destination.mkdir(exist_ok=True)
    metadata=dict(features=FEATURES,teacher='reviewed stored flop-library abstraction',groups=counts,validation=validation,test=test,evaluationPassed=passed,activated=False)
    atomic_npz(destination/'policy.npz',**{k:v.numpy() for k,v in weights.items()},metadata=np.asarray(json.dumps(metadata)))
    atomic_json(destination/'evaluation.json',metadata);atomic_json(a.out/'status.json',dict(stage='candidate evaluated',**metadata))


if __name__=='__main__':main()
