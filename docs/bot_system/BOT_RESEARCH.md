# Guided bot research in the mobile browser

Open **Settings → Bot research**, or visit `/#bot-research` on the web app. This is a separate research session using the current live Casual bots and production Hold’em rules. It never replaces an ordinary saved table or changes normal statistics or Range trainer lessons.

Choose 12, 60 or 120 hands. The default 60-hand session is approximately an hour; actual time depends on your pace. There is no time requirement. Play naturally and use any legal action, including a custom bet/raise size. Pause whenever you want. The browser resumes the last saved hand after a reload, initially paused.

## The session

Half the planned session is assigned to five research situations in equal blocks (rounded down); the remaining hands form a continuous six-seat table:

| Situation | What it helps us review |
| --- | --- |
| Heads-up position | Checked-to decisions, value sizes and pot control |
| Raised multiway pot | An open and two cold calls before your button decision; squeezes and multiplayer restraint |
| Draw-heavy board | Drawing prices, completed draws and missed draws |
| Changing board | Revising a plan when the turn changes the public board |
| Unequal stacks | Short stacks, commitment and side-pot decisions |
| Continuous table | Natural repetition, individual reads, temporary session dynamics and bot-versus-bot adaptation |

Study hands select a board category and/or stack arrangement. Where necessary, a short **labelled preflop setup** establishes the situation. It is visible in Hand history and excluded from measured bot-choice counts. All decisions after setup are free decisions by you or the same live bot service used in ordinary play. Later cards vary by seed; the participant sees no future cards or bot reasoning during play. None of this deal conditioning applies to regular games.

Each targeted hand starts a fresh table cast. The continuous segment keeps one cast, its separate per-bot memories, normal random deals, changing stacks and explicit rebuys after busting. Bots have the same strict information boundary as normal: their own cards and memory, plus everyone’s public actions. There is no research scenario label, master roster or opposing profile in their decision input.

## Giving useful feedback

Use **That felt odd** to mark a hand. After a hand or while paused you can leave a short note and optionally rate believability and enjoyment. A simple note such as “kept folding after I checked” or “that raise felt sensible” is enough. Save feedback, or proceed to the next hand to save it with that transition. There is no answer key and no need to explain every move.

**Pause & upload** saves the current position and uploads completed hands. Completed hands also upload automatically as you play. A partial hand stays on the phone until it finishes. You can stop after any number of hands and review that partial session.

On the paused screen, check **saved** versus **uploaded**, then use **Copy private review link**. Send that full link in the chat when you want a review. Uploading does not automatically start an AI review. The reviewer can examine the saved actions, private bot decisions and notes, then replay decisions with the recorded engine release. Download saved hands provides a JSON fallback when a server or reviewer connection is unavailable. Previous sessions also offer upload retry and local download.

## Sharing from a phone without a file attachment

Open the existing private report link and use **Copy review packet**. Paste the text into the chat. Large reports
have numbered parts: copy and paste each part from the same report copy. The selectable text is a fallback when
the browser denies clipboard access. No new hands or uploads are required for this option.

The default packet retains every completed hand, action history, note/rating, bot decision context and chosen
explanation. It includes legal options, current stacks, visible cards, model choices and rounded scores/probabilities.
Private pre-hand memories and undealt cards are omitted to reduce the amount to paste. This is sufficient for
behavioral review; exact decision replay requires the optional **Full data for exact replay (larger)** copy, which
preserves the complete original report.

Both copies are compressed with gzip and encoded as text. Each part carries its number, part count, hand count
and SHA-256 checksum of the original JSON. Reconstruction rejects missing, duplicated, mixed or corrupted parts.
The fallback for browsers without CompressionStream is uncompressed base64. Parts carry up to 24,000 data
characters; decompressed reports are bounded to 64MiB. The bearer key and private URL are excluded. Research
records remain private hand data and should only be pasted to the intended reviewer.

```sh
npm run bot:unpack-research -- part1.txt part2.txt --out /tmp/research.json
# Only a full replay copy can be replayed through the original review command:
npm run bot:review-research -- /tmp/research.json /tmp/research-review.json --replay
```

