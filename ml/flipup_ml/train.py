"""Fixed architecture/configuration. Validation-only early stopping, CPU only."""
import copy
import time
import numpy as np
import torch
from . import SEED
from .model import EVModel

class Budget:
    def __init__(self,seconds=7200): self.remaining=seconds; self.seconds=0.; self.cpu_seconds=0.; self.runs=[]

def fit(train,val,budget,epochs=40,seed=SEED,batch_size=4096):
    if budget.remaining<=0: raise RuntimeError('CPU training wall-time budget exhausted')
    start=time.perf_counter(); cpu=time.process_time()
    torch.manual_seed(seed); rng=np.random.default_rng(seed)
    torch.set_num_threads(4); torch.use_deterministic_algorithms(True)
    model=EVModel(train['x'].shape[1])
    model.mean.copy_(torch.tensor(train['x'].mean(0)))
    scale=np.maximum(train['x'].std(0),.01)
    binary=np.all((train['x']==0)|(train['x']==1),axis=0)
    scale[binary]=1. # Includes unseen one-hot categories in exploratory LOSO.
    model.scale.copy_(torch.tensor(scale))
    tx=torch.tensor(train['x'],dtype=torch.float32); tm=torch.tensor(train['mask'],dtype=torch.float32)
    ty=torch.tensor(train['ev']/train['pot'][:,None],dtype=torch.float32)
    ts=torch.tensor(train['strategy'],dtype=torch.float32)
    tw=torch.tensor(train['weight']/max(train['weight'].mean(),1e-9),dtype=torch.float32)
    vx=torch.tensor(val['x'],dtype=torch.float32); vm=torch.tensor(val['mask'],dtype=torch.float32)
    vy=torch.tensor(val['ev']/val['pot'][:,None],dtype=torch.float32); vs=torch.tensor(val['strategy'],dtype=torch.float32)
    vw=torch.tensor(val['weight'],dtype=torch.float32)
    opt=torch.optim.AdamW(model.parameters(),lr=.001,weight_decay=.0001)
    def loss(x,m,y,s,w):
        e,q=model(x,m)
        count=m.sum(1)
        centred=(e-y)-(((e-y)*m).sum(1)/count)[:,None]
        raw=((e-y).square()*m).sum(1)/count
        center=(centred.square()*m).sum(1)/count
        ce=-(s*torch.log(q.clamp_min(1e-9))).sum(1)
        return ((raw+2*center+.2*ce)*w).sum()/w.sum().clamp_min(1e-9)
    best=float('inf'); state=None; patience=0; history=[]
    for epoch in range(epochs):
        model.train()
        order=rng.permutation(len(tx)); total=0.
        for i in range(0,len(order),batch_size):
            if time.perf_counter()-start>=budget.remaining: break
            ids=order[i:i+batch_size]; opt.zero_grad(); objective=loss(tx[ids],tm[ids],ty[ids],ts[ids],tw[ids])
            objective.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(),5); opt.step(); total+=objective.item()
        model.eval()
        with torch.no_grad(): value=float(loss(vx,vm,vy,vs,vw))
        history.append({'epoch':epoch+1,'validation_loss':value})
        if (epoch+1)%5==0: print('epoch',epoch+1,'validation_loss',round(value,6),flush=True)
        if value<best-1e-5:
            best=value; state=copy.deepcopy(model.state_dict()); patience=0
        else: patience+=1
        if patience>=6 or time.perf_counter()-start>=budget.remaining: break
    if state is None: raise RuntimeError('No completed training epoch')
    model.load_state_dict(state)
    elapsed=time.perf_counter()-start; consumed=time.process_time()-cpu
    budget.remaining-=elapsed; budget.seconds+=elapsed; budget.cpu_seconds+=consumed
    run={'wall_seconds':elapsed,'process_cpu_seconds':consumed,'epochs':len(history),'best_validation_loss':best,'history':history}
    budget.runs.append(run)
    return model,run
