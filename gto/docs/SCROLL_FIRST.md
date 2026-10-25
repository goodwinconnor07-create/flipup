# Scroll-first production and Ubuntu commands

This is the current workflow. It supersedes the network-first campaign for Scroll production.
Priority: accurate, challenging standalone decisions now; full hands and faster model answers over time.

## Delivered

- 80 fresh starter decisions across 40 river boards, selected from 245 approved candidates. There are
  71 mixed-strategy and 9 close decisions, at most two per board and one per context family. They are
  **new independent scenarios**, not snippets relabelled from the old hand bank.
- Full future betting trees, no neural leaf estimates, exact heads-up/three-player card removal,
  <=0.1% pot measured tree gap, additional iterations, and explicit exact-hero strategy/value stability
  checks. Frequencies retain precision; 99.9% is shown as >99%, not falsely rounded to a pure action.
- Direct solved EV grading. Rare equal-EV mixes are good choices. An uncomputed size is not called
  wrong or given a fabricated zero frequency; it is queued and ungraded until verified.
- Matched new menus for custom bet sizes: after re-solving, all comparison EVs come from the same new
  tree. Buttons include check or call as appropriate, supported bet/raise sizes, all-in where legal,
  and voluntary folding. Percentage sizing requests go to the laptop queue when outside the menu.
- Concise feedback on EV loss, the solved mix, price/pot odds and pure-bluff break-even fold frequency;
  actual conditional defender fold rates when available heads-up. Range summaries and assumptions
  are one tap away. No invented generic range advantage or claim that heads-up MDF splits multiway.
- Startup goes to Home, including saved bot games. Join links still open their requested join screen.
- Both ordinary game reviews and unsaved Scroll history expire after 24 hours. Saved study-bank
  entries keep full immutable scenario snapshots until deleted, even offline/after remote updates.
  Study bank is also visible from Review. Lifetime progress counters are not the recent-history count.
- The old Scroll packs remain accessible only as archived saved references and do not affect grades.
- Authenticated automatic upload to Fly, public approved catalogue for app data updates, download of
  approved scenarios onto **both laptops**, immutable artifact backups, and remote status/pause/resume.
- Durable deduplicated work queue for off-tree sizes and supported heads-up custom decisions.
  Repeated custom requests reuse completed refinements rather than spawning another live solve.
  Leases/heartbeats, three attempts with larger iteration budgets, queue limits, and failed-state
  reporting prevent an unbounded solve backlog. No background neural estimate is labelled exact.
- Already-paid-for exact scenarios also export value/policy training NPZ files automatically. Scroll
  does not wait for a network checkpoint. The previous training tools can use these jobs separately.

The audit also found and fixed a heads-up CFR averaging bug: branches with zero opponent reach
were skipped, freezing their average strategies at early iterations. A regression case previously
stuck near 0.353% gap after 16,000 passes now reaches below 0.001% at 1,000. The entire starter bank
was regenerated after this correction. Older flop/model artifacts should be revalidated before
being described as launch-quality answers.

## Accuracy scope

These are range-conditioned practice games: the starter ranges are synthetic, strength-correlated
ranges. They are clearly labelled that way, not described as recorded six-max GTO histories. Pots,
stacks, boards and legal reached action sequences are generated from scratch. Values/frequencies
come from the solver, not a language model. The metric is for the declared ranges and abstract bet
menu with no rake. It is **not** a promise of universal perfect GTO or agreement with GTO Wizard when
its ranges, rake, history, or sizes differ. The full private/public solver inputs are bundled for audit
in `flipup_gto/data/scroll_seed_inputs.json.gz` and in laptop/coach entry files.

All 80 bundled starters are heads-up river decisions. The fast worker interleaves new exact three-way
river and turn attempts; both workers broaden the turn pool. Those are admitted only after the same
quality gates. Four-player/unequal-stack side-pot solves remain unsupported. No separate independent
commercial-solver comparison has been performed in this workspace. For such a comparison, import
**matching full ranges and tree settings**, not just the board and hero hand.

