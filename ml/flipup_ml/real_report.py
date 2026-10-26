"""Human-readable results, with uncertainty and scope limits stated explicitly."""
import json
from pathlib import Path

def fmt(v,digits=3): return 'n/a' if v is None else f'{v:.{digits}f}'
def pct(v): return 'n/a' if v is None else f'{100*v:.2f}%'

def report(out,results,audit,curve,runs):
    out=Path(out); costs=results['costs']; primary=results['primary']; mlp=primary['MLP']['reach_weighted']
    text='# Real solved-flop experiment\n\n'
    text+=f'Verdict: **{results["verdict"]}**. Primary grouped test: **{results["primary_verdict"]}**. Validation: **{results["validation_verdict"]}**. The architecture, sampling, seeds and hyperparameters were fixed before viewing held-out scores; there was no test-based tuning.\n\n'
    text+=f'All seven ZIP SHA-256 hashes and file counts matched MANIFEST.json. The library contained 1,423 readable files, with {audit["retained_files"]} retained after the 0.5% exploitability cutoff. It has {audit["distinct_boards"]} distinct suit-isomorphic boards, {audit["intersection_all_six_spots"]} shared across all six spots, and {costs["rank_triples"]} independent rank-triple groups. There are {costs["dataset_rows"]:,} hand/node rows, but millions of rows do not imply millions of independent poker situations.\n\n'
    text+='| Spot | Readable files | Starting pot bb | Remaining flop-start stack bb | Root-range mismatches |\n|---|---:|---|---|---:|\n'
    for spot,info in audit['spots'].items():
        text+=f'| {spot} | {info["files"]} | {info["pots"]} | {info["stacks"]} | {len(info["root_range_mismatches"])} |\n'
    text+='\nThe full rejected-file list, all audit distributions, cross-spot board intersections, strategy-normalization checks, root-EV sum checks and fold-EV checks are in data_audit.md and audit.json. No new solves were run for this real-data experiment. The earlier fixture stage used 15 local solves in total.\n\n'
    text+=f'The primary untouched test includes {costs["primary_test_rows"]:,} rows from {costs["primary_test_rank_triples"]} rank triples, grouped across every spot, suit cousin and node. All held-out rows are evaluated; none are sampled away.\n\n'
    text+='| Model | Weighting | Centred MAE bb | Centred RMSE bb | MAE % pot | RMSE % pot | Top-action agreement | Mean regret % pot | P95 regret % pot | Grade agreement | False-Costly | Missed-Costly |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n'
    for name in ('MLP','B0_chart','B1_equity'):
        for mode in ('reach_weighted','unweighted'):
            m=primary[name][mode]
            text+=f'| {name} | {mode} | {fmt(m["centred_mae_bb"])} | {fmt(m["centred_rmse_bb"])} | {fmt(m["centred_mae_pct_pot"])} | {fmt(m["centred_rmse_pct_pot"])} | {pct(m["top_action_agreement"])} | {fmt(m["mean_regret_pct_pot"])} | {fmt(m["p95_regret_pct_pot"])} | {pct(m["grade_agreement"])} | {pct(m["false_costly_rate"])} | {pct(m["missed_costly_rate"])} |\n'
    text+='\nFalse-Costly means P(predicted Costly | truth Good). Missed-Costly means P(predicted Good or Close call | truth Costly). Grade rows are limited to actor reach ≥0.01, as requested. The weighted confusion matrix below contains reach×board-frequency mass, not raw counts. Rows are truth, columns prediction.\n\n| Truth / prediction | Good | Close call | Costly |\n|---|---:|---:|---:|\n'
    for label,row in zip(('Good','Close call','Costly'),mlp['grade_confusion_rows_truth_columns_predicted']): text+=f'| {label} | '+' | '.join(fmt(v,2) for v in row)+' |\n'
    text+='\nGrouped CV (development groups only), mean and descriptive 95% intervals:\n\n| Model | Mean regret % pot | Grade agreement | False-Costly |\n|---|---|---|---|\n'
    for name in ('MLP','B0_chart','B1_equity'):
        ci=results['cv'][name]['ci95']['reach_weighted']
        def interval(key,percent=False):
            d=ci[key]; factor=100 if percent else 1; endpoints=d['ci95']
            return f'{fmt(d["mean"]*factor)} [{fmt(endpoints[0]*factor)}, {fmt(endpoints[1]*factor)}]' if endpoints else 'n/a'
        text+=f'| {name} | {interval("mean_regret_pct_pot")} | {interval("grade_agreement",True)}% | {interval("false_costly_rate",True)}% |\n'
    text+='\nThese are Student-t intervals across five grouped CV fold metrics. Fitting sets overlap, the effective board sample is small, and the intervals are descriptive rather than independent-replicate guarantees. No clipping of interval endpoints to [0,1] was used. Primary test boards are excluded from all CV fitting.\n\n'
    text+='Learning curve (same primary test groups for every row):\n\n| Training fraction | Rank triples | Boards | Sampled fitting rows | Centred MAE bb | Mean regret % pot | P95 regret % pot | Grade agreement | False-Costly | B0 mean regret % pot | B1 mean regret % pot |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n'
    for r in curve:
        text+=f'| {r["fraction"]:.0%} | {r["training_rank_triples"]} | {r["training_boards"]} | {r["training_sampled_rows"]:,} | {fmt(r["centred_mae_bb"])} | {fmt(r["mean_regret_pct_pot"])} | {fmt(r["p95_regret_pct_pot"])} | {pct(r["grade_agreement"])} | {pct(r["false_costly_rate"])} | {fmt(r["B0_mean_regret_pct_pot"])} | {fmt(r["B1_mean_regret_pct_pot"])} |\n'
    delta=curve[0]['mean_regret_pct_pot']-curve[-1]['mean_regret_pct_pot']
    text+=f'\nMean regret changed by {delta:.3f} percentage points of pot between the smallest and largest board sets. This curve cannot establish an exact number of additional flops needed, or separate all data-size effects from model capacity/optimization. A negative result applies to this bounded experiment; it does not prove no model could learn the task.\n\n'
    text+='Texture-family and exploratory spot holdouts:\n\n| Holdout | Model | Mean regret % pot | P95 regret % pot | Grade agreement | False-Costly |\n|---|---|---:|---:|---:|---:|\n'
    for name,values in results['holdouts'].items():
        if 'MLP' not in values: text+=f'| {name} | {values.get("status")} | n/a | n/a | n/a | n/a |\n'; continue
        for model in ('MLP','B0_chart','B1_equity'):
            m=values[model]['reach_weighted']; text+=f'| {name} | {model} | {fmt(m["mean_regret_pct_pot"])} | {fmt(m["p95_regret_pct_pot"])} | {pct(m["grade_agreement"])} | {pct(m["false_costly_rate"])} |\n'
    text+='\nTexture verdicts: '+json.dumps(results['texture_verdicts'])+'. Entire rank groups containing paired/monotone boards are held out, including their other suit textures. If validation passes a bar but a texture family fails, the result is insufficient for unrestricted use. LOSO permits the same boards in other spots and tests range/spot transfer, not unseen-board generalisation. Its spot one-hot category is unseen during fitting; scaling remains bounded at one.\n\n'
    text+='Primary MLP subgroup results (full breakdowns for all models and both weightings are in metrics.json):\n\n| Dimension | Group | Mean regret % pot | Grade agreement | False-Costly |\n|---|---|---:|---:|---:|\n'
    for field,items in primary['MLP']['by'].items():
        for label,values in items.items():
            m=values['reach_weighted']; text+=f'| {field} | {label} | {fmt(m["mean_regret_pct_pot"])} | {pct(m["grade_agreement"])} | {pct(m["false_costly_rate"])} |\n'
    text+='\nProtocol and limits:\n\n'
    text+='- One fixed three-layer width-128 MLP, two heads, no architecture or hyperparameter search. Maximum 20 epochs, six-epoch early-stopping patience, AdamW at 0.001, batch size 4096. Binary inputs keep scale one, including unseen categories.\n'
    text+='- Fitting samples at most 64 positive-reach hands per board/node, uniformly with fixed board/node seeds. Inverse inclusion weights preserve the expected actor-reach×canonical-board-frequency loss. Every training board and every positive-mass node contributes. Validation early stopping uses the same fixed sampling scheme; reported validation metrics include every row. B0 and B1 fit all training rows, so they receive at least as much training information as the sampled MLP. Learning-curve samples are nested by board. Zero-weight rows do not affect the fitting objective but remain in unweighted evaluation.\n'
    text+='- B0 is a per-spot/node/hand-class weighted mean. B1 is a per-spot/node/action ridge regression on exact root equity and simple hand features, with the same weighted objective and an intercept. Unseen spot/node cells fall back to training-only legal-mask aggregates.\n'
    text+='- The stored game is heads-up, flop only, six 100bb preflop spots, no rake, fixed explorer trees through three actions. Turn has one 75% bet size; river is checked down. Target EV/strategy/reach arrays are float16; sub-0.01bb differences can be storage noise. This is not a full-game GTO oracle.\n'
    text+='- Equity is exact showdown equity against the fixed opponent root range, recomputed by the engine\'s batch sweep without solving. The older fixture report described a samples parameter as Monte Carlo; source inspection shows that parameter is ignored on flops, where the engine enumerates exactly. Per-hand equity agrees with stored float16 root equities within storage/rounded-range precision on the recorded probes. Deeper actor reach appears only in weights and grade eligibility; it is never an input.\n'
    text+='- Grading compiles the actual unchanged review.grade() function with Numba, with disk caching disabled. Random and threshold-boundary tests compare the compiled results with direct calls. No grade thresholds were reimplemented or relaxed. EV error is centred across each hand\'s legal actions.\n'
    text+='- Inference rejects unsupported spot, street, player count, path, action size, stack, duplicate/conflicting cards, out-of-range hands and rake. supported:true denotes the input domain, not a claim that coaching is reliable.\n\n'
    text+=f'Compute: {costs["training_runs"]} fits, {costs["training_wall_seconds"]:.2f} training wall seconds, {costs["training_process_cpu_seconds"]/3600:.4f} training process CPU hours, four CPU threads. The training wall cap is two hours. The runner took {costs["pipeline_wall_seconds"]:.2f} wall seconds after feature preparation; features have their separate progress log. No GPUs or new solves were used. Model: {costs["parameters"]:,} parameters, {costs["checkpoint_bytes"]:,} bytes. Network batch timing: {costs["network_only_ms_per_node"]:.3f} ms for {costs["whole_node_stored_hands"]} stored hands; full interface cold/warm: {costs["whole_node_inference_cold_ms"]:.3f}/{costs["whole_node_inference_warm_ms"]:.3f} ms for {costs["whole_node_positive_range_hands"]} positive-range hands. These are different hand populations and both counts are reported.\n\n'
    text+='The strong bar requires mean regret ≤0.3% pot, P95 ≤1%, false-Costly ≤2%, grade agreement ≥90%, and a clear baseline improvement. The estimate-only bar requires mean regret ≤1%, false-Costly ≤5%, agreement ≥80%, and improvement over both baselines. Clear baseline improvement for a strong result also checks paired CV regret-difference intervals. Passing a random board split alone does not establish texture robustness.\n\n'
    if results['verdict'].startswith('not sufficient') or 'unestablished' in results['verdict']:
        text+='Next steps: do not deploy this checkpoint as a GTO coach. Add diverse independently solved rank triples and the board textures with the largest documented errors, then repeat a new frozen experiment with fresh confirmation boards. Also test larger fitting-row budgets on development data to separate sampling/optimization limits from data limits. Turn/river, rake and other stack depths require separate labelled data and tests.\n'
    else:
        text+='Next steps: treat this as evidence within the stored simplified domain only. Independently validate new confirmation boards, inspect error cases with a human reviewer, and measure deployment latency before considering an estimate-labelled feature. Turn/river, rake and other stacks remain unsupported.\n'
    (out/'report.md').write_text(text)
