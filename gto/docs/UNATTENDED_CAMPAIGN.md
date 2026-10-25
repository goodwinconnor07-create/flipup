# Unattended strategy + multiway + Scroll campaign

This supersedes the startup commands in NETWORK_PLAN.md for the expanded campaign. The older plan
remains background for value-network validation. Use this branch in a **new checkout/data folder**.

## What runs automatically

Both laptops run the same frozen source and campaign name. The faster laptop is `fast` (worker 1,
turns); the slower one is `slow` (worker 0, rivers). The default wall budget is **168 hours (7 days)**.
48 hours is supported, but cannot guarantee enough converged data or passing models.

1. First 25% of the wall budget: exact heads-up teachers, value labels AND strategy/action-EV labels.
2. A 100-case exact legal-joint-deal three-player audit, including folded-card removal.
3. Next 55%: repaired exact-joint three-player turn/river teachers, convergence, conservation and
   stability checks, and strategy labels. No sampled runouts or checked-down future streets.
4. Remaining budget: train heads-up value candidates plus heads-up and three-player strategy candidates
   for turn and river. Choose checkpoints on validation only, then run the held-out test once.
5. If all six model gates and the multiway audit pass, the fast laptop attempts **three-player whole
   Scroll hands** with exact full future-street teachers, then packs and uploads a separate draft bank.
   Failed/oversized/unconverged hands are rejected. The app's existing bank is never overwritten.
6. Final artifacts/status upload whether completed, blocked or failed. A quality failure blocks Scroll;
   the script does not lower thresholds or label network-only guesses as solved hands.

Backups run after every generation batch and every 15 minutes in a background thread. Objects are
immutable and checksum-verified. The laptops download each other's snapshots before training. This
is a backup/training exchange, **not** automatic activation of a candidate on the public coach.

## What changed in the models and engine

- The policy network scores each legal action, outputting a softmax strategy and per-action EV. It
  accepts variable menus (up to 16 actions), learns checks/calls/bets/raises/folds, and has NumPy-only
  inference in `flipup_gto.strategy`. It needs no solve for an individual supported inference request.
- Features include all players' strength-bucket ranges, per-card range marginals, canonical board and
  hero cards, actor, stacks, pot, price and active players. They contain more card-removal information
  than the old value model; range marginals remain a lossy approximation.
- A converged teacher exports up to six nodes on its current street, including both players/three
  players when reached. Hero combos are sampled from legal joint reach. Entire teacher games stay in
  one split; parent-flop/final-board overlap checks prevent train/test leakage.
- Three-player showdown and counterfactual masses now exclude card collisions **between every player**.
  A rank sweep and shared-card range totals replace the independent-opponents approximation. Folded
  ranges remain in later-street re-solves for card removal. Four-player exact inference is explicitly
  rejected; the legacy approximation requires an explicit opt-out and is not used by this campaign.
- Full future-street solving and finite node/memory limits are enforced for new teachers and Scroll.
  Budgets fail closed rather than substituting a smaller tree.

The strategy models currently train on **turn and river**. Heads-up flop answers still come from your
library or a solver. A three-player flop strategy/value model and public coach inference routing are
not delivered by this run; Scroll's flop answers use exact teachers. All models remain candidates.

## Before you start: deploy the upload routes once

The existing coach has no `/admin/network` routes until this code is deployed. The startup probe
checks this and fails before generation if deployment/authentication is missing. We cannot deploy to
Fly from this workspace because no Fly account credentials are configured here.

On a computer where the Fly CLI is installed and authenticated:

```bash
git clone --branch codex/two-day-strategy-pipeline --single-branch \
  https://github.com/goodwinconnor07-create/flipup.git "$HOME/flipup-campaign"
cd "$HOME/flipup-campaign/gto"
fly auth login
fly volumes list -a flipup-gto
```

