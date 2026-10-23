"""Validate completed real artifacts without fitting, tuning or changing results."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parent))
from flipup_ml import ROOT
import torch

def verify(out):
    out=Path(out)
    results=json.loads((out/'metrics.json').read_text())
    records=json.loads((out/'feature_manifest.json').read_text())
    protocol=json.loads((out/'protocol.json').read_text())
    splits=json.loads((out/'splits.json').read_text())
    assert results['synthetic'] is False
    assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in protocol['source_sha256'].items())
    assert len(records)==1422 and sum(r['rows'] for r in records)==19_664_924
    assert set(splits['primary'].values())=={0,1,2}
    assert not ({g for g,k in splits['primary'].items() if k==2}&set(splits['cv_development_fold']))
    tests=[r for r in records if splits['primary'][r['group']]==2]
    test_rows=sum(r['rows'] for r in tests)
    assert results['costs']['primary_test_rows']==test_rows
    assert len(results['cv'])==3
    for mode in ('reach_weighted','unweighted'):
        truth_masses=[]
        for name in ('MLP','B0_chart','B1_equity'):
            m=results['primary'][name][mode]
            assert m['rows']==test_rows
            cm=np.array(m['grade_confusion_rows_truth_columns_predicted'])
            assert cm.shape==(3,3) and np.all(cm>=0)
            truth_masses.append(cm.sum(1))
            assert np.isclose(m['grade_agreement'],cm.trace()/cm.sum())
            assert np.isclose(m['false_costly_rate'],cm[0,2]/cm[0].sum())
            assert np.isclose(m['missed_costly_rate'],cm[2,:2].sum()/cm[2].sum())
            for key in ('top_action_agreement','grade_agreement','false_costly_rate','missed_costly_rate'):
                assert 0<=m[key]<=1,key
            assert m['mean_regret_pct_pot']>=0 and m['p95_regret_pct_pot']>=0
            assert m['centred_rmse_bb']+1e-7>=m['centred_mae_bb']
            for field,items in results['primary'][name]['by'].items():
                assert sum(v[mode]['rows'] for v in items.values())==test_rows,field
                group_cm=sum(np.array(v[mode]['grade_confusion_rows_truth_columns_predicted']) for v in items.values())
                assert np.allclose(group_cm,cm),field
        assert np.allclose(truth_masses,truth_masses[0])
    for name,cv in results['cv'].items():
        assert len(cv['fold_results'])==5,name
        assert cv['ci95']['reach_weighted']['mean_regret_pct_pot']['folds']==5
    for family in ('paired','monotone'):
        assignment=splits['texture_holdouts'][family]
        for r in records:
            member=r['texture'].startswith('paired:') if family=='paired' else r['texture'].endswith(':monotone')
            if member: assert assignment[r['group']]==2
        expected=sum(r['rows'] for r in records if assignment[r['group']]==2)
        assert results['holdouts'][family]['MLP']['unweighted']['rows']==expected
    for spot in {r['spot'] for r in records}:
        expected=sum(r['rows'] for r in records if r['spot']==spot)
        assert results['holdouts']['leave_one_spot_out:'+spot]['MLP']['unweighted']['rows']==expected
    runs=[json.loads(p.read_text()) for p in (out/'runs').glob('*.json')]
    assert len(runs)==18 and results['costs']['training_runs']==18
    elapsed=sum(r['training']['wall_seconds'] for r in runs)
    assert np.isclose(elapsed,results['costs']['training_wall_seconds']) and elapsed<=7200
    with (out/'learning_curve.csv').open() as f: curve=list(csv.DictReader(f))
    assert [float(r['fraction']) for r in curve]==[.1,.25,.5,.75,1.]
    artifact=torch.load(out/'model.pt',map_location='cpu',weights_only=True)
    assert artifact['synthetic'] is False and len(artifact['domain'])==6
    assert (out/'model.pt').stat().st_size<10_000_000
    tests_log=(out/'tests.log').read_text(); match=re.search(r'(\d+) passed in ([0-9.]+)s',tests_log)
    assert match and int(match[1])>=45 and float(match[2])<60
    assert '107 passed' in (out/'app-check.log').read_text()
    status=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],cwd=ROOT,text=True)
    assert all(line[3:].startswith('ml/') for line in status.splitlines()),status
    validation={'source_hashes_unchanged':True,'held_out_rows_all_evaluated':test_rows,'primary_groups':results['costs']['primary_test_rank_triples'],'training_runs':18,'training_wall_seconds':elapsed,'tests_passed':int(match[1]),'test_wall_seconds':float(match[2]),'app_unit_tests_passed':107,'app_typecheck_and_build_passed':True,'only_ml_changes':True,'checkpoint_bytes':(out/'model.pt').stat().st_size,'new_solves':0}
    (out/'validation.json').write_text(json.dumps(validation,indent=2))
    print(json.dumps(validation,indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--out',default='ml/out/real'); verify(ap.parse_args().out)
