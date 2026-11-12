// The in-app Help pages (Settings > Help): the questions people ask most, grouped. The same answers are on the
// website's /support page; change both together.
import type { IconName } from '@/components/icon';

export interface HelpItem {
  q: string;
  a: string;
}
export interface HelpSection {
  id: string;
  title: string;
  icon: IconName;
  items: HelpItem[];
}

export const HELP: HelpSection[] = [
  {
    id: 'start',
    title: 'Getting started',
    icon: 'suit.spade.fill',
    items: [
      {
        q: 'What is FlipUp?',
        a: 'Poker night on your phones. Play no-limit Texas Hold’em and a set of mini games with friends or against bots, for play chips. There are no accounts and nothing to sign up for.',
      },
      {
        q: 'How do I play on my own?',
        a: 'Tap Play with bots on the Play screen, pick a game, add or remove bots, and tap Start game. It runs entirely on your phone, so it works without internet.',
      },
      {
        q: 'How do I play with friends?',
        a: 'Tap Play with friends and share the game code, the QR code or the link at the top of the page. Your friends open FlipUp, tap Join a game, and type the code or scan the QR code. Add bots to fill any empty seats, then tap Start game.',
      },
      {
        q: 'How do I join a friend’s game?',
        a: 'Tap Join a game on the Play screen. Type the code your friend shared (letters and numbers, no spaces) or tap Scan to read their QR code, then tap Sit down.',
      },
      {
        q: 'Do I need internet?',
        a: 'Only for online tables, parties and joining by code. Playing against bots and Range training both work offline.',
      },
    ],
  },
  {
    id: 'playing',
    title: 'Playing a game',
    icon: 'hand.tap.fill',
    items: [
      {
        q: 'What do Fold, Check, Call and Raise mean?',
        a: 'Fold gives up your hand. Check passes when nobody has bet. Call matches the bet. Raise (or Bet) puts in more, and tap Raise to choose how much with the slider. The Fold, Call and Raise buttons are at the bottom of the table when it’s your turn.',
      },
      {
        q: 'Which hand beats which?',
        a: 'Open the menu (the round button at the top left of the table) and choose Hand rankings for the full list, from a royal flush down to a high card.',
      },
      {
        q: 'How do the mini games work?',
        a: 'Each game has its own rules and its own look. Tap its picture on the Play screen for How to Play, a short walkthrough of a real hand. The game’s name at the top of the table also opens its rules.',
      },
      {
        q: 'What are Casual and Challenge bots?',
        a: 'Casual bots play a relaxed, friendly game. Challenge bots play tighter and punish mistakes. Pick one in the game’s settings before you start.',
      },
      {
        q: 'How does the turn clock work?',
        a: 'Online tables give each player a set time per turn, shown as a line around the table. If time runs out you check if you can, otherwise you fold. A few timeouts in a row sit you out until you tap I’m back.',
      },
      {
        q: 'I lost my connection. What happens?',
        a: 'FlipUp reconnects by itself when your signal comes back and shows Reconnecting… meanwhile. While you’re offline your turns run on a shorter clock.',
      },
      {
        q: 'Can I take a break?',
        a: 'Yes. Open the table menu and tap Sit out. You skip hands until you tap I’m back.',
      },
    ],
  },
  {
    id: 'chips',
    title: 'Chips and Premium',
    icon: 'crown.fill',
    items: [
      {
        q: 'Are the chips real money?',
        a: 'No. They’re play chips with no cash value. They can’t be bought, sold, won or exchanged for anything, and FlipUp is not real-money gambling.',
      },
      {
        q: 'What does Premium unlock?',
        a: 'Premium is a subscription, monthly or yearly, bought through your Apple Account. It unlocks hosting every mini game, the whole bot roster, every Range training hand, saved hands with Replay, share card designs, the gold name and the card backs. Texas Hold’em with ten bots and Range training’s daily hand are free. Only the person hosting a table needs Premium; friends who join play every game free.',
      },
      {
        q: 'How do I cancel Premium?',
        a: 'Open your profile, then Settings, then Manage subscription, or open the iPhone’s Settings app, tap your name, then Subscriptions. Cancel at least a day before it renews. You keep Premium until the end of the time you’ve paid for.',
      },
      {
        q: 'I bought Premium. How do I get it back?',
        a: 'Open your profile, then Settings, then Restore Purchases, signed in with the same Apple Account you bought it with. It also works on a new iPhone.',
      },
      {
        q: 'Can I top up when I run out of chips?',
        a: 'If the host turned Rebuys on, tap Rebuy when you’re out. Otherwise you can watch the rest of the game, and start a new one anytime.',
      },
    ],
  },
  {
    id: 'train',
    title: 'Range training',
    icon: 'graduationcap.fill',
    items: [
      {
        q: 'What is the Train tab?',
        a: 'Real hands from published poker strategy breakdowns. You see the table and the action, choose a play, then see why it’s best and how often each play wins.',
      },
      {
        q: 'What are the ways to train?',
        a: 'Daily hand is one free hand a day, the same for everyone. With Premium: Endless deals hand after hand until you stop, Sets are five hands scored at the end, and Gaps builds a set from the spots you miss. New here? Tap How it works on the Train tab.',
      },
      {
        q: 'What do Best play, Also good and Missed mean?',
        a: 'Best play is the answer the expert chose. Also good is close to it. Missed is the rest. A miss is never a failure: it shows you what they could have had so you can spot it next time.',
      },
      {
        q: 'Can I get a hint?',
        a: 'Yes. Tap Hint under your cards for a clue about each street, one at a time. It never costs you anything.',
      },
      {
        q: 'Where are my stats?',
        a: 'On the Train tab: your day streak, best-play rate and best run, how many hands you’ve mastered, and Work on, the kinds of spot you miss most. Everything stays on your phone.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety and your data',
    icon: 'hand.raised.fill',
    items: [
      {
        q: 'Someone is behaving badly. What can I do?',
        a: 'Tap their seat at an online table, or their row on a party board, to report them, block them or (if you’re the host) remove them. Blocking hides their name and messages on your phone. We read every report and answer within 24 hours.',
      },
      {
        q: 'Can people type messages to me?',
        a: 'No. Table talk is quick messages picked from a fixed list, and the bots’ lines are written in advance. Nothing anyone types is ever shown to another player.',
      },
      {
        q: 'How do I delete my data?',
        a: 'Open your profile, then Settings, then Delete my data. It clears what our server keeps about your phone and everything FlipUp keeps on it. Premium stays with your Apple Account and Restore Purchases brings it back.',
      },
      {
        q: 'What does FlipUp keep about me?',
        a: 'Your stats and settings stay on your phone. Online tables keep only what they need to run, and delete it automatically after a few days. The full details are in the privacy policy, linked in Settings.',
      },
    ],
  },
];
