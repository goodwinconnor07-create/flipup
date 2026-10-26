"""B0 charts and B1 per-node equity/hand-feature ridge regressions."""
import numpy as np
from sklearn.linear_model import Ridge

def key_rows(data,hand=False):
    return [(str(s),str(n),int(h)) if hand else (str(s),str(n)) for s,n,h in zip(data['spot'],data['node'],data['handclass'])]

def normalise(strategy,mask):
    strategy=np.maximum(strategy,0)*mask
    return np.divide(strategy,strategy.sum(1,keepdims=True),out=mask/mask.sum(1,keepdims=True),where=strategy.sum(1,keepdims=True)>1e-12)

class Chart:
    def fit(self,d):
        self.table={}; self.fallback={}
        for keys,target in [(key_rows(d,True),self.table),([(tuple(m),) for m in d['mask']],self.fallback)]:
            groups={}
            for i,k in enumerate(keys): groups.setdefault(k,[]).append(i)
            for k,ids in groups.items():
                w=d['weight'][ids]; w=w if w.sum()>0 else np.ones(len(ids))
                target[k]=(np.average(d['ev'][ids],axis=0,weights=w),np.average(d['strategy'][ids],axis=0,weights=w))
        return self

    def predict(self,d):
        pairs=[self.table.get(k,self.fallback.get((tuple(m),),(np.zeros(8),m/m.sum()))) for k,m in zip(key_rows(d,True),d['mask'])]
        ev,s=map(np.array,zip(*pairs))
        return ev*d['mask'],normalise(s,d['mask'])

def equity_features(d):
    h=d['x'][:,-22:]
    eq=h[:,-2:-1]
    return np.c_[h,eq**2,eq*h[:,:5]]

class Equity:
    def fit(self,d):
        x=equity_features(d)
        self.models={}; self.fallback={}
        keys=key_rows(d)
        groups={}
        for i,k in enumerate(keys): groups.setdefault(k,[]).append(i)
        for k,ids in [(None,np.arange(len(x))),*groups.items()]:
            for slot in range(8):
                rows=np.asarray(ids)[d['mask'][ids,slot]>0]
                rows=rows[d['weight'][rows]>0]
                if not len(rows): continue
                y=np.c_[d['ev'][rows,slot],d['strategy'][rows,slot]]
                model=Ridge(alpha=1.)
                w=d['weight'][rows]; model.fit(x[rows],y,sample_weight=w/w.mean())
                (self.fallback if k is None else self.models)[slot if k is None else (k,slot)]=model
        return self

    def predict(self,d):
        x=equity_features(d); ev=np.zeros((len(x),8)); s=ev.copy()
        groups={}
        for i,k in enumerate(key_rows(d)): groups.setdefault(k,[]).append(i)
        for k,ids in groups.items():
            for slot in range(8):
                rows=np.asarray(ids)[d['mask'][ids,slot]>0]
                model=self.models.get((k,slot),self.fallback.get(slot))
                if model is None or not len(rows): continue
                pred=model.predict(x[rows]); ev[rows,slot]=pred[:,0]; s[rows,slot]=pred[:,1]
        return ev,normalise(s,d['mask'])
