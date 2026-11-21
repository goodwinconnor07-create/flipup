import { simulate } from '../src/bot_engine/simulation';
import { handBucket } from '../src/game/handBucket';

// npm run bot:small-bets [hands per seed]
// Seats a scripted player who pokes the minimum at pots after the flop with any two cards (`small-better` in
// scriptedOpponents.ts) with five everyday Casual bots, and prints how often the bots fold to those pokes, by hand.
// The owner's recorded hand of 13 Nov 2026 (pocket nines folded to one big blind into 210) is the case.
const hands = Number(process.argv[2] ?? 300);
const tally: Record<string, [number, number]> = {};
let folds = 0,
  faced = 0;
for (const seed of [11, 22, 33])
  simulate(hands, seed, 6, {
    agents: ['small-better', 'bot', 'bot', 'bot', 'bot', 'bot'],
    everyday: 'casual',
    experience: true,
    onAction: (i, a) => {
      if (i.street === 'preflop' || i.heroId === 'BOT_001' || i.legal.canCheck) return;
      const acts = i.actions.filter((x) => x.street === i.street && !x.outOfTurn);
      const bets = acts.filter((x) => x.move === 'bet' || x.move === 'raise' || x.move === 'allin');
      const pot = i.players.reduce((s, p) => s + p.total, 0);
      // Only a lone poke of under a fifth of the pot, before the bot has acted on this street.
      if (bets.length !== 1 || acts.some((x) => x.playerId === i.heroId) || i.legal.toCall > (pot - i.legal.toCall) * 0.2) return;
      const bucket = handBucket(i.hole, i.board);
      const t = (tally[bucket] ??= [0, 0]);
      t[1]++;
      faced++;
      if (a.move === 'fold') {
        t[0]++;
        folds++;
      }
    },
  });
console.log(`\nBots facing a lone poke of under a fifth of the pot, ${hands * 3} hands\n`);
for (const b of ['monster', 'strong', 'top', 'mid', 'draw', 'weak', 'air']) {
  const t = tally[b];
  if (t) console.log(`${b.padEnd(8)} folded ${((t[0] / t[1]) * 100).toFixed(1).padStart(5)}%  n=${t[1]}`);
}
console.log(`all      folded ${((folds / Math.max(1, faced)) * 100).toFixed(1).padStart(5)}%  n=${faced}`);
