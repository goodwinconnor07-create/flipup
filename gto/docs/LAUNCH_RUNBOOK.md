# Launch runbook

The rebuild is on `codex/laptop-only-rebuild`. This document describes the release path;
it is not a certificate that the poker engine or content is ready to launch.
All numerical tests, poker generation and network training run on the laptops.

## What currently blocks a public Scroll launch

- Matching independent solver comparisons and reviewed range origins are still required.
- There is no approved replacement content bank ready for launch. The withdrawn cloud bank stays withdrawn.
- Only equal-root-stack heads-up/three-player, no-rake chip-EV games are implemented by this pipeline.
  Four-plus players, side pots, rake and tournament utility are not supported launch profiles.
- Full flop trees may exceed laptop memory or time budgets. Rejections must be inspected; they
  must not trigger an automatic smaller tree or fabricated answer.
- New frontend code needs deployment and real phone testing. A successful local build is not deployment.

## Assign the two laptops

### 8 GB Windows laptop: raise the WSL allocation carefully

`python3 gto/scripts/configure_scroll_wsl.py --apply` runs in Ubuntu, backs up the Windows
user's existing `.wslconfig`, preserves unrelated settings and sets WSL2 memory to 5GB and
swap to 4GB. Configuration-text tests pass; Windows application of the settings must be
verified on the laptop. Save work in every WSL distribution, run `wsl --shutdown` from Windows
PowerShell, and reopen Ubuntu. Verify with `free -h` and the launcher `resources` command.
Swap is disk-backed and is not a substitute for RAM or a capacity fix.

Before another full-hand campaign, run a bounded tree-construction check against a saved input:

```bash
INPUT=$(find "$HOME/flipup-whole-data/launch1/fast/candidates" -name '*.input.json' -print -quit)
"$HOME/flipup-net-env/bin/python" gto/scripts/scroll_capacity.py \
  --input "$INPUT" --out "$HOME/flipup-capacity.json"
```

This runs on the laptop, builds one tree with the current detected memory budget and runs zero
solver iterations. A timeout, node cap or memory failure is a blocker; do not launch the same
overnight campaign again. One fitting tree does not prove the whole workload fits. This check
does not repair the full-tree design or silently shrink betting options.

The launcher now detects CPU affinity, Ubuntu/WSL available RAM and cgroup v2 limits.
It uses all visible logical CPUs for OpenMP work and selects a solver-memory budget with
headroom for the OS, Python and tree construction. Explicit `FU_NET_THREADS` and
`FU_NET_MEMORY_MB` settings override detection; `resources` prints the resulting budget:

```bash
bash gto/scripts/scroll_laptop.sh resources
```

This does not change Windows/WSL allocations, guarantee full CPU utilization in serial stages,
or remove the separate tree node limits. Full-hand generation remains blocked where the tree
exceeds capacity. A RAM budget is a solver allocation guard, not a hard limit on process RSS.

Use the faster laptop for the full-hand candidate run, including three-player cases:

```bash
cd ~/flipup-laptop-rebuild
git pull --ff-only
bash gto/scripts/scroll_laptop.sh whole-auto fast launch1
```

Use the slower laptop for existing heads-up flop-library follow-ups:

```bash
cd ~/flipup-laptop-rebuild
git pull --ff-only
bash gto/scripts/scroll_laptop.sh reuse-flops "$HOME/flops" launch1
```

Run initial `setup` first if not already done. Replace the library path if needed.
Stop existing heavy jobs before updating or starting a replacement. Use different run names
for different configurations or machines. Default runtime is 48 hours, not a guarantee of output.
Whole-auto rebuilds and audits first, then generates candidates. Both commands preserve local data
and back it up when coach upload credentials are configured. Neither publishes drafts.
Keep laptops awake, plugged in, and connected; tmux does not survive shutdown.

Inspect progress:

```bash
bash gto/scripts/scroll_laptop.sh dashboard fast launch1
```

The terminal dashboard refreshes every five seconds. It reads files only; Ctrl+C closes the view
without stopping generation. It shows complete hands, hero questions, standalone scenarios,
rejections/reasons, throughput, observed input-to-output hand timing, profile, budget, backups,
saved-answer quality metrics, worker output and system resources. Timing excludes preflop setup
and unsuccessful attempts; throughput uses total generation elapsed time. A status timestamp is
not proof a process is alive. Candidate counts are not approval counts.

To watch an already-running older checkout without updating code beneath its worker, download
only the standalone viewer (no Python packages required):

