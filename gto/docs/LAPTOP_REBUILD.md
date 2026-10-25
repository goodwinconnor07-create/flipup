# Laptop-only Scroll rebuild: work in progress

This supersedes SCROLL_FIRST.md for generation. Do not use the old start commands yet.
No new poker solves or scenario generation should be run in the assistant/cloud workspace.
The 80 cloud-generated starter decisions have been withdrawn; private server rows remain for audit.
Old saved copies must not be graded. The app can be empty until laptop content is ready.

## Current corrections

- Removed the seed archive and bundled answers. Server startup withdraws the exact 80 ids without
  deleting private audit records. Publication cannot restore those ids. Client caches and saved
  snapshots reject the same ids after the client update.
- Scroll betting trees now include minimum bets/raises, donk bets, and all-in, with no artificial
  raise-count cap. Nearby sizes are not merged; small-stack bets are not silently replaced by jams.
  A tree exceeding laptop resources must fail rather than silently shrink its action space.
- Three-player acceptance uses SUM of unilateral deviation gains, rather than the average that
  could conceal one player's larger deviation. This remains a metric in the chosen betting tree.
- Synthetic range sampling cannot publish. Every production root must specify its game profile,
  numeric ranges and traceable history/range origin.
- A laptop-generated, source-version-matched validation receipt is required before generation.
  No receipt or external reference answers have been fabricated in this workspace.

## Important outstanding work

This is NOT yet a finished, launch-validated engine or complete automatic generator.
The original whole-hand orchestration and random training sampler are not accepted production
sources. The reached-range job builder still needs implementation/validation before unattended
from-scratch whole hands can be enabled. Current imported-root jobs are an intermediate audit path.

Current validated-rule support is limited to equal-root-stack HU/three-player, no rake, chip EV.
Raked games, unequal stacks/side pots, four-plus players and tournament ICM/bounty utility require
separate implementation and validation. They must not be silently mapped onto the supported model.
Adding more game-profile names does not implement their rules.

No finite tree contains every continuous bet size. The interface must expose legal action types and
arbitrary legal chip sizes. Off-tree choices need their actual size added and re-solved on a laptop;
no nearest-size answer, invented zero frequency or instant 'wrong' grading is acceptable.

## GTO Wizard comparisons

One free custom search per day is useful for a rolling independent benchmark, not a bulk source of
labels. Do not automate around that quota. Start with spots whose full ranges, rake, stack, position,
action history and bet menu can actually be matched. If Wizard does not expose the required inputs,
record that comparison as non-comparable, not a passing engine certificate.

`gto/scripts/laptop_scroll_validation.py` is to run ONLY on the laptop. It runs analytical solver
regressions and independent card-removal tests, then supplied exact-match reference cases. It writes
an engine-version-specific receipt and compares all action EVs (within 0.5% pot). Different mixes
can both be equilibria: compare EVs and exploitability, not just rounded frequencies.

Its JSON input has `cases`: each case includes `id`, `source: "gto-wizard"`,
`matching_settings_confirmed: true`, full numeric `spec`, `input_digest` of that spec,
`hero_cards`, and all `actions` with `kind`, `to`, and `ev` in node-relative big blinds.
Those fields must be actual exported/copied reference information, not guessed placeholders.
A spec includes `profile` (`utility`, `rake_rate`, `rake_cap`) and `range_origin`
(`source`, nonempty `history`, `synthetic: false`).

After setup on a laptop and only after supplying genuinely comparable references:

```bash
cd "$HOME/flipup-scroll/gto"
"$HOME/flipup-net-env/bin/python" scripts/laptop_scroll_validation.py \
  --references "$HOME/scroll-references.json" --out "$HOME/scroll-validation.json"
```

Imported-root generation additionally requires `FU_SCROLL_JOBS` (JSON containing `spots`) and
`FU_SCROLL_VALIDATION`. This is deliberately blocked by default until input provenance and
independent comparisons are available. Automatic uploads/backups/downloads remain in the runner,
but are downstream of validation. Model training must use validated labels and stay separate from
publication of solver answers. No network prediction is a certificate of GTO accuracy.

## Safe first laptop step: diagnostics, not generation

These commands compile and run the existing numerical checks ON THE LAPTOP. They do not create
Scroll hands, publish answers or activate a model. The report does not claim external validation.
Do this on both laptops and keep the resulting audit directory.

