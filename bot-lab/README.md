# bot-lab: a measured look at FlipUp's bots

Everything here is an experiment. Nothing in `bot-lab/` ships in the app. Start with `report.md`.

## Contents

| File | What it is |
|---|---|
| `report.md` | Final comparison, uncertainty, difficulty and personality assessment, compute cost, next steps |
| `baseline.md` | How the bots play at the starting commit (e61aa8c), coverage |
| `findings.md` | Ranked findings with evidence and representative hands |
| `rounds.md` | The three tuning rounds: what was tried, results, what was kept or reverted |
| `results.json`, `results.csv` | Session-level metrics and the seed/configuration of every session (all phases) |
| `commands.log` | Commands actually run |
| `sim.ts` | Session driver (one table, many hands, on a chosen engine) |
| `archetypes.ts` | Scripted test opponents |
| `plan.ts` | Which sessions are played, with which seeds |
| `run.ts`, `worker.ts` | Bounded-concurrency runner |
| `analyze.ts` | Tables, bootstrap intervals, paired comparisons |
| `engines/baseline/game` | The frozen starting engine (`src/game` at e61aa8c without tests and `botSim.ts`) |
| `engines/r1`, `r2`, `r3` | The candidate engines tried in each round (`patches/*.patch` are the diffs) |
| `data/*.jsonl` | One JSON line per session (config, per-seat counters, flagged hands) |

## Reproduce

All commands are run from the repository root. Node 22, `npx tsx` (downloaded on first use) and `npm ci`.

```sh
# Checks that the lab itself is sound: determinism, paired cards, baseline == working tree when the code is the same
npx tsx bot-lab/pilot-checks.ts

# Pilot (2,010 hands, about 40 s on 4 cores with 3 workers)
npx tsx bot-lab/run.ts pilot baseline bot-lab/data/pilot-baseline.jsonl --workers 3

# Baseline study on the development seeds (20,000 hands, about 12 minutes)
npx tsx bot-lab/run.ts dev baseline bot-lab/data/dev-baseline.jsonl --workers 3
# Second counter set: heads-up sessions re-run, and the 3-bet probe
npx tsx bot-lab/run.ts dev baseline bot-lab/data/dev-baseline-v2-hu.jsonl --workers 3 --only hu-archetype
npx tsx bot-lab/run.ts probe baseline bot-lab/data/probe-baseline.jsonl --workers 3
npx tsx bot-lab/determinism-check.ts bot-lab/data/dev-baseline.jsonl bot-lab/data/dev-baseline-v2-hu.jsonl

# Candidate rounds (candidate arm only; compare against the baseline sessions with the same ids)
npx tsx bot-lab/run.ts dev r1 bot-lab/data/r1.jsonl --workers 3 --only full9-bots,six-bots,six-two-archetypes
npx tsx bot-lab/run.ts dev r2 bot-lab/data/r2.jsonl --workers 3 --only hu-bots,hu-archetype,six-two-archetypes
npx tsx bot-lab/run.ts dev r3 bot-lab/data/r3.jsonl --workers 3 --only hu-bots,hu-archetype
npx tsx bot-lab/analyze.ts compare bot-lab/data/dev-baseline-merged.jsonl bot-lab/data/r3.jsonl --title "Round 3"

# Confirmation (fresh seeds 900000+, 14,880 hands per arm); "current" is the working tree (src/game)
npx tsx bot-lab/run.ts confirm baseline bot-lab/data/confirm-baseline.jsonl --workers 3
npx tsx bot-lab/run.ts confirm current bot-lab/data/confirm-candidate.jsonl --workers 3
npx tsx bot-lab/analyze.ts compare bot-lab/data/confirm-baseline.jsonl bot-lab/data/confirm-candidate.jsonl --title "Confirmation"

# Reports and exports
npx tsx bot-lab/analyze.ts report bot-lab/data/dev-baseline.jsonl
npx tsx bot-lab/export.ts
npx tsx bot-lab/hand.ts bot-lab/data/dev-baseline.jsonl dev-full9-bots-5 348
```

`dev-baseline-merged.jsonl` is the baseline file with the `hu-archetype` sessions replaced by their identical re-run that
has the second counter set (a one-off merge, noted in `commands.log`).

Seeds: pilot 500000+, development 1000+, 3-bet probe 300000+, confirmation 900000+. A session has a chance seed (the cards) and a
decision seed (the bots' coin flips); both are in `results.csv`. The same chance seed deals the same cards on every engine.

Candidate engines are copies of `src/game`; to try a change, copy `engines/baseline` to `engines/<name>`, edit it, and run
`npx tsx bot-lab/run.ts dev <name> ...`.

## What the lab is and isn't

It measures how bots behave and how they fare against simple scripted players. It can't say whether anything is fun. The scripts
are test policies, not models of people. See `report.md` for limits and a short manual playtest checklist.
