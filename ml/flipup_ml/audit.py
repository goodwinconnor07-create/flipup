"""Audit every input, including rejected files; no estimates replace missing data."""
import json
from collections import Counter
from pathlib import Path
import numpy as np
from .data import load_entries, read_entry, domain
from . import SPOTS

def distribution(values):
    if not values: return None
    return dict(zip(['min','p25','median','p75','max'],map(float,np.quantile(values,[0,.25,.5,.75,1]))))

def audit(root,out):
    entries,unreadable,dropped=load_entries(root)
    readable=entries+[read_entry(p) for p in dropped]
    board_sets={s:{e.path.stem for e in readable if e.spot==s} for s in SPOTS}
    spots={}
    for s in SPOTS:
        es=[e for e in readable if e.spot==s]
        if not es: spots[s]={'files':0}; continue
        combos={p:{} for p in (0,1)}; mismatches=[]; overlaps=Counter()
        for e in es:
            for p in (0,1):
                for c in e.arrays[f'combos{p}']:
                    v=float(e.roots[p][c]); c=int(c)
                    if c in combos[p]:
                        overlaps[p]+=1
                        if abs(combos[p][c]-v)>max(.001,abs(v)*.002): mismatches.append([str(e.path),p,c])
                    else: combos[p][c]=v
        for e in es:
            from flipup_gto.cards import combo_cards
            for p in (0,1):
                present=set(map(int,e.arrays[f'combos{p}']))
                for c,v in combos[p].items():
                    if v>0 and c not in present and not set(combo_cards(c))&set(e.board):
                        mismatches.append([str(e.path),p,c,'unblocked range member missing'])
        spots[s]={'files':len(es),'pots':sorted({e.meta['pot'] for e in es}),'stacks':sorted({e.meta['stack'] for e in es}), 'root_range_mismatches':mismatches,'shared_combo_comparisons':dict(overlaps), 'combo_count_distribution':{p:distribution([len(e.arrays[f'combos{p}']) for e in es]) for p in (0,1)},'note':'Board blockers change combo arrays: compare root weights on overlapping unblocked combos, not raw array equality.'}
    zero_sums=[]; folds=[]; strategy_errors=[]
    for e in readable:
        if 'realization' in e.arrays:
            r=e.arrays['realization']
            sums=[float(r[p,0].sum()/r[p,2].sum()*e.meta['pot']) for p in (0,1)]
            zero_sums.append({'file':str(e.path),'sum_bb':sum(sums),'pot_bb':e.meta['pot'],'error_bb':sum(sums)-e.meta['pot']})
        for k,n in e.meta['nodes'].items():
            strategy_errors.append(float(np.abs(e.arrays['s:'+k].astype(float).sum(0)-1).max()))
            for i,a in enumerate(n['actions']):
                if a['type']=='fold': folds.extend(e.arrays['e:'+k][i].tolist())
    result={'source':str(root),'synthetic':bool(readable) and all(e.meta.get('synthetic',False) for e in readable),'files_per_spot':{s:len(v) for s,v in ((s,[e for e in readable if e.spot==s]) for s in SPOTS)},'unreadable':unreadable,'dropped_exploitability_gt_0_5':dropped,'retained_files':len(entries),'spots':spots,'distinct_boards':len(set.union(*board_sets.values())),'intersection_all_six_spots':len(set.intersection(*board_sets.values())),'pairwise_intersections':{a+'/'+b:len(board_sets[a]&board_sets[b]) for i,a in enumerate(SPOTS) for b in SPOTS[i+1:]},'exploitability_pct':distribution([e.meta['exploitability_pct'] for e in readable]),'iterations':distribution([e.meta['iterations'] for e in readable]),'node_counts':dict(Counter(len(e.meta['nodes']) for e in readable)),'max_action_count':max((len(n['actions']) for e in readable for n in e.meta['nodes'].values()),default=0),'max_strategy_sum_error':max(strategy_errors,default=None),'root_range_ev_sums':zero_sums,'fold_ev_distribution_bb':distribution(folds)}
    out=Path(out); out.mkdir(parents=True,exist_ok=True)
    (out/'audit.json').write_text(json.dumps(result,indent=2))
    (out/'data_audit.md').write_text('# Data audit\n\n'+('Synthetic fixtures only. The attached ZIP could not be transferred (32 MiB tool limit). These are invented ranges, not the six production spots.\n\n' if result['synthetic'] else '')+'All input NPZ files were opened with allow_pickle=False. Files above 0.5% exploitability are excluded. Unreadable files are listed, never treated as zero-error examples.\n\nThe six unresolved questions are answered by distinct_boards and intersection_all_six_spots (1), spots/root_range_mismatches (2), root_range_ev_sums and fold_ev_distribution_bb (3), node_counts and max_action_count (4), unreadable and dropped_exploitability_gt_0_5 (5), and spots/pots and stacks (6). Fixture answers do not resolve these questions for the inaccessible real library.\n\nRoot ranges are reconstructed at the first node for each actor before that actor has acted. Opponent actions cannot alter that actor\'s own reach. Blocked combos are excluded from cross-board comparisons. Root zero-sum uses compatible-opponent-weighted realization summaries, not an unweighted average of hand EVs.\n\nEV offset: solver.cpp normalizes cfv / compatible opponent mass + current-node contribution. At a fold, cfv includes the negative prior contribution, cancelling to zero. Thus action values exclude already-invested chips at the current node; root range values sum to the starting pot. All evaluation centres EV per hand regardless.\n\n```json\n'+json.dumps(result,indent=2)+'\n```\n')
    return entries,result
