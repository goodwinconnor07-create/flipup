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
    // Version 1.0 is the first on the App Store, so its list is what's in FlipUp, not what changed since a test build.
    version: '1.0.0',
    label: 'November 2026',
    items: [
      { icon: 'suit.spade.fill', title: 'Poker night on your phones', text: 'Host a table and your friends join on their own phones with a six-character game code or a QR code. Bots fill any empty seats.' },
      { icon: 'cpu.fill', title: 'Play bots anywhere', text: 'Play against bots on your own, even with no signal. Every bot has a style of its own and plenty to say about the hand.' },
      { icon: 'sparkles', title: '13 mini games', text: 'Texas Hold’em plus games with a twist, like Haunted Pot, Imposter, Die on the River and Power Cards. Each has its own table and a short How to Play.' },
      { icon: 'party.popper.fill', title: 'Party nights', text: 'Line up 4 to 12 games, play a short table of each, and see who tops the board at the end.' },
      { icon: 'graduationcap.fill', title: 'Range training', text: 'A free hand every day, taken from a published strategy breakdown. Pick your play, then see why the expert chose theirs.' },
      { icon: 'film.stack.fill', title: 'Saved hands', text: 'Save any hand from the table (up to 50) and watch it back move by move. Tap the bookmark again to un-save it, or delete hands from the list. Once it’s over, you see what every bot had.' },
      { icon: 'chart.line.uptrend.xyaxis', title: 'Stats in big blinds', text: 'Your stats count in big blinds, so a bigger stack or a rebuy never changes them.' },
      { icon: 'square.and.arrow.up', title: 'Share cards', text: 'Turn a big hand or your stats into a picture worth sending.' },
      { icon: 'questionmark.circle.fill', title: 'Rules when you need them', text: 'The first time you play a game, a short card sums up its rules before the first hand.' },
      { icon: 'crown.fill', title: 'FlipUp Premium', text: 'Host every mini game and play the whole bot roster. Range training opens up too, and friends always join your games free.' },
      { icon: 'hand.raised.fill', title: 'Play chips only', text: 'Chips have no cash value. They can’t be bought, sold or won.' },
    ],
  },
];
