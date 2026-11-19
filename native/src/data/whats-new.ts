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
      { icon: 'person.2.fill', title: 'A lobby for every game', text: 'Your lobby takes the colour of the game you pick. Tap a bot to swap it for another or take it off the table.' },
      { icon: 'sparkles', title: '12 mini games', text: 'Texas Hold’em plus games with a twist, like Haunted Pot, Crazy Pineapple, Die on the River and Power Cards. Each has its own table and a short How to Play.' },
      { icon: 'flask.fill', title: 'Bot Lab', text: 'Make up to 25 bots of your own in Settings: a name, a face and dials for how they play and talk. Seat them from + Add Bot in any lobby you host. Part of Premium.' },
      { icon: 'party.popper.fill', title: 'Party nights', text: 'Line up 4 to 12 games, play a short table of each, and see who tops the board at the end.' },
      { icon: 'graduationcap.fill', title: 'Range training', text: 'A free hand every day. Pick your play, then see why it’s best.' },
      { icon: 'chart.bar.xaxis', title: 'Shortcuts on Play', text: 'Stats, Saved hands and Share cards are one tap away from the Play screen.' },
      { icon: 'film.stack.fill', title: 'Saved hands', text: 'Save any hand from the table (up to 50) and watch it back move by move. Tap the bookmark again to un-save it, or delete hands from the list. Once it’s over, you see what every bot had.' },
      { icon: 'house.fill', title: 'Home game rules', text: 'Antes, a straddle and a bomb pot every few hands, in the house rules of any table you host.' },
      { icon: 'flame.fill', title: 'Run it twice', text: 'When players are all in at a Texas Hold’em table, everyone in the hand can agree to deal the rest twice and split the pot.' },
      { icon: 'lightbulb.fill', title: 'Mistake review', text: 'Open a Texas Hold’em hand in Saved hands and see each of your moves graded, with your chance to win and what the call needed. Part of Premium.' },
      { icon: 'arrow.counterclockwise', title: 'Review after every hand', text: 'Turn it on in the house rules for a blue Review button and a 10 second countdown to the next hand. Review pauses the clock and lets you replay the hand.' },
      { icon: 'chart.bar.xaxis', title: 'Hold’em or mini games', text: 'Switch your stats between all your poker, Texas Hold’em alone and the mini games alone. The two halves count from this update.' },
      { icon: 'chart.line.uptrend.xyaxis', title: 'Stats in big blinds', text: 'Your stats count in big blinds, so a bigger stack or a rebuy never changes them.' },
      { icon: 'square.and.arrow.up', title: 'Share cards', text: 'Turn a big hand, a game or your stats into a picture worth sending, drawn in the colours of the game you played. Every card is free.' },
      { icon: 'questionmark.circle.fill', title: 'Rules when you need them', text: 'The first time you play a game, a short card sums up its rules before the first hand.' },
      { icon: 'eye.fill', title: 'Easy to read', text: 'VoiceOver reads out your turn, the result of each hand and How to Play. FlipUp follows Reduce Motion, Reduce Transparency, Increase Contrast and your text size, and a Haptics switch in Settings turns the buzzes off without muting the sounds.' },
      { icon: 'arrow.uturn.backward', title: 'Undo', text: 'Removed a bot, a game from the playlist or a saved hand by mistake? Tap Undo for a few seconds.' },
      { icon: 'crown.fill', title: 'FlipUp Premium', text: 'Host every mini game and make your own bots in Bot Lab. Range training opens up too, and friends always join your games free.' },
      { icon: 'hand.raised.fill', title: 'Play chips only', text: 'Chips have no cash value. They can’t be bought, sold or won.' },
    ],
  },
];
