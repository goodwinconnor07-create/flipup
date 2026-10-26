"""One metrics implementation for every model; grade() is imported read-only."""
import numpy as np
from scipy.stats import t
from flipup_gto.review import grade

# Compile the actual unchanged repository function, rather than reimplementing
# its thresholds. No files are emitted into gto/ (Numba disk cache is disabled).
try:
    from numba import njit
    _native_grade=njit(cache=False)(grade)

    @njit(cache=False)
    def _native_grades(ev,strategy,mask,pot):
        out=np.full(ev.shape,-1,np.int8)
        for i in range(ev.shape[0]):
            best=-np.inf; freq=-np.inf; top=-1
            for j in range(ev.shape[1]):
                if mask[i,j]:
                    best=max(best,ev[i,j])
                    if strategy[i,j]>freq: freq=strategy[i,j]; top=j
            for j in range(ev.shape[1]):
                if mask[i,j]:
                    label=_native_grade(max(0.,float(best-ev[i,j])),float(pot[i]),float(strategy[i,j]),top==j)
                    out[i,j]=0 if label=='best' or label=='correct' else 1 if label=='inaccuracy' else 2
        return out
except ImportError:
    _native_grades=None

def centred(ev,mask):
    return (ev-(ev*mask).sum(1,keepdims=True)/mask.sum(1,keepdims=True))*mask

def quantile(values,weights,q):
    order=np.argsort(values); v=values[order]; w=weights[order]
    if not len(v) or w.sum()<=0: return None
    return float(v[min(np.searchsorted(np.cumsum(w),q*w.sum()),len(v)-1)])

def grades(ev,strategy,mask,pot):
    if _native_grades is not None: return _native_grades(ev,strategy,mask,pot)
    return reference_grades(ev,strategy,mask,pot)

def reference_grades(ev,strategy,mask,pot):
    best=np.where(mask,ev,-np.inf).max(1)
    top=np.where(mask,strategy,-np.inf).argmax(1)
    out=np.full(ev.shape,-1,np.int8)
    mapping={'best':0,'correct':0,'inaccuracy':1,'mistake':2,'blunder':2}
    for i,j in zip(*np.where(mask)):
        out[i,j]=mapping[grade(max(0.,float(best[i]-ev[i,j])),float(pot[i]),float(strategy[i,j]),bool(top[i]==j))]
    return out

def metrics(d,pred_ev,pred_strategy,weighted=True):
    mask=d['mask'].astype(bool); pot=d['pot']
    w=d['weight'].astype(float) if weighted else np.ones(len(mask))
    def avg(v,ww=w): return float(np.average(v,weights=ww)) if ww.sum()>0 else None
    err=centred(pred_ev,mask)-centred(d['ev'],mask)
    aw=w[:,None]*mask
    chosen=np.where(mask,pred_ev,-np.inf).argmax(1); truth=np.where(mask,d['ev'],-np.inf).argmax(1)
    regret=(np.where(mask,d['ev'],-np.inf).max(1)-d['ev'][np.arange(len(mask)),chosen])*100/pot
    allowed=d['reach']>=.01
    gm=mask[allowed]
    tg=grades(d['ev'][allowed],d['strategy'][allowed],gm,pot[allowed]); pg=grades(pred_ev[allowed],pred_strategy[allowed],gm,pot[allowed])
    cm=np.zeros((3,3))
    for i,j in zip(*np.where(gm)): cm[tg[i,j],pg[i,j]]+=w[allowed][i]
    def ratio(a,b): return float(a/b) if b else None
    return {'rows':len(w),'grade_actions':int(gm.sum()),'centred_mae_bb':ratio((abs(err)*aw).sum(),aw.sum()),'centred_rmse_bb':float(np.sqrt((err**2*aw).sum()/aw.sum())) if aw.sum() else None,'centred_mae_pct_pot':ratio((abs(err)*100/pot[:,None]*aw).sum(),aw.sum()),'centred_rmse_pct_pot':float(np.sqrt(((err*100/pot[:,None])**2*aw).sum()/aw.sum())) if aw.sum() else None,'top_action_agreement':avg(chosen==truth),'mean_regret_pct_pot':avg(regret),'p95_regret_pct_pot':quantile(regret,w,.95),'grade_confusion_rows_truth_columns_predicted':cm.tolist(),'grade_agreement':ratio(cm.trace(),cm.sum()),'false_costly_rate':ratio(cm[0,2],cm[0].sum()),'missed_costly_rate':ratio(cm[2,:2].sum(),cm[2].sum())}

def evaluate(d,e,s,breakdowns=True):
    result={k:metrics(d,e,s,k=='reach_weighted') for k in ('reach_weighted','unweighted')}
    if breakdowns:
        result['by']={}
        for field in ('spot','depth','texture','strength','player'):
            result['by'][field]={}
            for v in np.unique(d[field]):
                ids=d[field]==v; sub={k:x[ids] for k,x in d.items()}
                result['by'][field][str(v)]={mode:metrics(sub,e[ids],s[ids],mode=='reach_weighted') for mode in ('reach_weighted','unweighted')}
    return result

def cv_intervals(folds):
    keys=['centred_mae_bb','centred_rmse_bb','centred_mae_pct_pot','centred_rmse_pct_pot','top_action_agreement','mean_regret_pct_pot','p95_regret_pct_pot','grade_agreement','false_costly_rate','missed_costly_rate']
    out={}
    for mode in ('reach_weighted','unweighted'):
        out[mode]={}
        for key in keys:
            a=np.array([f[mode][key] for f in folds if f[mode][key] is not None])
            out[mode][key]={'folds':len(a),'mean':float(a.mean()) if len(a) else None,'ci95':(a.mean()+np.array([-1,1])*t.ppf(.975,len(a)-1)*a.std(ddof=1)/np.sqrt(len(a))).tolist() if len(a)>1 else None}
    return out
