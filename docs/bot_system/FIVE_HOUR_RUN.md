# Five-hour improvement run

The owner's requested run is bounded to 300 minutes after the runner starts. It continuously calibrates the existing context-sensitive river learning parameters, evaluates candidate configurations, and saves checkpoints and full-poker matchup results. It also saves internal range examples and periodically checks the one-street planner against the frozen previous version.

From [baseline-7](MULTIPLAYER_V7.md), the periodic comparison covers multiplayer planning, hand continuity and the realism auditor against frozen baseline-6. `BOT_IMPROVE_REALISM_HANDS=1000` increases its first comparison to 24,000 hands; later monitoring stays smaller. Both remain inside the same overall deadline. A source upgrade can retain the unchanged synthetic learner's atomic checkpoint while keeping old-model poker reports separate and preserving the original remaining time.

This is automated training and evaluation, not an unattended coding agent. It cannot invent and implement new features after the chat ends. It does not change production weights, the deck, bot personalities, difficulty or the trainer's answer review. The candidate configuration and saved failure cases provide concrete material for the next development pass.

```sh
npm run bot:improve -- 300 /tmp/flipup-five-hour-run
```

Use a new output directory for every run; existing results are never overwritten. A sub-five-hour value can be used for a smoke check. The runner rejects durations above 300 minutes. Each training batch resumes its own atomic checkpoint and advances the cycle number, using disjoint cycle-specific training and validation seeds. Synthetic held-out results and fresh full-poker comparison seeds are recorded after each batch and do not choose the next candidate. Periodic planner comparisons intentionally reuse fixed regression seeds; repeated passes are monitoring rather than additional independent evidence.

`status.json` records the process ID, start, deadline, heartbeat, completed cycles, latest candidate, phase reports and any error. Every completed training report is archived separately. `training/checkpoint.json` survives an interrupted batch. At the deadline the runner terminates its active child, allows five seconds to shut down, and then force-stops it if necessary. SIGINT/SIGTERM cancel the run and preserve its status. A failed experiment stops the run with logs; it never promotes a failing candidate.

The [workflow](../../.github/workflows/bot-improvement-five-hours.yml) runs on a push changing the explicit [request file](../../.github/bot-improvement-request.json), or manually through Actions. It checks out the triggering commit, has read-only repository permissions and a 330-minute job limit covering installation, the 300-minute experiment and artifact upload. Status, logs, checkpoints and results are uploaded for 30 days, including on failure. This one-shot workflow is separate from the existing daily experiments.

This environment's GitHub workflow API currently returns Forbidden, so a push alone cannot be treated as verified execution. A locally launched fallback should use a detached, pinned checkout so later source edits cannot change an active experiment. A local run continues only while its cloud execution environment remains alive; GitHub Actions provides the durable workflow when enabled. Do not report either run as started without observing its status or process.
