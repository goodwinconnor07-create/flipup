"""Full-population streaming B0/B1; fitting needs no giant row dictionary."""
import numpy as np
from .stream_data import load
from .baselines import normalise,equity_features

class Stats:
    def __init__(self,dim):
        self.xx=np.zeros((dim+1,dim+1)); self.xy=np.zeros((dim+1,16)); self.n=0; self.weight=0.
    def update(self,x,y,w):
        positive=w>0; x=x[positive]; y=y[positive]; w=w[positive]
        if not len(w): return
        x=np.c_[x,np.ones(len(x))]; self.xx+=x.T@(x*w[:,None]); self.xy+=x.T@(y*w[:,None]); self.n+=len(x); self.weight+=w.sum()
    def solve(self):
        if not self.n: return None
        regularizer=np.eye(len(self.xx))*self.weight/self.n; regularizer[-1,-1]=0
        return np.linalg.solve(self.xx+regularizer,self.xy)

class Baselines:
    def __init__(self):
        self.charts={}; self.ridge={}; self.fallback={}; self.ridge_fallback={}

    def fit(self,records):
        chart_stats={}; ridge_stats={}; fallback_stats={}; ridge_fallback_stats={}
        for index,record in enumerate(records):
            d=load(record); allx=equity_features(d)
            for node in np.unique(d['node']):
                ids=d['node']==node; hc=d['handclass'][ids]; w=d['weight'][ids].astype(float)
                ev=d['ev'][ids].astype(float); strategy=d['strategy'][ids].astype(float); x=allx[ids].astype(float)
                key=(record['spot'],str(node)); mask=tuple(d['mask'][np.flatnonzero(ids)[0]])
                stats=chart_stats.setdefault(key,{'w':np.zeros(169),'n':np.zeros(169),'y':np.zeros((169,16)),'unweighted':np.zeros((169,16))})
                y=np.c_[ev,strategy]
                stats['w']+=np.bincount(hc,weights=w,minlength=169); stats['n']+=np.bincount(hc,minlength=169)
                for col in range(16):
                    stats['y'][:,col]+=np.bincount(hc,weights=w*y[:,col],minlength=169)
                    stats['unweighted'][:,col]+=np.bincount(hc,weights=y[:,col],minlength=169)
                fb=fallback_stats.setdefault(mask,{'w':0.,'y':np.zeros(16)})
                fb['w']+=w.sum(); fb['y']+=(y*w[:,None]).sum(0)
                ridge_stats.setdefault(key,Stats(x.shape[1])).update(x,y,w)
                ridge_fallback_stats.setdefault(mask,Stats(x.shape[1])).update(x,y,w)
            if index%200==0: print('baseline files',index+1,'/',len(records),flush=True)
        for key,stats in chart_stats.items():
            mean=np.divide(stats['y'],stats['w'][:,None],out=np.divide(stats['unweighted'],np.maximum(stats['n'],1)[:,None]),where=stats['w'][:,None]>0)
            self.charts[key]=(mean,stats['n']>0)
        self.fallback={key:stats['y']/max(stats['w'],1e-12) for key,stats in fallback_stats.items()}
        self.ridge={key:stats.solve() for key,stats in ridge_stats.items()}
        self.ridge_fallback={key:stats.solve() for key,stats in ridge_fallback_stats.items()}
        return self

    def predict(self,d):
        ce=np.zeros_like(d['ev'],dtype=float); cs=ce.copy(); be=ce.copy(); bs=ce.copy()
        x=np.c_[equity_features(d),np.ones(len(d['x']))]
        for node in np.unique(d['node']):
            ids=np.flatnonzero(d['node']==node); key=(str(d['spot'][ids[0]]),str(node)); mask=tuple(d['mask'][ids[0]])
            fallback=self.fallback.get(mask,np.r_[np.zeros(8),np.asarray(mask)/sum(mask)])
            values=np.tile(fallback,(len(ids),1)); entry=self.charts.get(key)
            if entry is not None:
                mean,seen=entry; hc=d['handclass'][ids]; known=seen[hc]; values[known]=mean[hc[known]]
            ce[ids]=values[:,:8]; cs[ids]=values[:,8:]
            coeff=self.ridge.get(key)
            if coeff is None: coeff=self.ridge_fallback.get(mask)
            if coeff is None: values=np.tile(fallback,(len(ids),1))
            else: values=x[ids]@coeff
            be[ids]=values[:,:8]; bs[ids]=values[:,8:]
        return {'B0_chart':(ce*d['mask'],normalise(cs,d['mask'])),'B1_equity':(be*d['mask'],normalise(bs,d['mask']))}
