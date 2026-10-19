# Wiring the GTO backend into the FlipUp app

The GTO backend is a Python service (`flipup_gto.api`) with a C++ core. The app sends it finished
hands; it sends back, for every decision, what GTO does with that hand, the EV of each option, what
the player's choice cost, a grade, and plain-English reasons.

```sh
cd gto
pip install -r requirements.txt
cmake -S engine -B build && cmake --build build -j
uvicorn flipup_gto.api:app --host 0.0.0.0 --port 8000
```

The service is CPU-bound: preflop answers are instant once a table size and stack depth have been
solved (cached on disk), but every hand that reaches a heads-up flop needs fresh postflop solves
(roughly 1 to 5 minutes on 4 cores). Review a session as a background job and show results as they
arrive.

## Sending hands

### Option A: the structured format (recommended)

`POST /review/hand` with `{"hand": HandHistory, "hero": "<player id>"}` for one hand (synchronous), or
`POST /review/session` with `{"hands": [HandHistory...], "hero": ...}` for many (returns a job id).

```json
{
  "id": "ABCDE#17",
  "small_blind": 1, "big_blind": 2, "ante": 0,
  "button": "p3",
  "players": [
    {"id": "p1", "name": "Ollie",  "seat": 0, "stack": 200, "cards": ["Ah", "Kd"]},
    {"id": "p2", "name": "Connor", "seat": 1, "stack": 340, "cards": null}
  ],
  "actions": [
    {"street": "preflop", "player": "p1", "move": "raise", "to": 6},
    {"street": "preflop", "player": "p2", "move": "call",  "to": 6},
    {"street": "flop",    "player": "p2", "move": "check"}
  ],
  "board": ["Ks", "9d", "5c", "2h", "Qh"]
}
```

- `stack` is the player's chips at the start of the hand, before blinds. Blinds and antes are posted
  automatically, so don't list them as actions.
- `to` is the player's total bet on that street after the action, the same number FlipUp logs
  ("bets 40", "raises to 120", "calls 120", "goes all in for 300").
