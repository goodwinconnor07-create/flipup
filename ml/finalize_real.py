"""Publish verified real artifacts; preserve fixture provenance and family semantics."""
import csv
import json
from pathlib import Path
import shutil
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from flipup_ml import ROOT
from flipup_ml.run import verdict
from flipup_ml.real_report import report

def main():
    out=ROOT/'ml/out/real'; results=json.loads((out/'metrics.json').read_text())
    assert not results['synthetic']
    audit=json.loads((out/'audit.json').read_text())
    # Pre-recorded reporting correction, not a choice based on observed scores.
    if 'texture_group_verdicts' not in results:
        results['texture_group_verdicts']=dict(results['texture_verdicts'])
        mono=results['holdouts']['monotone']
        only={name:mono[name]['by']['texture']['unpaired:monotone'] for name in ('MLP','B0_chart','B1_equity')}
        results['holdouts']['monotone_only_within_group_holdout']=only
        results['texture_verdicts']['monotone']=verdict(only)
    results['verdict']=results['primary_verdict']
    statuses=[*results['texture_verdicts'].values(),*results['texture_group_verdicts'].values()]
    if any(v.startswith('not sufficient') or v=='insufficient groups' for v in statuses):
        results['verdict']='not sufficient across held-out texture families'
    results['evaluation_addendum']=json.loads((out/'evaluation_addendum.json').read_text())
    (out/'metrics.json').write_text(json.dumps(results,indent=2,allow_nan=False))
    with (out/'learning_curve.csv').open() as f: raw=list(csv.DictReader(f))
    curve=[]
    for r in raw:
        item={}
        for key,value in r.items():
            if value in ('','None'): item[key]=None
            else:
                try: item[key]=float(value)
                except ValueError: item[key]=value
        for key in ('training_rank_triples','training_boards','training_sampled_rows','training_files','training_population_rows'): item[key]=int(item[key])
        curve.append(item)
    runs=[json.loads(p.read_text()) for p in sorted((out/'runs').glob('*.json'))]
    report(out,results,audit,curve,runs)
    m=results['primary']['MLP']['reach_weighted']
    b=results['primary']['B1_equity']['reach_weighted']
    paired=results['holdouts']['paired']['MLP']['reach_weighted']
    mono=results['holdouts']['monotone_only_within_group_holdout']['MLP']['reach_weighted']
    explanation=(
        f'The network learned useful signal: mean regret is {m["mean_regret_pct_pot"]:.3f}% of pot, versus {b["mean_regret_pct_pot"]:.3f}% for B1. '
        f'However, grade agreement is only {100*m["grade_agreement"]:.2f}% and {100*m["false_costly_rate"]:.2f}% of solver-Good actions are labelled Costly. '
        'Those fail the estimate-only bars of at least 80% agreement and at most 5% false-Costly. Low average decision regret does not make the coaching labels safe to use.\n\n'
        f'With the entire paired family withheld, false-Costly rises to {100*paired["false_costly_rate"]:.2f}%; '
        f'on actual monotone boards in their family holdout it is {100*mono["false_costly_rate"]:.2f}%. '
        'These are deliberate unseen-family stress tests, separate from ordinary primary held-out boards.\n\n'
        f'Increasing from {curve[0]["training_rank_triples"]} to {curve[-1]["training_rank_triples"]} training rank triples reduced mean regret from '
        f'{curve[0]["mean_regret_pct_pot"]:.3f}% to {curve[-1]["mean_regret_pct_pot"]:.3f}% and false-Costly from '
        f'{100*curve[0]["false_costly_rate"]:.2f}% to {100*curve[-1]["false_costly_rate"]:.2f}%. '
        'More board coverage helped this recipe, but the curve cannot prove how much additional data would meet the grading bars. '
        'The main fits reached their 20-epoch cap, and only 64 positive-reach hands per node were sampled for fitting. '
        'A cheaper next experiment is to test larger fitting-row and optimization budgets using development groups only, before paying to expand the solved library. '
        'Use new confirmation boards for any later final claim.\n\n'
    )
    p=out/'report.md'; text=p.read_text(); marker='All seven ZIP SHA-256 hashes'
    text=text.replace(marker,explanation+marker,1); p.write_text(text)
    with (out/'report.md').open('a') as f:
        f.write('\nMonotone-family reporting: the table includes the complete held-out rank groups and a separate monotone-only subgroup. Both are checked for the final verdict, following evaluation_addendum.json recorded before viewing held-out scores. No model, threshold, split, or hyperparameter was changed.\n')
    history=ROOT/'ml/out/fixture-history'; history.mkdir(exist_ok=True)
    names=['audit.json','data_audit.md','metrics.json','report.md','learning_curve.csv','model.pt','training.json','splits.json','validation.json','inference-smoke.json','installed-packages.txt','tests.log','app-check.log','pipeline.log']
    for name in names:
        old=ROOT/'ml/out'/name; src=out/name
        if old.exists() and not (history/name).exists(): shutil.copy2(old,history/name)
        if src.exists(): shutil.copy2(src,old)
    print('Real artifact copies refreshed; fixture history preserved')

if __name__=='__main__': main()
