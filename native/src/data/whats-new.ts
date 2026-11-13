// What's New (Settings > What's New): one entry per release, newest first. Keep it basic and plain: a short line per
// feature. The same lines are the App Store's "What's New in This Version" text, so write them for players.
// Add the next release at the top of RELEASES; leave the older ones as they are.
import type { IconName } from '@/components/icon';

export interface NewItem {
  icon: IconName;
  title: string;
  text: string;
}
export interface Release {
  /** The app version this was part of, like the version at the bottom of Settings. */
  version: string;
  /** A short label for the entry ("Latest", a month). */
  label: string;
  items: NewItem[];
}

export const RELEASES: Release[] = [
  {
    version: '1.0.0',
    label: 'November 2026',
    items: [
      { icon: 'sparkles', title: 'Six new games', text: 'Headband, Conveyor Belt, Onion, Chain Reaction, Elevator and Double Board PLO. Each one has its own table, how-to pictures and bots that know the rules.' },
      { icon: 'person.3.fill', title: 'Bots that actually bet', text: 'Bots now bet a good hand when it is checked to them, take small stabs at a pot nobody wants, and keep a decent hand in against a small bet. Casual tables also liven up when the action goes quiet.' },
      { icon: 'bolt.fill', title: 'Bots that play each game', text: 'In Imposter the bots read how the table bets and vote for the odd one out. In Secret Missions they chase their own mission, and in Power Cards they play more of their powers. In every game they comment on what just happened.' },
      { icon: 'film.stack.fill', title: 'Replay after every hand', text: 'A new house rule for bot games. After each hand you play, see what you won or lost and who took the pot, then watch it back. The next hand waits for you.' },
      { icon: 'bookmark.fill', title: 'Saved hands are free', text: 'Save any hand at the table and watch it back move by move. Replays now show every bot’s cards and a full hand log.' },
      { icon: 'graduationcap.fill', title: 'Ways to train', text: 'Range training has a free daily hand, plus Endless, Sets and Gaps with Premium. New here? How it works explains it in four steps.' },
      { icon: 'person.3.fill', title: 'A livelier bots lobby', text: 'Your table floats on a little felt. New bots pop in, and holding one takes it off. More bot names, and not all of them have a surname.' },
      { icon: 'sparkles', title: 'Secret Missions', text: 'A new game. Everyone holds a secret mission each hand. Complete yours and the table pays you. First to five missions wins the race. Your mission is a card beside your hole cards: tap it for the details and the race.' },
      { icon: 'bolt.fill', title: 'Power Cards', text: 'Your power is now a card beside your hole cards. Tap it to play it. The table no longer jumps around while you choose.' },
      { icon: 'suit.spade.fill', title: 'Nine mini games with Texas Hold’em', text: 'Host a table and friends join with a game code. Bots fill empty seats, and Premium opens every game.' },
      { icon: 'star.fill', title: 'Range training and the daily hand', text: 'One real hand a day, the same for everyone. Practise more with Premium.' },
      { icon: 'questionmark.circle.fill', title: 'What’s New', text: 'This page. It lists the new things in each version.' },
    ],
  },
];