```bash
git clone --branch codex/laptop-only-rebuild --single-branch \
  https://github.com/goodwinconnor07-create/flipup.git "$HOME/flipup-laptop-rebuild"
cd "$HOME/flipup-laptop-rebuild"
bash gto/scripts/scroll_laptop.sh setup
"$HOME/flipup-net-env/bin/python" gto/scripts/laptop_engine_audit.py \
  --out "$HOME/flipup-engine-audit"
```

Generation remains disabled while those numerical regressions and the reached-range builder are
being repaired. This is intentional: a successfully compiled engine is not a validated GTO engine.

## Network scheduling implemented in the rebuild branch

The slow role now checks both its local validated data and a checksum-verified download of the fast
role's data after a generation batch. Training waits for at least 100 distinct training board groups,
20 validation groups and 20 test groups for one teacher/player-count/street combination. Datasets
from an older validation-engine fingerprint are ignored. No waiting for a model blocks Scroll labels.

Install CPU PyTorch on the intended training laptop with:

```bash
bash gto/scripts/scroll_laptop.sh setup-models
```

Training takes an immutable local snapshot, invokes the existing policy/action-value trainer and,
for heads-up data, the value trainer plus held-out evaluator. A candidate gets at most 20 minutes
per cycle and three attempts for a fixed dataset. New data creates a separate candidate directory.
Candidates, evaluation reports and logs are backed up to Fly; they are never automatically activated
as answer keys. Passing those engineering model gates is not a GTO certificate. `--models off` disables
this stage. Missing PyTorch is reported in `models-status.json` while generation can continue.

This code has only been checked for planning, types/syntax and contracts in the assistant workspace.
No network was trained and no poker spot was solved here. The from-scratch reached-range/whole-hand
builder and supported-game expansion remain unfinished, so these additions do not make the complete
pipeline ready for an unattended production campaign.

New audit runs print the current stage and a heartbeat every 15 seconds. Do not update or restart
an audit already running on a laptop just to obtain that progress display.

## Leave a laptop computing now: QUARANTINED DRAFTS

After the original internal audit passes, the new `draft` mode can perform useful overnight
computation without granting publication approval or requiring fabricated external references.
It is a separate command, directory, file extension and remote artifact namespace. It has no call
to any Scroll publication route. The normal production `start` mode retains its validation gates.

```bash
cd "$HOME/flipup-laptop-rebuild"
git pull --ff-only
bash gto/scripts/scroll_laptop.sh draft fast away1
# On the slower laptop, after its own setup/internal audit: use draft slow away1
bash gto/scripts/scroll_laptop.sh draft-status fast away1
```

Drafts use the existing approximate six-player preflop model to derive reached starting ranges,
with its own measured model-deviation check. They then solve independent no-rake river study games
for two or three players across 20/40/100bb starting profiles. These river studies do NOT invent
intervening flop/turn histories and are not full hands. Their ranges are not externally verified
preflop GTO. Postflop answers are computed using the strict full river tree and stability gates.
All saved results explicitly say `publicationApproved: false`. A passed old internal audit is
recorded as a diagnostic baseline, never upgraded to validation of newer source code.

Defaults: 48 hours, two threads, 1536MB engine-storage cap. Each subprocess batch has a 30-minute
wall-clock cap; timeouts and failures preserve logs and inputs. Three consecutive failures stop
rather than silently wasting two days. Status records that stop. Restart with the same command/run
name keeps the original deadline and completed batches. Terminal closure is safe under tmux;
sleep/reboot still interrupts computation. To stop: `tmux send-keys -t scroll-draft-fast C-c`.

If you previously configured the upload token with `scroll_laptop.sh configure`, each batch backs up
to private Fly artifacts under `draft-away1-fast` / `draft-away1-slow`. Without credentials, computation
still runs and clearly reports LOCAL ONLY in status. It does not pretend uploads succeeded. The data
stays in `~/flipup-draft-data/away1/fast` (or `slow`); never delete that directory while running.

These draft files are excluded from the approved-data network trainer. They require review and
matching validation before being admitted to any production training set or public feed. Useful
computed candidates are not equivalent to launch-ready Scroll content.

## Complete-hand implementation (new engine build required)