- `move` is one of `fold`, `check`, `call`, `bet`, `raise`, `allin` (FlipUp's `Move` type).
- `cards` is `null` for players whose cards the requester may not see. Only players with known
  cards get reviewed. Pass `hero` to review just one player.

This maps directly onto `Hand` in `src/game/types.ts`. Recommended change on the app side: add a
structured `actions: {street, playerId, move, to}[]` array and start-of-hand `stacks` to `HandLog`,
next to the existing `lines`.

### Option B: FlipUp's current `HandLog` as is

`POST /review/flipup` with
`{"logs": [HandLog...], "players": [{"id","name","seat"}], "small_blind": 1, "big_blind": 2, "hero": "<id>"}`.
The backend parses the log lines (`-- Hand #n (dealer: X) --`, `Stacks: ...`, `X raises to 6`, ...).
Player names must be unique at the table. Option A is sturdier.

### Jobs

`GET /jobs/{id}` → `{"status": "running" | "done" | "error", "progress": 3, "total": 40, "result": ...}`.
When done, `result` is `{"hands": [HandReport...], "session": SessionSummary}`.

## What comes back

### HandReport

```json
{
  "hand_id": "ABCDE#17",
  "players": {"p1": {"position": "BTN", "name": "Ollie"}},
  "board": ["Ks", "9d", "5c", "2h", "Qh"],
  "summary": {"decisions": 4, "graded": 4, "total_ev_loss_bb": 0.62,
              "grades": {"best": 2, "correct": 1, "inaccuracy": 0, "mistake": 1, "blunder": 0},
              "worst": {"street": "turn", "action": {"move": "check"}, "best_action": "bet 75%", ...}},
  "decisions": [Decision...],
  "notes": ["Preflop compared with a 100bb solution (effective stack 92bb)."]
}
```

### Decision (one per action by a reviewed player)

| field | meaning |
|---|---|
| `street`, `position`, `hand`, `board` | where we are |
| `pot_bb`, `to_call_bb`, `effective_stack_bb` | pot before the action, price to continue |
| `action` | what they did: `{"move": "call", "to_bb": 6.0}` |
| `matched_action` | the solver action it was matched to (exact for postflop, nearest size preflop) |
| `gto` | every option: `{"action": "bet 75% (4.13)", "frequency": 0.62, "ev_bb": 3.41}` — `frequency` is how often GTO takes it **with this exact hand**; `null` when GTO's range wouldn't hold the hand here |
| `best_action` | the highest-EV option |
| `ev_loss_bb`, `ev_loss_pct_pot` | EV given up versus the best option (0 if they chose it) |
| `grade` | `best`, `correct`, `inaccuracy`, `mistake`, `blunder` (see below), or `null` if not graded |
| `equity` | showdown equity of the hand against the opponent's range at that point |
| `hand_features` | `{"made": "Top pair, good kicker", "draws": ["flush draw"], "blockers": [...]}` |
| `board_texture` | e.g. `["King-high", "two-tone (flush draws)", "connected", "wet"]` |
| `range` | range vs range context: both players' equity, share of strong hands (two pair+), and GTO's whole-range frequencies here |
| `method` | `preflop_solver`, `postflop_solver`, `heuristic` (multiway or off-tree spots), `not_graded` |
| `explanation` | list of plain-English sentences, ready to show |

Preflop EVs are measured from the start of the hand (folding preflop as the BB is −1bb). Postflop
EVs are "bb won from here on" (folding is always 0). Differences between options are what matter.

### Grades

Graded on EV loss as a share of the pot, so picking any option GTO mixes at the same EV never counts
as a mistake:

| grade | rule |
|---|---|
| best | the top-EV action (within the solver's tolerance) |
| correct | loses ≤ 0.5% of the pot, or GTO plays it at least 3.5% of the time and it loses ≤ 1% |
| inaccuracy | loses ≤ 2.5% of the pot |
| mistake | loses ≤ 8% of the pot |
| blunder | loses more |

Every graded decision also carries a traffic-light `colour` (what the app shows) and a
`colour_reason`:

| colour | rule |
|---|---|
| green | best or correct; also a bet or raise at a different size, within 25% of the pot of a size GTO uses at least 20% of the time with this hand, that loses ≤ 1.5% of the pot ("close enough sizing") |
| yellow | inaccuracy; or the right aggressive action at the wrong size, losing ≤ 5% of the pot |
| red | everything else |

### Coaching fields

Each reviewed decision also has:

| field | meaning |
|---|---|
| `scenario` | the spot type (`rfi`, `vs_3bet`, `cbet_ip`, `vs_checkraise`, `vs_double_barrel`, ...), used for stats and to pick a library drill |
| `lesson` | `[{title, body: [sentences]}]` sections: The spot, Ranges, Your hand, The math (pot odds, MDF, SPR, fold equity), What GTO does, Verdict |
| `practice` | 2–3 similar hands from the same solved spot, each with GTO's frequencies and EVs, for a "what would you do?" quiz |
| `grid` | `{class: {"weight": reach, action: frequency}}`: the acting player's whole strategy for a 13×13 grid |
| `spot_text`, `spr`, `villain_folds` | a one-line summary, stack-to-pot ratio, and how often the opponent folds to each bet size |

`summary.colours` counts green/yellow/red over the hand.

### SessionSummary (the "big hand log")

```json
{
  "hands": 120, "decisions": 410, "graded": 388,
  "grades": {"best": 201, "correct": 97, "inaccuracy": 41, "mistake": 38, "blunder": 11},
  "total_ev_loss_bb": 61.4, "ev_loss_bb_per_100_hands": 51.2,
  "by_street": {"preflop": {"decisions": 180, "ev_loss_bb": 12.0}, "flop": {...}, ...},
  "leaks": [{"leak": "Calling where GTO folds", "count": 14, "ev_loss_bb": 22.1,
             "streets": {"preflop": 6, "river": 8}}, ...],
  "worst_decisions": [{"hand_id": "...", "street": "river", "hand": "Qc Js", "action": {...},
                       "best_action": "fold", "ev_loss_bb": 9.5, "grade": "blunder"}, ...]
}
```

## Custom hands

`POST /analyze` takes the same body as `/review/hand` and returns a job. It differs from a review in
three ways: every player's decisions get a strategy `grid` (players without known cards get
grid-only entries with `gto_range`, GTO's whole-range frequencies), off-tree heads-up flops get
ranges from a forced-line solve, and if the hand stops mid-street the next decision is added with
`"pending": true` ("what to do now").

## Poker library

- `GET /library`: the scenarios: `[{id, group, title, description, available, spots}]`. Preflop
  drills come from the solved preflop game; postflop ones from spots precomputed by
  `scripts/build_library.py` into `flipup_gto/data/library/*.json`.
- `GET /library/{scenario}/drill?seed=123`: one drill: position, history, board, pot, the dealt
  hand, the options, and `answer.options[]` with each option's GTO frequency, EV, EV loss and
  colour, plus `tips` and the range `grid`. Preflop drills only use lines GTO actually plays (every
  raise in the line at least 2% of the range).

## The app's proxy

The Worker forwards `/api/gto/*` to the service at `GTO_URL` (a Wrangler var; empty means the
coach shows "isn't connected yet"). For local work put `GTO_URL=http://127.0.0.1:8000` in
`.dev.vars` and run the service with uvicorn next to `npm run dev`. Set `FLIPUP_CORS` on the
service to the app's origin in production.

## Other endpoints

- `GET /preflop/chart?players=6&stack=100&path=fold,fold,raise` — strategy and EV per hand class
  (all 169) for whoever acts after that action sequence. Good for a 13×13 range grid.
- `POST /solve/postflop` — solve any spot: `{"board": "Ks9d5c", "pot": 5.5, "stack": 97.5,
  "oop_range": "...", "ip_range": "...", "path": ["check"]}`.
- `POST /equity` — `{"hand": "AhKd", "range": "QQ+,AK", "board": "Ks9d5c"}`.
- `GET /math?pot=10&bet=5` — pot odds, required equity, MDF, alpha, bluff share.

## Privacy

The backend only sees what it's sent. To stop players from learning hidden cards through the
review, send `cards: null` for any hand the requesting player didn't see, which matches FlipUp's
`redactForDevice()` rule.