The unpacker identifies whether the result is a smaller review copy or a full report. Review copies contain
`summary` and all projected `hands` for inspection. A 40-hand synthetic transport check containing 262 bot decisions
reconstructed without loss to the review projection in four parts; the full report required eleven parts. These
are transport tests, not the participant's actual dataset.

## Storage, privacy and recovery

IndexedDB stores each accepted action and its checkpoint before the UI advances. Finished records and their checkpoint are committed together. A revision check prevents another tab from silently overwriting the session. Upload acknowledgement is separate from play state; delayed acknowledgements cannot mark newer notes as uploaded. Uploads use revisioned, idempotent hand slots and resume on reconnection or retry. An incompatible saved engine release pauses resumption rather than silently switching policies; archived records remain downloadable.

Only research data is sent: synthetic seat identities, selected deals, actions, active timing, optional notes/ratings, decision inputs and private bot decision records. The replay checkpoint necessarily includes bot cards and memories, but is uploaded only after the hand finishes and never rendered during live decisions. The real profile name, device identity, ordinary game history and chat are not included.

Each server session has a random UUID and a 256-bit bearer key. The share link keeps that key in its fragment; the client sends it in an Authorization header, and the server stores only its SHA-256 hash. There is no public session listing. Anyone receiving the private link can access the dataset, so it should be shared deliberately. The authenticated DELETE endpoint removes the server session. Server storage expires after 30 days using a Durable Object alarm; local copies remain until site data is cleared. The updated privacy page discloses this opt-in collection.

Hand records are limited to 1MiB and 500 actions/decisions each, with at most 120 hand slots per session. SQLite stores the hand rows; report downloads are paginated to avoid loading an entire session into Worker memory. Rate limits apply to creation and requests. A failed upload leaves the local record intact.

## Review and reproducibility

```sh
npm run bot:review-research -- '/path/to/download.json' /tmp/research-review.json --replay
npm run bot:review-research -- 'https://YOUR_APP/#bot-research=ID.KEY' /tmp/research-review.json --replay
npm run bot:research-check -- /tmp/research-runner-validation.json
```

The review command reports scenario coverage, measured human/bot decisions, scripted setup counts, action mixes, explanations, supported-choice checks, optional ratings and annotated hands. `--replay` reconstructs each free decision from its private pre-play checkpoint and checks action distributions and results against the recorded engine. Replay requires the recorded release; `RESEARCH_ENGINE` must change when the live policy changes. The release identifier currently pins the `human-table-1` policy fingerprint documented in [the live experience release](LIVE_HUMAN_TABLE.md).

The [120-hand runner check](benchmarks/research-runner-validation.json) is an automated check/call participant, explicitly labelled as such. It tests long-session memory, replay, chip accounting, payload size and explanation coverage. It supplies no human ratings and is not human-realism evidence.

This research provides detailed observations from one participant in deliberately selected situations. It cannot establish population retention, an unbiased win rate or universally human-like play. Notes and whole-session patterns help prioritize fixes; selected deals and participant-uploaded records are never automatic model-promotion evidence.

Release validation: 1,092 root tests across 67 files, root typecheck/build, 83 native tests, native typecheck/lint (0 errors; 19 existing warnings), and 10 browser tests passed. Browser coverage includes offline recovery, notes and ratings, private access, uploads above 128KiB, revision conflicts, pagination, deletion, two-tab conflict detection, ordinary bot games, BOT_001 and settings. Screens were inspected at 320px and 390px without horizontal overflow. Both local-file and private-server CLI review paths were exercised with exact replay. The 120-hand automated run replayed 935 bot decisions without a mismatch; its largest upload was 169,814 bytes.

Web delivery uses the existing Cloudflare GitHub build connection on `main`. The manual Deploy workflow is an alternative. No native app build is needed for this browser-only entry. Direct production verification from a development environment requires network access to the app hostname; a private JSON download remains a review fallback if a reviewer cannot reach that host.

Mobile copy follow-up validation: 1,096 root tests across 68 files and all three research browser tests passed.
Tests copy both review and full packets through the browser clipboard, decode notes and decision records, replay
full checkpoints, detect missing/mixed/corrupt parts and exclude the private access key. The report copy controls
were inspected at 320px with no horizontal overflow. The participant's uploaded hands remain unchanged.
