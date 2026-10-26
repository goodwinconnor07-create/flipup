"""Memory-bounded real-data experiment; frozen protocol, complete held-out evaluation."""
import argparse
import csv
import gc
import hashlib
import inspect
import json
from pathlib import Path
import platform
import time
import numpy as np
import torch
from . import ROOT,SEED
from .stream_data import prepare,load,sample
from .stream_baselines import Baselines
from .stream_metrics import MetricAccumulator
from .splits import grouped_split,grouped_folds,family_split,assert_disjoint
from .train import Budget,fit
from .model import predict
from .evaluate import grades,cv_intervals
from .run import verdict
from flipup_gto.review import grade

def save_json(path,value):
    tmp=Path(str(path)+'.tmp'); tmp.write_text(json.dumps(value,indent=2,allow_nan=False)); tmp.replace(path)

def evaluate_records(model,baseline,records):
    accumulators={k:MetricAccumulator() for k in ('MLP','B0_chart','B1_equity')}
    for i,record in enumerate(records):
        d=load(record); predictions=baseline.predict(d); predictions['MLP']=predict(model,d)
        gm=d['mask'].astype(bool)&(d['reach']>=.01)[:,None]
        truth=grades(d['ev'],d['strategy'],gm,d['pot'])
        for name,(ev,strategy) in predictions.items(): accumulators[name].update(d,ev,strategy,truth)
        if i%100==0: print('evaluation files',i+1,'/',len(records),flush=True)
    return {k:a.finish() for k,a in accumulators.items()}