## One-time deployment

Deploy the coach and app once from the same branch. Thereafter approved scenario data updates do
not require an app/code release. The existing GitHub workflow can deploy the coach using its
repository Fly secret, even when the local shell has no Fly login:

```bash
gh workflow run deploy-coach.yml --repo goodwinconnor07-create/flipup --ref codex/scroll-first
gh run list --repo goodwinconnor07-create/flipup --workflow deploy-coach.yml --limit 3
```

The app uses its existing Cloudflare GitHub build connection. Confirm that build succeeds on your
production branch; the direct command below needs a local Cloudflare login/token.

On a machine with your normal Fly and Cloudflare tooling/authentication:

```bash
git clone --branch codex/scroll-first --single-branch \
  https://github.com/goodwinconnor07-create/flipup.git "$HOME/flipup-scroll"
cd "$HOME/flipup-scroll/gto"
fly volumes list -a flipup-gto
# Ensure the gto_cache volume has room for the existing flops plus campaign backups.
# If needed (paid storage), replace the id below with the existing gto_cache volume:
# fly volumes extend YOUR_VOLUME_ID --size 20 -a flipup-gto
fly deploy -a flipup-gto
cd ..
npm ci
npm run deploy
```

Keep the existing `FLIPUP_UPLOAD_TOKEN` Fly secret and app `GTO_URL`. Configure both laptops with
that token. If you must rotate it, also update any old flop uploader still in use. New endpoints are
`/scroll/catalogue`, `/scroll/scenarios/{id}`, `/scroll/size` and `/scroll/jobs/{id}`. Administrative
routes require the token and are not forwarded as authenticated routes by the public Worker.

The coach imports the 80 trusted bundled starters into its persistent SQLite store at startup.
The app also ships those public starters for offline/server-unavailable use. Full private range
weights are not returned by the public catalogue. New publications are validated before becoming
visible. Workers never upload or activate executable app code.

## Both Ubuntu laptops: setup

Use a new checkout to keep your existing flop files/checkouts. Stop old heavy solve campaigns before
starting this one. Do not delete your flops. Keep plugged in, lids open and automatic suspend disabled
in Ubuntu Power settings.

```bash
sudo apt-get update
sudo apt-get install -y git

git clone --branch codex/scroll-first --single-branch \
  https://github.com/goodwinconnor07-create/flipup.git "$HOME/flipup-scroll"
cd "$HOME/flipup-scroll"
bash gto/scripts/scroll_laptop.sh setup
bash gto/scripts/scroll_laptop.sh configure
```

Configure asks for the HTTPS coach URL and upload token privately, saved with mode 600. This setup
needs no GPU or PyTorch for scenario generation. Generated output does not use your old Scroll data
and does not alter `~/flops`.

On the **faster laptop**:

```bash
cd "$HOME/flipup-scroll"
bash gto/scripts/scroll_laptop.sh start fast launch1
```

On the **slower laptop**:

```bash
cd "$HOME/flipup-scroll"
bash gto/scripts/scroll_laptop.sh start slow launch1
```

Defaults: 48-hour persistent budget, two CPU threads, 1536MB engine-storage cap. This is not a total
process RAM limit. Fast interleaves three-way work; slow focuses on cheaper heads-up work. Both
produce accurate Scroll first, then service a queued refinement, then repeat. New entries are
published automatically after every batch and both laptops download the approved catalogue/files.
All exact solves additionally supply data under `training/` for eventual network training.

To allow a week instead, use this override on **both** start commands:

```bash
FU_SCROLL_HOURS=168 bash gto/scripts/scroll_laptop.sh start fast launch-week1
# On the other laptop:
FU_SCROLL_HOURS=168 bash gto/scripts/scroll_laptop.sh start slow launch-week1
```

