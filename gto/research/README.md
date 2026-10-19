# Research notes

Background reading behind the engine. Each file cites its sources; claims that couldn't be
verified are flagged inline.

| file | what's in it |
|---|---|
| [01_gto_algorithms_and_papers.md](01_gto_algorithms_and_papers.md) | Nash equilibrium and exploitability; the CFR family (CFR, CFR+, Linear/Discounted CFR, Predictive CFR+, MCCFR) with update rules and parameters; card and action abstraction, the pseudo-harmonic action translation; safe/nested subgame solving, DeepStack, ReBeL, Student of Games; Pluribus; solver engineering tricks (suit isomorphism, vectorized range-vs-range CFR, O(n) showdowns); grading mistakes by EV loss. |
| [02_practical_gto_strategy.md](02_practical_gto_strategy.md) | The poker side: pot odds, MDF, alpha, value-to-bluff ratios, geometric sizing, SPR; 6-max preflop charts and sizes, 3-bets, BB defense, 4-bets, limping; postflop range/nut advantage, c-bet patterns by board, polarization, blockers, overbets; amateur leaks with data; how GTO Wizard grades decisions; multiway and home-game adjustments; stack depth; heads-up. |
| [03_solver_implementations.md](03_solver_implementations.md) | How b-inary/postflop-solver, TexasSolver, wasm-postflop and GTOpen work inside (tree rules, CFR variants and their exact constants, chance nodes and card removal, showdown and fold evaluation, isomorphism, best response, EV/equity/EQR reporting), plus a recommended design. |

## Our own studies

Run with the scripts in `../scripts/`; results are summarized in [../docs/GTO_PLAYBOOK.md](../docs/GTO_PLAYBOOK.md).

| script | question |
|---|---|
| `calibrate_eqr.py` | How much of their equity do hands actually realize postflop (BTN vs BB single-raised pot)? Fits the preflop solver's realization model. |
| `flop_study.py` | How does GTO play single-raised pots across board textures (c-bet frequency and size, BB leads and check-raises, which hand types bet)? |
| `river_study.py` | Does GTO's river betting follow the textbook value-to-bluff ratios and MDF? |

## A note on sources

Most material is from papers (arXiv, AAAI/NeurIPS/IJCAI, Science), solver documentation and
coaching sites (GTO Wizard, Upswing, PokerCoaching, Run It Once). Video content wasn't accessible
from the research environment, so coaching videos are represented only through their written
counterparts.
