import type { InformationSet } from './information';
import type { OpponentRange } from './ranges';
import type { ResponsePredictor } from './multiplayerPlanning';

/** Offline specified worlds. Opposing holdings below are reference hypotheses, never live inputs. */
export function specifiedWorlds() {
  const definitions: {
    id: string;
    hole: [string, string];
    board: string[];
    opponent: [string, string];
    facing?: boolean;
    folds?: boolean;
  }[] = [
    { id: 'nuts-value', hole: ['As', 'Ah'], board: ['Ad', 'Ac', 'Kd', '2c', '5s'], opponent: ['7h', '6h'] },
    { id: 'thin-value', hole: ['Ks', 'Qc'], board: ['Kd', '9c', '4s', '2h', '7d'], opponent: ['6h', '6d'] },
    { id: 'profitable-bluff', hole: ['8h', '6h'], board: ['As', 'Jc', '9d', '3s', '2c'], opponent: ['Kd', 'Qs'], folds: true },
    { id: 'bluff-into-caller', hole: ['8h', '6h'], board: ['As', 'Jc', '9d', '3s', '2c'], opponent: ['Ah', 'Qc'] },
    { id: 'losing-call', hole: ['Kd', 'Qc'], board: ['As', 'Ah', 'Ks', '2c', '5s'], opponent: ['Ac', 'Ad'], facing: true },
    { id: 'profitable-bluff-catch', hole: ['As', 'Qc'], board: ['Ah', 'Ks', '9c', '4d', '2h'], opponent: ['Qs', 'Js'], facing: true },
  ];
  return definitions.map((d) => {
    const bet = d.facing ? 100 : 0;
    const information: InformationSet = {
      version: 1,
      variant: 'holdem',
      tableId: `specified-${d.id}`,
      hand: 1,
      sequence: 9,
      heroId: 'hero',
      buttonId: 'hero',
      street: 'river',
      bigBlind: 10,
      smallBlind: 5,
      currentBet: bet,
      hole: d.hole,
      board: d.board,
      players: [
        { id: 'hero', seat: 0, stack: 900, bet: 0, total: 100, folded: false, allIn: false },
        { id: 'opponent', seat: 1, stack: 900 - bet, bet, total: 100 + bet, folded: false, allIn: false },
      ],
      actions: [
        { street: 'preflop', playerId: 'hero', move: 'raise', to: 20 },
        { street: 'preflop', playerId: 'opponent', move: 'call', to: 20 },
        { street: 'flop', playerId: 'opponent', move: 'bet', to: 80 },
        { street: 'flop', playerId: 'hero', move: 'call', to: 80 },
        { street: 'turn', playerId: 'opponent', move: 'check', to: 0 },
        { street: 'turn', playerId: 'hero', move: 'check', to: 0 },
        { street: 'river', playerId: 'opponent', move: d.facing ? 'bet' : 'check', to: bet },
      ],
      legal: {
        toCall: bet,
        canCheck: !bet,
        callIsAllIn: false,
        canRaise: true,
        minTo: bet ? 200 : 10,
        maxTo: 900,
        word: bet ? 'Raise' : 'Bet',
        canFold: true,
        canHit: false,
      },
    };
    const ranges: OpponentRange[] = [
      { playerId: 'opponent', source: 'public-action-range-model-2', holdings: [{ cards: d.opponent, weight: 1 }] },
    ];
    const response: ResponsePredictor = (v) => (d.folds && v.toCall ? [1, 0, 0] : [0, 1, 0]);
    return { id: d.id, information, ranges, response };
  });
}
