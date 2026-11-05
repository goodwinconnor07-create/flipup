// Preflop ranges for range training: the hands a player could have, given how they played before the flop. They're
// deliberately on the generous side of standard 100bb cash charts (they include the hands a good player mixes in),
// so a scenario can't give someone a hand that no sensible player in that seat would play that way. Live charts are
// looser, the way small-stakes live games play.
//
// Opening: six-handed 100bb cash, close to solver charts. The nine-handed live seats (UTG, UTG1, MP, LJ) open
// tighter, the way a tight live regular does.

import { comboKey, expandRange, type ChartKey } from './model';

export const CHARTS: Record<ChartKey, string> = {
  // ── Raise first in ──
  'UTG open': '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, ATo+, KJo+, QJo',
  'EP open (9-handed)': '22+, A9s+, A5s-A2s, KTs+, QTs+, JTs, T9s, 98s, 87s, AJo+, KQo',
  'MP open (9-handed)': '22+, A2s+, KTs+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ATo+, KJo+, QJo',
  'HJ open': '22+, A2s+, K8s+, Q9s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A9o+, KTo+, QTo+, JTo',
  'CO open': '22+, A2s+, K5s+, Q8s+, J8s+, T7s+, 96s+, 85s+, 75s+, 64s+, 53s+, A7o+, A5o, KTo+, QTo+, JTo, T9o',
  'BTN open': '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 95s+, 85s+, 74s+, 63s+, 52s+, 42s+, A2o+, K8o+, Q9o+, J9o+, T8o+, 98o, 87o, 76o',
  'SB open': '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s, A2o+, K7o+, Q9o+, J9o+, T8o+, 98o, 87o',

  // ── Big blind defence: every hand that continues (calls, or 3-bets and gets called) ──
  'BB vs late open': '22+, A2s+, K2s+, Q2s+, J4s+, T5s+, 95s+, 84s+, 74s+, 63s+, 52s+, 42s+, 32s, A2o+, K5o+, Q7o+, J8o+, T8o+, 97o+, 86o+, 76o, 65o',
  'BB vs middle open': '22+, A2s+, K5s+, Q6s+, J7s+, T7s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s, A7o+, A5o, KTo+, QTo+, JTo, T9o',
  'BB vs early open': '22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, A9o+, KTo+, QTo+, JTo',

  // ── Calling an open in position (or from the small blind), including the odd trapped big hand ──
  'Cold call': '22+, A2s+, KTs+, QTs+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo',
  'Live cold call': '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, A9o+, KTo+, QTo+, JTo',

  // ── 3-bets, and calling them ──
  '3-bet': 'TT+, AJs+, ATs, A5s-A2s, KQs, KJs, QJs, JTs, T9s, 98s, 87s, 76s, 65s, AQo+, KQo',
  'Live 3-bet': 'QQ+, AKs, AKo, AQs',
  'Squeeze': 'TT+, AJs+, A5s-A4s, KQs, AQo+',
  'Call a 3-bet': '22+, A9s+, A5s-A2s, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, 54s, AJo+, KQo',

  // ── Live iso-raises over limpers (raise bigger, play tighter: a good live regular's range) ──
  'Live iso-raise': '22+, A2s+, K9s+, QTs+, JTs, T9s, 98s, A9o+, KJo+, QJo',

  // ── Tournaments: 9-handed, 20-60bb, a big blind ante, opens of about 2.2bb ──
  'MTT open EP': '33+, A8s+, A5s-A3s, KTs+, QTs+, JTs, T9s, 98s, ATo+, KJo+',
  'MTT open MP': '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, ATo+, KTo+, QJo',
  'MTT open CO': '22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A7o+, A5o, KTo+, QTo+, JTo',
  'MTT open BTN': '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 95s+, 85s+, 74s+, 63s+, 53s+, 43s, A2o+, K8o+, Q9o+, J9o+, T8o+, 98o, 87o',
  // The ante and a small raise give the big blind a great price: it defends most hands.
  'MTT BB defend vs early': '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 74s+, 63s+, 53s+, 43s, A2o+, K8o+, Q9o+, J9o+, T9o, 98o',
  'MTT BB defend vs late': '22+, A2s+, K2s+, Q2s+, J2s+, T3s+, 94s+, 84s+, 73s+, 63s+, 52s+, 42s+, 32s, A2o+, K2o+, Q5o+, J7o+, T7o+, 97o+, 86o+, 75o+, 65o, 54o',
  'MTT cold call': '22+, A9s+, A5s-A4s, KTs+, QTs+, JTs, T9s, 98s, 87s, AJo+, KQo',

  // ── Live limped pots ──
  'Live limp': '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o+, KTo+, QTo+, JTo, T9o, 98o',
  'Any two cards': '22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J2o+, T2o+, 92o+, 82o+, 72o+, 62o+, 52o+, 42o+, 32o',
};

const cache = new Map<ChartKey, Set<string>>();

/** Whether a two-card hand is in a preflop chart. */
export function inChart(key: ChartKey, combo: [string, string]): boolean {
  const text = CHARTS[key];
  if (text === undefined) throw new Error(`No chart "${key}"`);
  if (!cache.has(key)) cache.set(key, new Set(expandRange(text).map(comboKey)));
  return cache.get(key)!.has(comboKey(combo));
}
