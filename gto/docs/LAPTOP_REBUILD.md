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
