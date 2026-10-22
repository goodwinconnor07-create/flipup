# Findings from the baseline study

Evidence: `baseline.md` (20,000 hands over 113 sessions on development seeds, plus a 4,200-hand re-run and a 4,000-hand
3-bet probe with a second set of counters). Intervals are 95% bootstrap intervals over sessions unless a count is quoted,
and "[a, b]" always means that interval. Counts of spots are given so you can see how thin some of this is.

Status after the confirmation run (fresh seeds, `report.md`): findings 1 (partly), 3, 4, 5 and 8 reproduced; 2 was not re-run;
7 flipped sign and is inconclusive; 6 and 10 were not re-measured.

Ranked by how sure we are and how much it matters. "Bug-like" means a behaviour no personality is meant to have.

## 1. Bug-like: choice noise can fold a hand that is far ahead of the price (fixed in round 1)

**What happens.** After the flop a bot scores each option in chips, then picks with a softmax whose temperature is
`wobble × pot` (`postflop()` in `botPlay.ts`). In a big pot the noise is big in chips too, so a clearly right call can lose
the draw. The style's own leanings stack on top: nervous has `wobble` 0.3, `sticky` −0.45 pots and `scared` 2.4. The one guard
against this, "nobody folds the near-nuts", only applies when the bot's equity against the range it imagines is over 0.92.

**Evidence.**
- Strong hands (two pair or better) folded to a bet of at most half a pot: nervous **9 of 53 spots, 17% [10, 24]**.
  The other nine styles: 0 to 2 of 22 to 113 spots each (pro 1/38, shark 1/34, tag 0/32, lag 1/53, trapper 0/41, rock 0/22,
  station 0/113, gambler 1/84, maniac 2/101).
- Representative hand (nervous holds a full house and folds, getting 65-to-1; it loses 95 bb in the hand):

```
dev-full9-bots-5, hand 348, 100bb deep, blinds 5/10
Seats: brain:Iggy [trapper] Ad Qd; Mags [trapper] 4h Qs; Kiki [station] Th 3d; Yuki [pro] 8d 2d; Remi [rock] Ah 8c; Pia [nervous] 9h 9c; Ora [shark] Kd 2c; Ned [nervous] 5h 4c; Hana [gambler] 2s Jh
Board: 9s 7s 7d 5d Td

preflop: Remi fold (facing 10 into 15); Pia raise to 20 (facing 10 into 15); Ora fold (facing 20 into 35); Ned fold (facing 20 into 35); Hana fold (facing 20 into 35); brain:Iggy raise to 75 (facing 20 into 35); Mags fold (facing 75 into 110); Kiki fold (facing 70 into 110); Yuki fold (facing 65 into 110); Pia call to 75 (facing 55 into 110); 
flop: Pia check (pot 165) [monster]; brain:Iggy bet to 100 (pot 165) [weak]; Pia call to 100 (facing 100 into 265) [monster]; 
turn: Pia check (pot 365) [monster]; brain:Iggy bet to 125 (pot 365) [draw]; Pia call to 125 (facing 125 into 490) [monster]; 
river: Pia bet to 650 (pot 615) [monster]; brain:Iggy allin to 680 (facing 650 into 1265) [monster]; Pia fold (facing 30 into 1945) [monster]; 
Net (bb): brain:Iggy 96.5, Mags 0.0, Kiki -0.5, Yuki -1.0, Remi 0.0, Pia -95.0, Ora 0.0, Ned 0.0, Hana 0.0
```

- A second one, less extreme: a nervous bot folds a made straight on the river to a half-pot bet (price 25% of the final pot):

```
dev-full9-one-archetype-5, hand 227, 100bb deep, blinds 5/10
Seats: timid [timid] 3h Qd; Pia [nervous] 5h Kc; Tex [maniac] 8h 7d; Leo [pro] Jd 2d; Ora [shark] 3d 2h; Kiki [station] Js 3c; Rex [maniac] Jh 3s; Tess [tag] Th 9h; Dot [nervous] 9s 6h
Board: 9d 8d Tc 7c Ad

preflop: timid fold (facing 10 into 15); Pia fold (facing 10 into 15); Tex fold (facing 10 into 15); Leo fold (facing 10 into 15); Ora fold (facing 10 into 15); Kiki fold (facing 10 into 15); Rex fold (facing 10 into 15); Tess call to 10 (facing 5 into 15); Dot check (pot 20); 
flop: Tess bet to 15 (pot 20) [strong]; Dot call to 15 (facing 15 into 35) [mid]; 
turn: Tess bet to 25 (pot 50) [strong]; Dot call to 25 (facing 25 into 75) [monster]; 
river: Tess bet to 50 (pot 100) [strong]; Dot fold (facing 50 into 150) [monster]; 
Net (bb): timid 0.0, Pia 0.0, Tex 0.0, Leo 0.0, Ora 0.0, Kiki 0.0, Rex 0.0, Tess 5.0, Dot -5.0
```

