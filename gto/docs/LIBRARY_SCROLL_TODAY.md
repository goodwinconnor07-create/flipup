# Library-first Scroll: today's laptop plan

The expensive whole-flop full-future campaign is superseded for this workload. Do not restart
`whole-auto launch1`. Preserve its logs. All numerical work stays on the laptops.
No screen, layout, CSS or frontend component was edited for this backend change.

## Implemented

- Pure NPZ extractor, zero poker solves. Checks board blockers, actors, pot/history accounting,
  finite policies/EVs, shapes, normalization and recorded convergence; missing labels are not invented.
- Questions retain exact source SHA, matchup, action path, model limitations and float16 provenance.
  Actor ranges follow stored action probabilities. Invalid or unreachable hands are rejected.
- Per-node curation mixes interesting decisions with ordinary ones and limits repetition.
- Immutable question files, resume receipts, run-configuration checks, exclusive run lock and
  visible status/errors. Credentials enable checksum backups; otherwise status says local only.
- Explicitly reviewed source hashes enable policy/action-EV training data and optional public uploads.
  Review is source-specific. A successful extraction is not independent accuracy approval.
- A separate flop-library policy/value candidate trainer uses 100/20/20 distinct train/validation/test
  board groups before training. Suit-equivalent flops and all matchups on the same board remain in the
  same split. Candidate checkpoints record validation/test errors and never activate automatically.
- Backend public catalogue/question routes under `/scroll/library`, authenticated publication under
  `/admin/scroll/library/publish`, subject to the default-closed release switch.

## First laptop: inventory and extract today

After updating the stopped laptop, replace the library path with the actual local source directory.
Do NOT point this at the old failed full-hand input directory.

```bash
cd ~/flipup-laptop-rebuild
git pull --ff-only
FU_LIBRARY_SHARDS=1 bash gto/scripts/scroll_laptop.sh library-pack fast "$HOME/flops" today1
```

This single-laptop command covers the whole library. The existing heads-up NPZ library is required;
if it currently exists only on Fly, configure the existing private flop download tools first. The Fly
infrastructure token is not the laptop upload/download token. No approval or publication is implied.

Watch progress without restarting:

```bash
python3 gto/scripts/scroll_dashboard.py --root "$HOME/flipup-library-data/today1/fast"
```

Questions and statuses live under that output root. This operation can be far lighter than solving,
but throughput depends on actual library size/storage; no hand-count or finish-time promise is made.

## Two laptops / training

With the same complete library available on both machines, omit `FU_LIBRARY_SHARDS=1`: run
`library-pack fast PATH today2` on the fast laptop and `library-pack slow PATH today2` on the slow
laptop. They take complementary file shards. On initial extraction, both remain private.

Review actual outputs and source settings first. `review-candidates.json` deliberately contains
`rangeAndModelReviewed: false`. It is an inventory, not a validation certificate. A reviewed plan
contains the exact accepted source SHA list and `rangeAndModelReviewed: true`; do not blanket-approve
all files simply to bypass the gate. A changed review needs a new run directory/name.

For a reviewed campaign, set `FU_LIBRARY_REVIEW` to that plan. `FU_LIBRARY_TRAIN=1` runs candidate
training after extraction. Install PyTorch with the existing `setup-models` command first.
`FU_LIBRARY_PEER=library-RUN-fast` can pull the fast laptop's checksum-verified training data before
the slow laptop trains. Peer upload credentials and a completed fast backup are prerequisites.
Rerunning the same command resumes extraction and can pick up new peer data. This is a finite batch
workflow, not an always-running training scheduler. It never promotes a model automatically.

`FU_LIBRARY_PUBLISH=1` enables uploading reviewed questions after extraction; deploy the new backend
and explicitly review/open its publication switch first. Private backups are separate from publication.

## Delivery boundary still to finish

The library exports `library-question-v1`, with correct limited-tree provenance. The original animated
quiz expects complete `QuizHand` replays; the newer scenario screen expects full-tree quality fields.
Neither can consume this source honestly by renaming its schema or inventing a hand ending. The final
data adapter depends on which existing player is intended. The UI/layout stays unchanged; do not claim
new questions appear in the app until that adapter is implemented and tested against the chosen player.

Current library solves often simplify future streets; they are not relabelled full-future GTO. After
the flop extraction is validated, use the existing reached-range adapter to produce later-street
studies separately. Keep multiway and larger game profiles outside this heads-up importer.

## Today's checkpoints

1. Finish WSL/resource setup, locate/download the library, run the extraction and inspect real status.
2. Check representative boards, matched source settings, precise frequencies/EVs and useful feedback.
3. Resolve the existing-player adapter, test it without changing visuals, then publish a small reviewed batch.
4. Export the same reviewed teacher data; use the slow laptop for candidate network training/evaluation.
5. Add turn/river studies and multiway only after their own input/quality checks. No giant-tree retry loop.
