"""Exact additive metrics, compiled repository grading, full-row weighted quantiles."""
import numpy as np
from .evaluate import centred,grades,quantile

class MetricAccumulator:
    def __init__(self): self.buckets={}

    def update(self,d,ev,strategy,truth_grades=None):
        mask=d['mask'].astype(bool); legal=mask.sum(1); pot=d['pot']
        err=centred(ev,mask)-centred(d['ev'],mask)
        absrow=np.abs(err).sum(1); sqrow=(err**2).sum(1)
        selected=np.where(mask,ev,-np.inf).argmax(1); true_top=np.where(mask,d['ev'],-np.inf).argmax(1)
        regret=(np.where(mask,d['ev'],-np.inf).max(1)-d['ev'][np.arange(len(mask)),selected])*100/pot
        grade_mask=mask&(d['reach']>=.01)[:,None]
        truth=truth_grades if truth_grades is not None else grades(d['ev'],d['strategy'],grade_mask,pot)
        predicted=grades(ev,strategy,grade_mask,pot); codes=3*truth+predicted
        groups=[('overall','all',np.arange(len(mask)))]
        for n in np.unique(legal): groups.append(('legal_action_count',str(n),np.flatnonzero(legal==n)))
        for field in ('spot','depth','texture','strength','player'):
            for value in np.unique(d[field]): groups.append((field,str(value),np.flatnonzero(d[field]==value)))
        for field,value,ids in groups:
            for mode in ('reach_weighted','unweighted'):
                w=d['weight'][ids].astype(float) if mode=='reach_weighted' else np.ones(len(ids))
                b=self.buckets.setdefault((mode,field,value),{'sums':np.zeros(8),'cm':np.zeros(9),'rows':0,'grade_actions':0,'regret':[],'weights':[]})
                b['sums']+=np.array([w.sum(),np.sum(w*legal[ids]),np.sum(w*absrow[ids]),np.sum(w*sqrow[ids]),np.sum(w*absrow[ids]*100/pot[ids]),np.sum(w*sqrow[ids]*(100/pot[ids])**2),np.sum(w*(selected[ids]==true_top[ids])),np.sum(w*regret[ids])])
                gm=grade_mask[ids]; flat=codes[ids][gm]
                b['cm']+=np.bincount(flat,weights=np.broadcast_to(w[:,None],gm.shape)[gm],minlength=9)
                b['rows']+=len(ids); b['grade_actions']+=int(gm.sum())
                b['regret'].append(regret[ids].copy())
                if mode=='reach_weighted': b['weights'].append(w)

    def finish(self):
        result={'by':{}}
        for (mode,field,value),b in self.buckets.items():
            w,aw,mae,mse,maep,msep,correct,regret=b['sums']; cm=b['cm'].reshape(3,3)
            def div(a,b): return float(a/b) if b else None
            r=np.concatenate(b['regret']); rw=np.concatenate(b['weights']) if b['weights'] else np.ones(len(r))
            metrics={'rows':b['rows'],'grade_actions':b['grade_actions'],'centred_mae_bb':div(mae,aw),'centred_rmse_bb':float(np.sqrt(mse/aw)) if aw else None,'centred_mae_pct_pot':div(maep,aw),'centred_rmse_pct_pot':float(np.sqrt(msep/aw)) if aw else None,'top_action_agreement':div(correct,w),'mean_regret_pct_pot':div(regret,w),'p95_regret_pct_pot':quantile(r,rw,.95),'grade_confusion_rows_truth_columns_predicted':cm.tolist(),'grade_agreement':div(cm.trace(),cm.sum()),'false_costly_rate':div(cm[0,2],cm[0].sum()),'missed_costly_rate':div(cm[2,:2].sum(),cm[2].sum())}
            if field=='overall': result[mode]=metrics
            else: result['by'].setdefault(field,{}).setdefault(value,{})[mode]=metrics
        self.buckets.clear()
        return result
