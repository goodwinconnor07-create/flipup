"""Predeclared experiment. Synthetic mode executes fits but suppresses accuracy."""
import argparse
import csv
import json
from pathlib import Path
import platform
import time
import numpy as np
import torch
from . import SEED, ROOT
from .audit import audit
from .data import build_dataset, domain, subset
from .splits import grouped_split, grouped_folds, family_split, assert_disjoint
from .baselines import Chart, Equity
from .train import fit, Budget
from .model import predict
from .evaluate import evaluate, cv_intervals

def run(args):
    started=time.perf_counter(); cpu=time.process_time()
    out=Path(args.out); out.mkdir(parents=True,exist_ok=True)
    entries,a= audit(args.data,out)
    if not entries: raise RuntimeError('No usable data: inspect data_audit.md')
    synthetic=any(e.meta.get('synthetic',False) for e in entries)
    if synthetic and not all(e.meta.get('synthetic',False) for e in entries): raise ValueError('Do not mix synthetic and real data')
    domains=domain(entries)
    data=build_dataset(entries,out/'cache',args.equity_samples)
    assignment=grouped_split(data['group'],data['texture']); assert_disjoint(data['group'],assignment)
    split={'seed':SEED,'primary':{str(g):int(assignment[np.where(data['group']==g)[0][0]]) for g in sorted(set(data['group']))},'0':'train','1':'validation','2':'test'}
    (out/'splits.json').write_text(json.dumps(split,indent=2))
    train, val, test=[subset(data,assignment==i) for i in (0,1,2)]
    budget=Budget(7200)
    results={'synthetic':synthetic,'primary':{},'validation':{},'cv':{},'holdouts':{}}
    def assess(td,vd,ed,tag):
        model,record=fit(td,vd,budget,args.epochs)
        values={}
        for name,method in [('B0_chart',Chart()),('B1_equity',Equity())]:
            method.fit(td); e,s=method.predict(ed); values[name]=evaluate(ed,e,s)
        e,s=predict(model,ed); values['MLP']=evaluate(ed,e,s)
        print(tag,'completed',record['wall_seconds'],flush=True)
        return model,values
    # Nested subsets selected using training groups only; same untouched test boards.
    rng=np.random.default_rng(SEED); groups=rng.permutation(sorted(set(train['group'])))
    curve=[]; final=None
    for fraction in (.10,.25,.50,.75,1.):
        selected=groups[:max(1,round(len(groups)*fraction))]
        td=subset(train,np.isin(train['group'],selected))
        model,values=assess(td,val,test,f'learning_curve_{fraction}')
        item={'fraction':fraction,'training_rank_triples':len(selected),'training_boards':len(set(td['board'])),'wall_seconds':budget.runs[-1]['wall_seconds']}
        if not synthetic: item.update(values['MLP']['reach_weighted'])
        curve.append(item)
        if fraction==1:
            final=model; results['primary']=values
            for name,method in [('B0_chart',Chart()),('B1_equity',Equity())]:
                method.fit(td); e,s=method.predict(val); results['validation'][name]=evaluate(val,e,s)
            e,s=predict(model,val); results['validation']['MLP']=evaluate(val,e,s)
    with (out/'learning_curve.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=list(curve[0]),lineterminator='\n'); writer.writeheader(); writer.writerows(curve)
    # CV operates on development boards only. The primary test is never reused for fitting.
    development=subset(data,assignment!=2)
    folds=grouped_folds(development['group'],development['texture'])
    split['cv_development_fold']={str(g):int(folds[np.where(development['group']==g)[0][0]]) for g in sorted(set(development['group']))}
    split['texture_holdouts']={}
    cv={k:[] for k in ('MLP','B0_chart','B1_equity')}
    for fold in range(5):
        remain=folds!=fold
        d=subset(development,remain)
        inner=grouped_split(d['group'],d['texture'],seed=SEED+fold)
        td=subset(d,inner==0); vd=subset(d,inner!=0); ed=subset(development,~remain)
        _,values=assess(td,vd,ed,f'CV_{fold}')
        for k in cv: cv[k].append(values[k])
    results['cv']={k:{'fold_results':v,'ci95':cv_intervals(v),'note':'Student-t interval over five dependent CV fold metrics; descriptive, small-sample uncertainty, not a guarantee.'} for k,v in cv.items()}
    # Holdout decisions fixed before seeing any model outputs. Group exclusions apply globally.
    for family,mask in [('paired',np.char.startswith(data['texture'],'paired:')),('monotone',np.char.endswith(data['texture'],':monotone'))]:
        ids=family_split(data['group'],mask,data['texture'])
        if ids is None:
            results['holdouts'][family]={'status':'insufficient groups'}; continue
        assert_disjoint(data['group'],ids)
        split['texture_holdouts'][family]={str(g):int(ids[np.where(data['group']==g)[0][0]]) for g in sorted(set(data['group']))}
        _,values=assess(*(subset(data,ids==i) for i in (0,1,2)),f'holdout_{family}')
        results['holdouts'][family]=values
    # LOSO intentionally reuses boards across spots: tests transfer to another range,
    # not unseen-board generalisation. Mark this distinct exploratory objective.
    for spot in sorted(set(data['spot'])):
        remaining=data['spot']!=spot
        if not remaining.any():
            results['holdouts']['leave_one_spot_out:'+spot]={'status':'not run: only one spot available'}; continue
        d=subset(data,remaining); inner=grouped_split(d['group'],d['texture'])
        _,values=assess(subset(d,inner==0),subset(d,inner!=0),subset(data,~remaining),f'LOSO_{spot}')
        results['holdouts']['leave_one_spot_out:'+spot]=values
    (out/'splits.json').write_text(json.dumps(split,indent=2))
    # Domain stores inputs only, no target EVs, strategies or deeper reaches.
    artifact={'state_dict':final.state_dict(),'input_dim':data['x'].shape[1],'domain':domains,'equity_samples':args.equity_samples,'synthetic':synthetic,'seed':SEED}
    torch.save(artifact,out/'model.pt')
    params=sum(p.numel() for p in final.parameters())
    if params>=5_000_000 or (out/'model.pt').stat().st_size>=10_000_000: raise RuntimeError('Model size limit')
    # Network-only batch timing for one actual held-out node, plus end-to-end inference.
    row=0; select=(test['board']==test['board'][row])&(test['spot']==test['spot'][row])&(test['node']==test['node'][row])
    node=subset(test,select)
    for _ in range(3): predict(final,node)
    before=time.perf_counter()
    for _ in range(30): predict(final,node)
    ms=(time.perf_counter()-before)*1000/30
    from .infer import Predictor
    inference=Predictor(out/'model.pt'); spot=str(test['spot'][row]); board=str(test['board'][row]); path=[] if not test['node'][row] else [int(x) for x in test['node'][row].split('.')]
    from .features import root_equity
    root_equity.cache_clear()
    before=time.perf_counter(); answer=inference.predict(spot,board,path); cold_ms=(time.perf_counter()-before)*1000
    before=time.perf_counter(); inference.predict(spot,board,path); warm_ms=(time.perf_counter()-before)*1000
    costs={'parameters':params,'checkpoint_bytes':(out/'model.pt').stat().st_size,'whole_node_hands':len(node['x']),'network_only_ms_per_node':ms,'whole_node_inference_first_ms':cold_ms,'whole_node_inference_warm_ms':warm_ms,'training_wall_seconds':budget.seconds,'training_process_cpu_seconds':budget.cpu_seconds,'pipeline_wall_seconds':time.perf_counter()-started,'pipeline_process_cpu_seconds':time.process_time()-cpu,'training_runs':len(budget.runs),'cpu_threads':4,'hardware':platform.machine(),'torch':torch.__version__}
    assert answer['supported']
    (out/'training.json').write_text(json.dumps({'seed':SEED,'configuration':{'width':128,'epochs_max':args.epochs,'batch_size':2048,'lr':.001,'weight_decay':.0001,'loss':'raw EV + 2*centred EV + .2*strategy CE; EV/pot; reach*board-frequency weights'},'runs':budget.runs,'costs':costs},indent=2))
    if synthetic:
        # Suppress all fixture accuracy numbers, including those from holdouts and CV.
        published={'status':'inconclusive_no_real_data','synthetic_fixture_only':True,'accuracy_metrics':None,'reason':'Attached solved-data ZIP exceeds 32 MiB transfer limit. All fits used appendix-B invented ranges; no accuracy claims or fixture accuracy numbers are published.','executed':{'models':['MLP','B0_chart','B1_equity'],'learning_curve_fractions':[.1,.25,.5,.75,1.],'cv_folds':5,'texture_holdouts':['paired','monotone'],'leave_one_spot_out':'unavailable with a single synthetic spot'},'costs':costs}
    else:
        published=results; published['costs']=costs
        published['primary_verdict']=verdict(results['primary'],results['cv'])
        published['validation_verdict']=verdict(results['validation'])
        published['texture_verdicts']={k:verdict(v) if 'MLP' in v else 'insufficient groups' for k,v in results['holdouts'].items() if k in ('paired','monotone')}
        published['verdict']=published['primary_verdict']
        if any(v in ('not sufficient','insufficient groups') for v in published['texture_verdicts'].values()):
            published['verdict']='not sufficient across held-out texture families'
    (out/'metrics.json').write_text(json.dumps(published,indent=2,allow_nan=False))
    report(args,out,published,a,curve)
    print(json.dumps({'status':published.get('status',published.get('verdict')),'costs':costs}),flush=True)

def verdict(values,cv=None):
    m=values['MLP']['reach_weighted']
    if any(m[k] is None for k in ('mean_regret_pct_pot','p95_regret_pct_pot','grade_agreement','false_costly_rate')):
        return 'not sufficient: missing grade observations'
    better=all(m['mean_regret_pct_pot']<values[k]['reach_weighted']['mean_regret_pct_pot'] and m['grade_agreement']>values[k]['reach_weighted']['grade_agreement'] and m['false_costly_rate']<=values[k]['reach_weighted']['false_costly_rate'] for k in ('B0_chart','B1_equity'))
    clear=False
    if cv is not None:
        from scipy.stats import t
        clear=True
        for baseline in ('B0_chart','B1_equity'):
            diffs=np.array([b['reach_weighted']['mean_regret_pct_pot']-n['reach_weighted']['mean_regret_pct_pot'] for b,n in zip(cv[baseline]['fold_results'],cv['MLP']['fold_results'])])
            lower=diffs.mean()-t.ppf(.975,len(diffs)-1)*diffs.std(ddof=1)/np.sqrt(len(diffs))
            clear=clear and bool(lower>0)
    if better and m['mean_regret_pct_pot']<=.3 and m['p95_regret_pct_pot']<=1 and m['false_costly_rate']<=.02 and m['grade_agreement']>=.9:
        return 'strong' if clear else 'strong point thresholds only; clear baseline margin unestablished'
    if better and m['mean_regret_pct_pot']<=1 and m['false_costly_rate']<=.05 and m['grade_agreement']>=.8: return 'usable only with estimate label'
    return 'not sufficient'

def report(args,out,values,a,curve):
    costs=values['costs']
    text='# Experiment report\n\n'
    if a['synthetic']:
        text+='Verdict: **inconclusive — no accessible real solved data**. This is a pipeline smoke run, not evidence of model accuracy. The uploaded flipup-flop-library.zip exceeds the attachment tool\'s 32 MiB transfer limit. No hosted service, production solver, Fly machine or external API was accessed.\n\n'
        text+=f'The run used {a["retained_files"]} solver-generated fixtures ({a["distinct_boards"]} boards), with appendix-B invented ranges in btn_bb only. All six production range/spot combinations and the claimed ~240-board overlap remain unverified. Files with exploitability >0.5% were dropped as recorded in data_audit.md.\n\n'
        text+='MLP training, both baselines, all five learning-curve fractions, grouped five-fold CV and the paired/monotone holdout paths executed. Leave-one-spot-out requires multiple real spots and did not run. Accuracy, grade agreement, false-Costly, missed-Costly, regret, and accuracy confidence intervals are deliberately withheld: fixture scores cannot answer the question. No learning-curve conclusion about data sufficiency is possible. No success bar has been established.\n\n'
    else:
        text+=f'Verdict: **{values["verdict"]}**. Data: {a["retained_files"]} retained files, {a["distinct_boards"]} distinct boards. See metrics.json for full weighted/unweighted subgroup results and CV intervals.\n\n'
        text+='| Model | Mean regret % pot | P95 regret % pot | Grade agreement | False-Costly |\n|---|---:|---:|---:|---:|\n'
        for k,v in values['primary'].items():
            m=v['reach_weighted']; text+=f'| {k} | {m["mean_regret_pct_pot"]:.4f} | {m["p95_regret_pct_pot"]:.4f} | {m["grade_agreement"]:.4f} | {m["false_costly_rate"]:.4f} |\n'
        text+='\nTexture-family results must also meet the stated product bars; passing the random board split alone does not establish reliability.\n\n'
        text+=f'Validation verdict: {values["validation_verdict"]}. Primary test verdict: {values["primary_verdict"]}. Texture-family verdicts: {json.dumps(values["texture_verdicts"])}. A validation pass followed by a family failure is insufficient for general use.\n\n'
        text+='Learning-curve held-out scores:\n\n| Fraction | Centred MAE bb | Mean regret % pot | Grade agreement | False-Costly |\n|---|---:|---:|---:|---:|\n'
        for r in curve:
            text+=f'| {r["fraction"]:.0%} | {r["centred_mae_bb"]:.4f} | {r["mean_regret_pct_pot"]:.4f} | {r["grade_agreement"]:.4f} | {r["false_costly_rate"]:.4f} |\n'
        delta=curve[0]['mean_regret_pct_pot']-curve[-1]['mean_regret_pct_pot']
        text+=f'\nThe change in mean regret between the smallest and full training sets is {delta:.4f} percentage points of pot. This small-sample curve does not identify an exact number of additional boards needed; collect more independent rank triples and repeat this fixed evaluation.\n\n'
    text+='Inputs and target limits: heads-up flop decisions only, fixed stored tree through three actions, no rake, 100bb initial effective stacks (97.5bb flop-start stack in fixtures), float16 target storage; flop bets 33/75/125%, raises 60%, one 75% turn bet, river checked down. These are explorer-tree values, not full-game GTO values. Root equity uses deterministic 1,024-sample Monte Carlo against the fixed root range, identically at training and inference; it is an approximate feature, not a solver result. No deeper reach is a feature. Range consistency compares shared unblocked combos across boards.\n\n'
    text+='Engineering choices: one fixed 128×128×128 MLP, no hyperparameter search, validation-only early stopping. Loss combines raw and per-hand centred EVs (scaled by node pot) with masked strategy cross-entropy. Both use actor reach times exact canonical-board frequency. Each row has the actor\'s root range weight as a feature. B0 uses reach-weighted means by spot/node/hand class; B1 uses reach-weighted linear ridge regressions by spot/node/action on root equity and simple hand features. Missing chart cells fall back to training-only legal-mask averages; B1 falls back to training-only global action regressions.\n\n'
    text+='Splits: 70/15/15 rank triples, stratified approximately by combined pairedness/suit textures; all suit cousins and spots share one assignment. Five-fold grouped CV uses development groups only, preserving the primary test. Texture holdouts remove every rank triple that has any board in that family. LOSO (when available) is exploratory transfer across ranges and permits shared boards, unlike the unseen-board experiments. No tuning uses any test result.\n\n'
    text+='Metrics: centred EV error is averaged over legal actions; selected-action regret uses the true solver EV. Grades call the existing review.grade() for every legal action with actor reach ≥0.01. Confusion rows are truth, columns prediction, ordered Good/Close call/Costly. False-Costly is P(predicted Costly | truth Good); missed-Costly is P(predicted not Costly | truth Costly). Reported CV intervals are Student-t intervals across five fold metrics, descriptive because folds overlap in training. Board frequencies multiply reach; unweighted metrics give each row/action equal weight.\n\n'
    text+='Learning-curve execution:\n\n| Fraction | Training rank triples | Training boards | Training wall seconds |\n|---|---:|---:|---:|\n'
    for r in curve: text+=f'| {r["fraction"]:.0%} | {r["training_rank_triples"]} | {r["training_boards"]} | {r["wall_seconds"]:.2f} |\n'
    text+=f'\nTraining cost: {costs["training_wall_seconds"]:.2f} wall seconds, {costs["training_process_cpu_seconds"]/3600:.4f} process CPU hours, {costs["training_runs"]} fits. Model: {costs["parameters"]:,} parameters; {costs["checkpoint_bytes"]:,} bytes. Network-only whole-node prediction: {costs["network_only_ms_per_node"]:.3f} ms ({costs["whole_node_hands"]} hands); full interface: {costs["whole_node_inference_first_ms"]:.3f} ms with equity cache cleared and {costs["whole_node_inference_warm_ms"]:.3f} ms warm call.\n\n'
    text+=f'Total pipeline cost (audit, features, baseline fits, evaluation, training, timing): {costs["pipeline_wall_seconds"]:.2f} wall seconds and {costs["pipeline_process_cpu_seconds"]/3600:.4f} process CPU hours. Local fixture solve wall times are recorded separately in local_solves.json; package installation and compilation are outside these timers.\n\n'
    text+='Next step: provide independently compressed ZIP parts smaller than 32 MiB each (each retaining spot/flop.npz paths), or put the solved files directly in ml/data/flops. Run the exact real-data command in README. Only real board-held-out scores can support a verdict or determine whether finishing the library helps. Wider stack depths, turn/river decisions and rake need new data and separate validation. The saved fixture checkpoint carries synthetic_fixture_only evidence and must not be used for coaching.\n'
    (out/'report.md').write_text(text)

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--data',default='ml/data/flops'); ap.add_argument('--out',default='ml/out'); ap.add_argument('--epochs',type=int,default=40); ap.add_argument('--equity-samples',type=int,default=1024)
    run(ap.parse_args())