- The mechanism was reproduced in a unit test that rebuilds that river with the full house. Over 1,000 seeds the baseline code
  folds it **5.9% of the time as the nervous bot, 3.2% as the pro, 0.7% as the maniac and the gambler**; the candidate never does.
  (The pro folds it too because the GTO mix is blended in after the noise, and that mix does not know the price.) The test is
  `bot blunders and table size` in `src/game/bots.test.ts`; on the baseline code it fails at seed 47.

**Why it matters.** A human sees a bot fold a full house for 30 chips into 1,945 and concludes the bots are broken, not nervous.
Nothing about "nervous" requires this.

**What was preserved.** The nervous bot still folds to pressure (fold to bet 55% in the baseline, 57% with the fix) and still
bets small; the fix removes only folds where the price of the call is under a third of the hand's chance of winning (and the chance is over one half).

## 2. Not reproduced: bots folding to 3-bets

The report that "99% of the time all of them fold" to a 3-bet was **not** reproduced. In the 3-bet probe (a clean 3-bettor,
3.5× the raise, about 24% of its hands, six- and nine-handed, 100bb, 4,000 hands):

| Who answers | Spots | Fold | Call | 4-bet |
|---|---|---|---|---|
| The player who opened (the 3-bet is aimed at them) | 312 | 44% [38, 49] | 38% [32, 43] | 19% [15, 24] |
| Everyone else, facing a raise and a 3-bet | 986 | 71% [68, 74] | 17% [15, 20] | 12% [10, 14] |

By style (openers only, 15 to 50 spots each, so each is rough): maniac 21% fold, gambler 23%, station 32%, tag 34%, nervous 40%,
lag 50%, rock 53%, trapper 60%, pro 64%, shark 65%. The folds from players with nothing to do with the hand are what a 3-bet
should get. The probe's 3-bettor lost 59 and 38 bb/100 at the two table sizes, so a 3-bet frequency of about a quarter does not pay
against these bots.

What this does not cover: other 3-bet sizes (only 3.5× was tried), bluff-heavy 3-bets in position against a late-position
opener, and the possibility that the build that was played differs from this commit. A hand history from the table where it
happened is the quickest way to close this.

## 3. Not reproduced: "most hands end in folds or check-arounds"

Nine-handed with eight bots (3,000 hands, 100bb): 69% of hands see a flop, 37% reach a showdown, 22% are raised pots with three
or more players, **5% are checked on every street** and 6% see a flop with no raise before it. The average bot VPIP at those
tables is about 28%, so six or seven of nine folding before the flop is ordinary poker at that looseness; it is not a bug.
Six-handed the same bots see a flop 53% of the time.

If the real tables feel different, the likeliest cause is the sample of bots (a table with several rocks, nervous bots and tags looks
very passive) or a human seat that folds most hands, which the lab does not reproduce.

## 4. Design flaw, partly fixed: tight styles ignore the table size (round 3)

`tight` is a cutoff on a share of all hands (rock 0.87, tag 0.72, trapper 0.66), applied the same at any table size. VPIP
at 9 / 6 / 2 players (100bb):

| Style | 9 | 6 | 2 (heads-up) |
|---|---|---|---|
| pro | 23% | 35% | 55% |
| tag | 22% | 24% | 25% |
| trapper | 21% | 23% | 27% |
| rock | 14% | 17% | 19% |

A heads-up rock folds four hands in five from the small blind. That is exploitable, not charming, and it is what the user
sees when a bot game is played heads-up. Intentional: the tight styles are meant to be tight. Not intentional: that they are
equally tight whatever the table size, when the unstyled styles (pro 23% to 55%) adjust sensibly.

## 5. Observation, not changed: the four bots of a style are clones, and some families are close