`scroll_whole.py` follows a SINGLE full-future flop tree through all actions and legal dealt cards.
The real dealt hole cards are collision-free. No later street gets a fabricated range or forced
checkdown; every reached actor decision gets additional strategy/EV stability checks. A rejection
rejects the entire hand, and its input/log remain available. Small/memory-exhausted trees are not
silently substituted. Preflop history comes from the internal approximate preflop model and retains
that disclosure. This is implemented whole-hand computation, not certification of that preflop model.

New engine queries expose current-street wagers separately from cumulative contributions. This
requires recompiling `_engine`; the new laptop audit includes `test_scroll_multistreet.py`.
Do NOT update a running job. Once it finishes/stops, the full-hand candidate command is:

```bash
cd "$HOME/flipup-laptop-rebuild"
git pull --ff-only
bash gto/scripts/scroll_laptop.sh setup
"$HOME/flipup-net-env/bin/python" gto/scripts/laptop_engine_audit.py --out "$HOME/flipup-engine-audit"
bash gto/scripts/scroll_laptop.sh whole fast full1
```

The same 48-hour resumable deadline and subprocess/memory limits apply. Full flop trees are much
larger than river studies; the run may reject every attempt if the machine cannot fit the declared
tree. Three failures stop the run. This is useful resource/quality evidence, not permission to shrink
the tree unnoticed. Files are under `~/flipup-whole-data/full1/fast` (or slow), explicitly unapproved.

The app now has a full-hand viewer under Learn, sequential hero questions with the existing EV
feedback/custom-size controls, and full-hand snapshots in the study bank for offline replay.
After a choice, it explicitly follows the stored solver line, not a fabricated continuation of the
user's alternative action. Standalone questions remain available.

New server routes are `/scroll/hands/catalogue`, `/scroll/hands/{id}` and authenticated
`/admin/scroll/hands/publish`. Neither the laptop draft command nor the app can approve a hand.
`publish_scroll_hands.py` takes an explicit approval plan containing exact file hashes and a current
independent validation receipt. Every decision needs matching street/player coverage and a private
root for future custom-size re-solves. Approval also explicitly requires independent checking of the
preflop range model. This release cannot bypass the currently paused production server; deploy the
validated replacement only when those checks have been satisfied.

Approved whole-hand files also retain reached turn/river roots for model data. Running the explicit
reviewed publication command with `--jobs-out /path/to/reviewed-spots.json` exports those roots into
the existing validated generation/training pipeline. Their ranges include folded players, and the
three-player re-solve preserves the active-player mask rather than reviving a folded opponent.
These are genuinely reached roots from the hand, not independent random river ranges.

Verification here: normal frontend type/unit/build checks, protocol-only mocked browser play/save/
offline replay, pure hand-path traversal tests and C++ syntax checks. The new multi-street wager
regression is written for the LAPTOP audit and has deliberately NOT been executed here. The backend
and app changes remain on the rebuild branch; production is not reopened automatically.

## One-command full-hand candidate workflow

On a laptop that already completed the original setup, `whole-auto` rebuilds the engine, runs the
current numerical audit, and starts the full-hand candidate workload only if the audit succeeds.
All stages run in tmux and retain individual logs plus `bootstrap-status.json`. No sudo installation
or unattended password prompt is introduced. The 48-hour candidate budget begins after the audit.

Do not update while a previous job is running. Stop the old role's draft session first if you choose
to switch, preserving its output directory. Then:

```bash
cd "$HOME/flipup-laptop-rebuild"
git pull --ff-only
bash gto/scripts/scroll_laptop.sh whole-auto fast full2
# On the other laptop after its original setup: whole-auto slow full2
```

Status: `~/flipup-whole-data/full2/fast/bootstrap-status.json`; numerical audit logs are in `audit/`;
hand files, inputs and rejection reasons are in `candidates/batch-*/`. Existing uploader configuration
is reused when present; audit logs are included in those backups. Without credentials, status says
local only. Close the terminal if needed, but keep Ubuntu running, the laptop awake and plugged in.
The completed-hand source still needs independent range-model and solver validation before publication.

Supported scope remains equal-root-stack HU/three-player, no rake, chip EV. Four-plus players,
unequal stacks/side pots, rake profiles and ICM/bounty utility are not implemented by this release.
A complete pipeline for that supported scope is distinct from claiming universal perfect GTO.