```bash
curl -fL https://raw.githubusercontent.com/goodwinconnor07-create/flipup/codex/laptop-only-rebuild/gto/scripts/scroll_dashboard.py -o /tmp/flipup-scroll-dashboard.py
python3 /tmp/flipup-scroll-dashboard.py --root "$HOME/flipup-whole-data/launch1/fast"
```

Change run/role as appropriate. `--once` prints a single snapshot for diagnostics. Alternatively:

```bash
cat ~/flipup-whole-data/launch1/fast/bootstrap-status.json
tail -n 30 ~/flipup-whole-data/launch1/fast/bootstrap.log
cat ~/flipup-flop-reuse/launch1/status.json
tail -n 30 ~/flipup-flop-reuse/launch1/worker.log
```

Full-hand candidate progress is under `candidates/status.json` after the audit stage.
Upload failures retain local files. Confirm the backup status instead of assuming uploads worked.
No incoming Internet port is required for uploads. tmux access requires local access or an
independently configured SSH/VPN connection; the coach does not grant remote laptop shell access.

## Credentials

The Fly API token manages infrastructure. It is different from `FLIPUP_UPLOAD_TOKEN`, which
authenticates laptop artifact uploads and private coach endpoints. Never put either in git,
shell history, screenshots, public requests or frontend code. Revoke tokens exposed in chat.
The existing GitHub deployment uses the repository's `FLY_API_TOKEN` secret; replace it through
GitHub's secret settings if rotated. Laptop configuration uses `scroll_laptop.sh configure`.

## Validate and approve content

Use the daily GTO Wizard custom lookup for a precisely matching comparison, without bypassing
the quota. Record full numeric ranges, positions, stacks, rake, board, history, action sizes and
all action EVs. If these cannot be matched, the comparison is inconclusive.

Run `laptop_scroll_validation.py` on the laptop with genuine reference inputs. See
[the validation contract](LAPTOP_REBUILD.md#gto-wizard-comparisons). Every engine change invalidates
old receipts. Coverage is per player count/street; a river check does not certify flop or multiway.
Even passing coverage is limited evidence, not a universal guarantee of accuracy.

Inspect candidate diversity, close decisions, feedback and full-hand continuity. Review private
range provenance too: a refined turn answer does not repair an inaccurate inherited flop policy.
`publish_scroll_hands.py` requires explicit reviewed file hashes and a current receipt. Do not
manually flip a draft's approval flag as a substitute for review. Keep model training restricted
to approved teacher data; train candidates on the slower laptop after sufficient data accumulate.
Network candidates require held-out evaluation and separate activation review.

## Deploy and verify

The Check workflow runs frontend type/tests/build and pure Scroll contract tests. The coach deploy
workflow now depends on both checks passing. These cloud checks run no poker solves.

The new backend defaults `FLIPUP_SCROLL_PUBLISH_ENABLED=0`. Keep this closed for staging.
Both publication routes also require a current validation receipt with matching profile coverage.
The receipt comes from an authenticated operator; it is not a third-party signed attestation.
Only after reference and content review, set the switch to `1` in the reviewed deployment
configuration and deploy it. The config default must be consciously changed for that release.

Deploy the reviewed backend ref through Deploy GTO coach; deploy the frontend through the existing
Cloudflare deployment path. They are separate releases. Preserve the Fly cache volume and take a
volume snapshot before upgrading. Record the last healthy image/version before replacement.

Run this read-only report after deploying both services:

```bash
python3 gto/scripts/launch_preflight.py --out "$HOME/flipup-launch-http.json"
```

It checks app health, backend health, proxy consistency and approved catalogue availability. It
never calls a solver or publishes data. `launchApproved` stays false because HTTP success cannot
establish poker accuracy or phone usability. Missing new routes on the old deployment are blockers,
not a reason to fall back to withdrawn content.

On real phones verify home startup, offline/reconnect behavior, sequential whole-hand questions,
board reveal order, legal actions and custom sizes, pending/ungraded off-tree choices, precise mixed
frequencies, feedback, one count per hand, 24-hour review expiry and saved study-bank persistence.
Test both an empty feed and a reviewed populated feed. Check capacity, backup restore and sleep/wake
behavior under expected load. Publish a small reviewed batch before a large release.

If the release fails, close publication, stop the affected laptop campaign, and roll back the
frontend/backend to the recorded healthy versions without deleting the persistent cache. Use
Fly volume snapshots for recovery; a rollback must never restore the withdrawn starter bank.
