// The hand rankings sheet, best first, with an example of each. Shared by the web and the iPhone app.

export const RANKINGS: { name: string; cards: string; note: string }[] = [
  { name: 'Royal flush', cards: 'As Ks Qs Js Ts', note: 'A, K, Q, J, 10, all one suit' },
  { name: 'Straight flush', cards: '9h 8h 7h 6h 5h', note: 'Five in a row, all one suit' },
  { name: 'Four of a kind', cards: '7c 7d 7h 7s Kd', note: 'Four cards of the same rank' },
  { name: 'Full house', cards: 'Qc Qd Qh 4s 4d', note: 'Three of a kind plus a pair' },
  { name: 'Flush', cards: 'Ad 9d 7d 4d 2d', note: 'Any five of one suit' },
  { name: 'Straight', cards: '9c 8d 7h 6s 5d', note: 'Five in a row, any suits' },
  { name: 'Three of a kind', cards: 'Jc Jd Jh 9s 4d', note: 'Three cards of the same rank' },
  { name: 'Two pair', cards: 'Kc Kd 5h 5s 9d', note: 'Two different pairs' },
  { name: 'Pair', cards: '8h 8s Ac 9c 5h', note: 'Two cards of the same rank' },
  { name: 'High card', cards: 'Ac Jd 9h 7s 4d', note: 'Nothing else: highest card plays' },
];