`FU_NET_THREADS` and `FU_NET_MEMORY_MB` override CPU/storage limits. Use a new run name after code,
engine, settings or quality-threshold changes: training manifests reject mixed teacher versions.
Resume a stopped job by repeating its original start command; the original deadline is preserved.

## Automatic backup, downloads and remote access

Generated data, proofs, approved public downloads, training rows, status and logs stay under:

```
~/flipup-scroll-data/launch1/fast/        # faster laptop
~/flipup-scroll-data/launch1/slow/        # slower laptop
```

The code checkout and generated data are separate. The runner prints the exact output directory
at startup; no generated files need to be committed to Git.

Backups also run every 15 minutes while a long solve is in progress. Remote artifact namespaces are
`scroll-launch1-fast` and `scroll-launch1-slow`. The existing network upload server enforces a default
10GiB quota, 64MiB per-object cap, and a disk reserve. Quota/outage failures preserve local data and
stop the main loop at the next batch; capacity never expands silently. Keep a separate disk backup too.

Approved public files are downloaded to each worker's `downloaded/` directory. The app checks the
coach's catalogue whenever it deals another scenario, caches recently fetched scenarios, avoids
recent families and keeps saved content intact across updates.

From either laptop, or another computer with this checkout, Python environment and token:

```bash
cd "$HOME/flipup-scroll"
bash gto/scripts/scroll_laptop.sh status
bash gto/scripts/scroll_laptop.sh pause    # global pause, after current batch
bash gto/scripts/scroll_laptop.sh resume
```

For local logs/stop:

```bash
tail -n 20 "$HOME/flipup-scroll-data/launch1/fast/worker.log"
bash gto/scripts/scroll_laptop.sh stop fast
```

No public remote shell or unauthenticated dashboard is exposed. Remote control is limited to a
private status summary and pausing/resuming workload. Laptop sleep/reboot interrupts tmux; repeat
start after waking. A queue worker renews leases while solving, so other workers do not duplicate
that task. Failed solves remain ungraded and visible as failed after three attempts.

## Custom-hand continuity and future models

For supported heads-up custom decisions, the live coach can give its existing estimated answer
while it queues the full root/ranges/path for offline refinement. Requests include the complete
numeric state, not just board/cards. Finished results preserve action identifiers and are cached
on the persistent volume; the next identical request uses the verified result. The app distinguishes
estimated from verified responses. Stored heads-up flop replies are labelled estimated and queued for full-tree refinement too;
large flop trees can fail the laptop node/memory budget and then remain estimates. Heuristic
multiway custom replies are not automatically promoted to verified results by this mechanism.

Model training is lower priority than producing this Scroll bank. Every accepted root supplies
policy and, heads-up, value labels in the previous training format. Train candidates with
`train_value_model.py`/`train_strategy_model.py` on spare capacity, preserving their board splits and
quality gates. They are never auto-activated as Scroll truth. A broader cache plus future approved
policy models can progressively reduce live solves without delaying the launch-quality bank.

Full preflop-to-river multiway hands remain the separate `generate_scroll_verified.py` workflow.
This new feed intentionally starts at a real solved decision state. It does not invent a preflop
history for synthetic ranges or pretend that a one-decision scenario is a whole recorded hand.

## Verification

A 40-case generation pilot admitted 245 decisions; the curated 80 cover all 40 boards. Backend tests
exercise actual solved cases, auth/publication, atomic failed packs, state-dependent queue keys,
lease retries/pause, private custom-cache lookup and illegal sizing rejection. Frontend tests cover
fractional frequencies, equal-EV grading, price/fold-equity explanations, time expiry and saving.
Browser tests play, grade, save, reload and replay a new scenario, and test startup with a bot session.
No physical laptop run was executed from this workspace. After deploying, verify that
`https://flipup-gto.fly.dev/scroll/catalogue` returns a non-empty JSON catalogue and the app
loads the new scenarios. Deployment success is separate from solver/test validation.
