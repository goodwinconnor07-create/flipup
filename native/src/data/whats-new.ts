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
      { icon: 'graduationcap.fill', title: 'Ways to train', text: 'Range training has a free daily hand, plus Endless, Sets and Gaps with Premium. New here? How it works explains it in four steps.' },
      { icon: 'person.3.fill', title: 'A livelier bots lobby', text: 'Your table floats on a little felt. New bots pop in, and holding one takes it off. More bot names, and not all of them have a surname.' },
      { icon: 'sparkles', title: 'Secret Missions', text: 'A new game. Everyone holds a secret mission each hand. Complete yours and the table pays you. First to five missions wins the race.' },
      { icon: 'bolt.fill', title: 'Power Cards', text: 'Your power is now a card beside your hole cards. Tap it to play it. The table no longer jumps around while you choose.' },
      { icon: 'suit.spade.fill', title: 'Nine mini games with Texas Hold’em', text: 'Host a table and friends join with a game code. Bots fill empty seats, and Premium opens every game.' },
      { icon: 'star.fill', title: 'Range training and the daily hand', text: 'One real hand a day, the same for everyone. Practise more with Premium.' },
      { icon: 'questionmark.circle.fill', title: 'What’s New', text: 'This page. It lists the new things in each version.' },
    ],
  },
];