def run(args):
    torch.set_num_threads(4)
    started=time.perf_counter(); cpu=time.process_time(); out=Path(args.out); out.mkdir(parents=True,exist_ok=True)
    if (out/'feature_manifest.json').exists():
        records=json.loads((out/'feature_manifest.json').read_text())
        domains=json.loads((out/'domain.json').read_text()); audit=json.loads((out/'audit.json').read_text())
    else: records,domains,audit=prepare(args.data,out)
    assert len(records)==audit['retained_files'] and not audit['synthetic']
    groups=np.array([r['group'] for r in records]); textures=np.array([r['texture'] for r in records])
    assignments=grouped_split(groups,textures); assert_disjoint(groups,assignments)
    development_ids=np.flatnonzero(assignments!=2)
    folds=grouped_folds(groups[development_ids],textures[development_ids])
    splits={'seed':SEED,'primary':{g:int(k) for g,k in zip(groups,assignments)},'cv_development_fold':{str(g):int(k) for g,k in zip(groups[development_ids],folds)},'0':'train','1':'validation','2':'test','texture_holdouts':{},'loso':{}}
    protocol={'seed':SEED,'architecture':'73 inputs -> 128 SiLU -> 128 SiLU -> 128 SiLU -> EV/strategy heads, 8 slots each','max_epochs':args.epochs,'per_node_positive_training_rows':args.per_node,'per_node_positive_validation_rows':args.per_node,'sampling':'uniform without replacement within each board/node positive-reach population; multiply training weights by population/sample count; fixed per-board/node seeds','baseline_fit':'all training rows with actor-reach x board-frequency weights; B0 uses unweighted mean only for entirely zero-weight cells','evaluation':'every row in every held-out file, weighted and unweighted; no evaluation row subsampling','batch_size':4096,'learning_rate':.001,'weight_decay':.0001,'patience':6,'binary_feature_scale':1.,'equity':'batch exact flop enumeration vs fixed root range; no solved deeper reach feature','training_wall_cap_seconds':7200,'configuration_search':False,'grade_function_sha256':hashlib.sha256(inspect.getsource(grade).encode()).hexdigest(),'source_sha256':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'ml/flipup_ml').glob('*.py'))}}
    save_json(out/'protocol.json',protocol); save_json(out/'splits.json',splits)
    budget=Budget(7200); runs=[]; curve=[]; cv={name:[] for name in ('MLP','B0_chart','B1_equity')}; holdouts={}
    train_records=[r for r,k in zip(records,assignments) if k==0]
    val_records=[r for r,k in zip(records,assignments) if k==1]
    test_records=[r for r,k in zip(records,assignments) if k==2]
    val,val_counts=sample(val_records,args.per_node)
    (out/'runs').mkdir(exist_ok=True)

    def assess(td_records,vd_records,ed_records,tag,validation_sample=None):
        step=time.perf_counter(); print('START',tag,'train files',len(td_records),'test files',len(ed_records),flush=True)
        train,counts=sample(td_records,args.per_node)
        vd,vc=validation_sample if validation_sample is not None else sample(vd_records,args.per_node)
        model,training=fit(train,vd,budget,args.epochs)
        del train
        if validation_sample is None: del vd
        gc.collect()
        baseline=Baselines().fit(td_records)
        scores=evaluate_records(model,baseline,ed_records)
        record={'tag':tag,'train':counts,'validation':vc,'training':training,'whole_stage_wall_seconds':time.perf_counter()-step,'scores':scores}
        runs.append({k:v for k,v in record.items() if k!='scores'})
        save_json(out/'runs'/f'{tag}.json',record)
        save_json(out/'training.json',{'protocol':protocol,'runs':runs,'training_wall_seconds':budget.seconds,'training_process_cpu_seconds':budget.cpu_seconds})
        print('DONE',tag,'training seconds',round(training['wall_seconds'],2),'stage seconds',round(record['whole_stage_wall_seconds'],2),flush=True)
        return model,baseline,scores

    rng=np.random.default_rng(SEED); training_groups=rng.permutation(sorted({r['group'] for r in train_records}))
    primary={}; validation={}; final=None
    for fraction in (.1,.25,.5,.75,1.):
        chosen=set(training_groups[:max(1,round(len(training_groups)*fraction))])
        tr=[r for r in train_records if r['group'] in chosen]
        tag=f'curve_{round(fraction*100):03}'
        model,baseline,values=assess(tr,val_records,test_records,tag,(val,val_counts))
        m=values['MLP']['reach_weighted']
        item={'fraction':fraction,'training_rank_triples':len(chosen),'training_boards':len({r['board'] for r in tr}),'training_files':len(tr),'training_population_rows':runs[-1]['train']['population_rows'],'training_sampled_rows':runs[-1]['train']['sampled_rows'],'training_wall_seconds':runs[-1]['training']['wall_seconds'],**{k:v for k,v in m.items() if k!='grade_confusion_rows_truth_columns_predicted'},'B0_mean_regret_pct_pot':values['B0_chart']['reach_weighted']['mean_regret_pct_pot'],'B1_mean_regret_pct_pot':values['B1_equity']['reach_weighted']['mean_regret_pct_pot']}
        curve.append(item)
        with (out/'learning_curve.csv').open('w') as f:
            w=csv.DictWriter(f,fieldnames=list(curve[0]),lineterminator='\n'); w.writeheader(); w.writerows(curve)
        if fraction==1:
            final=model; primary=values
            artifact={'state_dict':final.state_dict(),'input_dim':73,'domain':domains,'equity_samples':1024,'synthetic':False,'seed':SEED,'protocol':protocol}
            torch.save(artifact,out/'model.pt')
            validation=evaluate_records(final,baseline,val_records)
        del baseline; gc.collect()
    del val; gc.collect()
    development=[records[i] for i in development_ids]
    for fold in range(5):
        tr=[r for r,k in zip(development,folds) if k!=fold]; ed=[r for r,k in zip(development,folds) if k==fold]
        inner=grouped_split([r['group'] for r in tr],[r['texture'] for r in tr],seed=SEED+fold)
        assert_disjoint(np.array([r['group'] for r in tr]),inner)
        _,baseline,values=assess([r for r,k in zip(tr,inner) if k==0],[r for r,k in zip(tr,inner) if k!=0],ed,f'cv_{fold}')
        for name in cv: cv[name].append(values[name])
        del baseline; gc.collect()
    for family,mask in [('paired',np.char.startswith(textures,'paired:')),('monotone',np.char.endswith(textures,':monotone'))]:
        ids=family_split(groups,mask,textures)
        if ids is None: holdouts[family]={'status':'insufficient groups'}; continue
        assert_disjoint(groups,ids); splits['texture_holdouts'][family]={g:int(k) for g,k in zip(groups,ids)}
        _,baseline,values=assess(*([r for r,k in zip(records,ids) if k==i] for i in (0,1,2)),f'family_{family}')
        holdouts[family]=values; del baseline; gc.collect()
    for spot in sorted(domains):
        tr=[r for r in records if r['spot']!=spot]; ed=[r for r in records if r['spot']==spot]
        inner=grouped_split([r['group'] for r in tr],[r['texture'] for r in tr])
        splits['loso'][spot]={'training_validation_groups':{r['group']:int(k) for r,k in zip(tr,inner)},'test_spot':spot,'board_overlap_allowed':True}
        _,baseline,values=assess([r for r,k in zip(tr,inner) if k==0],[r for r,k in zip(tr,inner) if k!=0],ed,f'loso_{spot}')
        holdouts['leave_one_spot_out:'+spot]=values; del baseline; gc.collect()
    save_json(out/'splits.json',splits)
    cv_results={k:{'fold_results':v,'ci95':cv_intervals(v),'note':'Descriptive Student-t intervals over five grouped CV folds; overlapping fitting sets, not independent replicates.'} for k,v in cv.items()}
    results={'synthetic':False,'primary':primary,'validation':validation,'cv':cv_results,'holdouts':holdouts,'primary_verdict':verdict(primary,cv_results),'validation_verdict':verdict(validation),'texture_verdicts':{k:verdict(v) if 'MLP' in v else 'insufficient groups' for k,v in holdouts.items() if k in ('paired','monotone')}}
    results['verdict']=results['primary_verdict']
    if any(v.startswith('not sufficient') or v=='insufficient groups' for v in results['texture_verdicts'].values()): results['verdict']='not sufficient across held-out texture families'
    from .infer import Predictor
    from .features import hand_rows
    inference=Predictor(out/'model.pt'); first=test_records[0]; d=load(first)
    # Choose a nontrivial node, rather than a forced one-action root, if available.
    nodes=list(domains[first['spot']]['nodes']); key=next((n for n in nodes if len(domains[first['spot']]['nodes'][n]['actions'])>1),nodes[0]); path=[] if not key else list(map(int,key.split('.')))
    ids=d['node']==key; node={k:v[ids] for k,v in d.items()}
    for _ in range(3): predict(final,node)
    now=time.perf_counter()
    for _ in range(50): predict(final,node)
    network_ms=(time.perf_counter()-now)*1000/50
    hand_rows.cache_clear(); now=time.perf_counter(); answer=inference.predict(first['spot'],first['board'],path); cold_ms=(time.perf_counter()-now)*1000
    now=time.perf_counter(); inference.predict(first['spot'],first['board'],path); warm_ms=(time.perf_counter()-now)*1000
    assert answer['supported'] and answer['evidence']=='experimental_model'
    save_json(out/'inference-smoke.json',{'spot':first['spot'],'board':first['board'],'path':path,'supported':answer['supported'],'evidence':answer['evidence'],'hands':len(answer['hands'])})
    costs={'parameters':sum(p.numel() for p in final.parameters()),'checkpoint_bytes':(out/'model.pt').stat().st_size,'whole_node_stored_hands':len(node['x']),'whole_node_positive_range_hands':len(answer['hands']),'network_only_ms_per_node':network_ms,'whole_node_inference_cold_ms':cold_ms,'whole_node_inference_warm_ms':warm_ms,'training_wall_seconds':budget.seconds,'training_process_cpu_seconds':budget.cpu_seconds,'pipeline_wall_seconds':time.perf_counter()-started,'pipeline_process_cpu_seconds':time.process_time()-cpu,'training_runs':len(runs),'cpu_threads':4,'platform':platform.machine(),'torch':str(torch.__version__),'dataset_rows':sum(r['rows'] for r in records),'rank_triples':len(set(groups)),'boards':len({r['board'] for r in records}),'primary_test_rows':sum(r['rows'] for r in test_records),'primary_test_rank_triples':len({r['group'] for r in test_records})}
    assert costs['parameters']<5_000_000 and costs['checkpoint_bytes']<10_000_000 and budget.seconds<=7200+60
    results['costs']=costs; save_json(out/'metrics.json',results)
    from .real_report import report
    report(out,results,audit,curve,runs)
    print('COMPLETE',results['verdict'],json.dumps(costs),flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--data',default='ml/data/flops'); ap.add_argument('--out',default='ml/out/real'); ap.add_argument('--epochs',type=int,default=20); ap.add_argument('--per-node',type=int,default=64)
    run(ap.parse_args())