Ensure the persistent `gto_cache` volume has room for flop files **plus** campaign backups. The upload
server defaults to a **10 GiB artifact quota** and reserves 512 MiB free disk. If needed, enlarge the
correct volume to 20GB (replace the volume id from the list; this incurs Fly's storage charge):

```bash
fly volumes extend YOUR_GTO_CACHE_VOLUME_ID --size 20 -a flipup-gto
fly deploy -a flipup-gto
```

Keep the existing `FLIPUP_UPLOAD_TOKEN` secret. If you no longer know its value, set a new one with
Fly and use it on both laptops; this also changes what the old flop uploader needs. Do not place it
in Git or command-line arguments. The configure command below asks for it privately.

The new routes store opaque files under `/app/flipup_gto/data/cache/network`. They do not parse uploaded
NPZ files, execute models, replace flops, modify app assets or expose public downloads. Every request
needs the admin token. Each object is capped at 64 MiB. If quota/disk fills, uploads fail and local
artifacts remain. After an extended upload failure, the main campaign stops at the next batch rather
than generating indefinitely without a working backup. No automatic volume expansion or remote
artifact deletion is performed.

If Fly CLI is not installed, install it from Fly's official instructions first:
https://fly.io/docs/flyctl/install/ . This is a one-time deployment, not a job running on Fly CPUs.

## Both Ubuntu laptops: setup and credentials

Use Ubuntu 22.04/24.04, preferably at least 8GB RAM and 20GB local free disk. Keep laptops plugged in,
lids open, and disable automatic suspend in Ubuntu Settings -> Power. tmux survives terminal closure,
not sleep or reboot. If running existing heavy flop services, stop them without deleting their files:

```bash
sudo systemctl stop flipup-solve flipup-upload
```

Omit that line when those services are not installed. Then, on **each laptop**:

```bash
sudo apt-get update
sudo apt-get install -y git

git clone --branch codex/two-day-strategy-pipeline --single-branch \
  https://github.com/goodwinconnor07-create/flipup.git "$HOME/flipup-campaign"
cd "$HOME/flipup-campaign"
bash gto/scripts/network_campaign.sh setup
bash gto/scripts/network_campaign.sh configure
```

Setup builds the engine and installs CPU PyTorch. Configure asks for the coach URL and existing
upload token, saved under `~/.config/flipup-network-campaign.env` with private permissions. Tokens
are not included in uploaded artifacts. Run setup/configure only once for this campaign.

## Start: same campaign name on both

On the **faster laptop**, with your completed flop library at `~/flops`:

```bash
cd "$HOME/flipup-campaign"
bash gto/scripts/network_campaign.sh start fast week1
```

If the library is elsewhere:

```bash
FLOPS_DIR="/your/flop/root" bash gto/scripts/network_campaign.sh start fast week1
```

On the **slower laptop**:

```bash
cd "$HOME/flipup-campaign"
bash gto/scripts/network_campaign.sh start slow week1
```

For a **48-hour** run, use the same override on both laptops instead of the commands above:

```bash
FU_CAMPAIGN_HOURS=48 bash gto/scripts/network_campaign.sh start fast two-days1
# On the other laptop:
FU_CAMPAIGN_HOURS=48 bash gto/scripts/network_campaign.sh start slow two-days1
```

Default CPU use is two OpenMP threads and a 2048MB engine-storage cap per laptop. This is not a whole
process memory limit: tree metadata, Python and model training also consume RAM. Increase threads
only after measuring thermals and leave CPU/memory headroom. `FU_NET_THREADS` and `FU_NET_MEMORY_MB`
set those limits at start. Do not change source/library/config while running; use a new campaign name
for changes. Do not merge the two worker folders manually.

## Status, stop, resume

```bash
cd "$HOME/flipup-campaign"
bash gto/scripts/network_campaign.sh status
tail -n 20 "$HOME/flipup-campaigns/week1/fast.log"   # slow.log on the other laptop
cat "$HOME/flipup-campaigns/week1/worker1/campaign.json"   # worker0 on slow
```

Stop with `bash gto/scripts/network_campaign.sh stop fast` (or `stop slow`). Repeat the **same start
command/settings** to resume. The deadline is persistent: restarting does not reset another seven
days. Completed samples are skipped, incomplete atomic writes are discarded, and immutable job
manifests prevent mixing teacher versions. An expired/failed gate is recorded with a reason.

Local artifacts are under `~/flipup-campaigns/NAME/worker0` or `worker1`; downloaded peer data is under
`peer1` or `peer0`. Candidate models are in `models/`, quality gates in `quality-gates.json`, and draft
Scroll files in `scroll/` on the fast laptop. Neither old Scroll files nor `~/flops` are overwritten.

To restore a worker snapshot to a **new** local directory:

```bash
cd "$HOME/flipup-campaign"
source "$HOME/.config/flipup-network-campaign.env"
"$HOME/flipup-net-env/bin/python" gto/scripts/campaign_sync.py pull \
  --run week1-worker1 --root "$HOME/restored-week1-worker1"
```

## Gates and practical limits

- Every HU teacher must reach .2% pot exact-tree gap. Three-player teachers additionally require
  <=.2% measured unilateral deviation gain, root-value change <=.2% pot between checks and expected
  payoff conservation within .1% pot. These do **not** prove general multiplayer Nash convergence.
- Policies require at least 100 training games and 20 validation/test games with 20 distinct held-out
  parent flop groups each. Test local expected action loss mean <=.5% pot, p95 <=2%, mean strategy
  total variation <=10%, mean per-action EV error <=3% pot. This is teacher-continuation validation,
  not full-policy exploitability. Models are not automatically promoted to the live coach.
- HU values require >=20 test samples, mean error <=1% pot, p95 <=3%. Validation selects checkpoints;
  test does not. A new final independent audit is still needed before production routing.
- The exact three-player checkdown oracle now passes, including folded-player blockers. Betting
  payoff conservation and HU parity have separate regression tests. Broader independent multiway
  reference comparisons remain necessary before claiming production accuracy.
- The three-player training curriculum is synthetic full-range turn/river spots. It is not yet a
  validated distribution of every real six-max multiway line. The live coach must not treat the
  candidate policy as universal GTO or extrapolate to four players/unequal-stack side pots/rake.
- Full three-player flop trees can exceed laptop memory even after several days. The Scroll stage
  may therefore produce **zero hands** and stop with a node/memory-budget report. It will not reuse
  the old 13-runout/checkdown shortcut. A larger-memory machine or a separately validated three-way
  turn-leaf model is the next step when that happens. Longer runtime does not fix insufficient RAM.

A successful run yields backed-up datasets, candidate value/policy models, test reports, and a draft
Scroll bank only if every preceding gate and each full-hand teacher passes. A blocked run still
yields useful data and an explicit reason. No fixed number of days guarantees passing models or
Scroll output, and no unreviewed candidate is silently activated in the app.

## Verification of this implementation

- Engine rebuilt; the C++ solver regression executable passes.
- Exact checkdown enumeration: 100 cases pass, alternating all-active and each possible folded player.
  The archived inputs/results are `research/results/multiway_checkdown_repaired.json`; the original
  failing report remains for comparison. No independent commercial solver certification is claimed.
- Tests cover betting payoff conservation, preserved folded cards, explicit four-player rejection,
  tree limits, legal action masks, suit invariance, torch/NumPy parity, auth/checksum/quota handling,
  and backup/restore. The app's `npm run check` passes.
- A full-range synthetic three-player river teacher and a small-range full turn+river teacher both
  passed deviation, stability and conservation gates in smoke runs.
- A small heads-up policy dataset exercised generation -> training -> export -> held-out metrics;
  its deliberately tiny model correctly failed the promotion gate. No production-quality weights
  were produced in this workspace.
- The coordinator dry-run and Ubuntu shell syntax were checked. The multi-day campaign, live Fly
  deployment, real laptop thermals/throughput, and full-flop Scroll yield have not been run here.