There are no per-bot settings. "Max", "Rex", "Tex" and "Ziggy" play identically. Measured on ten observable stats (VPIP, PFR, 3-bet,
aggression, fold to bet, c-bet, showdown rate, bluff share, bet size, limp), the closest pair of styles is **pro and shark at 0.30,
which is the same size as the noise between two halves of the same data (0.28)**. Tag, trapper and nervous sit about 0.4 to 0.6
from them. The strongest differences are between the loose styles and everyone else. `pro` and `shark` differ mostly in how
fast they adapt (`adapt` 0.5 versus 0.85) and shark's slightly more aggressive and bluff-prone settings, which this stat set cannot
see. This is a design question for the owner, not a bug; no change was made.

## 6. Weak evidence: still bluffing the calling station

Heads-up, checked to, with air or a weak hand, bots bet less against the station than against everyone else: pro 29% against 51%
of spots, shark 10% against 54%, trapper 18% against 40%, rock 14% against 47%, lag 38% against 70%. So there is an adjustment.
Tag (50% of 22 spots, only 18% of bluffs worked) and nervous (39% of 46 spots, 11% worked) barely adjust. The number of spots is
small and these are single-digit sessions, so this is a lead for a future study, not a finding.

## 7. Weak evidence, underpowered: the field does not clearly beat three of the seven scripts

Bot seats' results against each archetype (bb/100, bots' side, 95% bootstrap over sessions). Heads-up (600 hands each) and the
archetype's own result in 9-handed tables (1,600 hands each):

| Archetype | Bots heads-up | Archetype, all tables |
|---|---|---|
| casual | −49 [−200, 91] | −109 [−194, 58] |
| station | **+109 [66, 152]** | **−303 [−451, −124]** |
| tight-passive | +20 [−2, 38] | +15 [−41, 78] |
| bluffer | +45 [−41, 133] | **−244 [−350, −64]** |
| value bettor | −32 [−101, 46] | +35 [−42, 122] |
| timid | **+57 [46, 67]** | −25 [−55, 2] |
| aggressive | −131 [−288, 11] | +133 [−83, 413] |

The straightforward value bettor, the aggressive raiser and the casual script are not clearly beaten, but none is clearly ahead
either. Round 2 saw the aggressive script fall from +194 to −18 bb/100 (difference −212 [−409, −39]) once tight bots stopped folding heads-up; round 3 (the
smaller change) did not reproduce that (+131 to +146), so treat it as a hint.

## 8. Extreme behaviour, not changed: bot-only tables run hot

Nine-handed with random styles: 19 to 24% of hands have an all-in, 38 to 41% contain a 3-bet, and the average pot is 87 to 102 big
blinds. This is driven by the maniac/lag/gambler mix (maniac 3-bets 25% of the time, VPIP 52%) and is "by design", but it is far
from a pub game, and it does not match the original report of passive, fold-heavy tables. It is the first thing to look at in a
human playtest.

## 9. Checked and fine

- **Legality and chips.** 0 chip leaks and 0 illegal moves in 20,000 hands (scripts and the host seat included).
- **Speed.** 9-handed: 6.4 ms mean per step that produced an action, 99.9% under 20 ms, slowest 84 ms. HU and short tables: 1.5 to 3 ms.
- **Reaction to table size** for the unstyled styles (pro 23% → 35% → 55% VPIP as players leave).
- **Short stacks.** First-in shoves at 13bb or less: rock 16%, pro 23%, station 27%, gambler 43%, in the order the styles suggest.
- **Pairing works.** The same chance seed dealt identical cards in all 100 hands with a different decision seed, and 70 of 70 re-run
  sessions came out identical after the counters were extended.

## 10. Looked at, not understood: the nervous bot bets with nothing often

Bluff share of postflop bets (air or weak hands): nervous 46% [42, 50], the same as lag (45%) and above pro/tag (35–37%), though
nervous bets small (0.51 of the pot) and is described as timid. Its `wobble` of 0.3 is the likely reason (random small stabs).
The price floor did not change it (43% to 40%, not significant), so it is a separate question.

## Not measured, because the simulator cannot say

- Whether any of this is fun, or whether the difficulty suits a given person.
- Tilt dynamics (mood states are not recorded; no sign of a runaway loop in session results, but that is indirect).
- Whether the host seat in the lab, which plays a bot brain without moods, matches a real person's seat (it matters only for
  the host's own results, which are never used for bot statistics).
