import { useEffect } from 'react';
import { SALARY } from '../../game';
import { getCampaign, setCampaign } from '../../state/campaign';
import { closeSheet } from '../../state/store';
import { Sheet } from '../../ui/components';

const STEPS = [
  { emoji: '💰', title: 'A salary every day', line: `Each day you open FlipUp, your bankroll is topped up to ${SALARY.toLocaleString('en-US')}, and a little more for every day in a row. Skip a day and you skip that day’s pay.` },
  { emoji: '🎯', title: 'Missions and a free spin', line: 'Three missions a day pay extra chips, and the daily spin pays up to 5,000.' },
  { emoji: '🃏', title: 'Cash games', line: 'Pick your blinds, sit down, and cash out whenever you like. Bigger blinds open as your bankroll grows.' },
  { emoji: '🎰', title: 'Tournaments with a lucky draw', line: 'Every tournament draws its prize when you buy in. Most pay a few buy-ins, but now and then one pays hundreds.' },
  { emoji: '🗺️', title: 'Climb to the Yacht', line: 'Grow your bankroll to open bigger rooms, from the Garage to the Yacht. The bots get sharper as the stakes go up, and a legend runs every room from the Riverboat on: knock them out to beat them.' },
  { emoji: '🤝', title: 'Bring your friends', line: 'See how your friends are doing, and open a campaign table they can join with a code. Everyone plays with their own bankroll.' },
  { emoji: '🎡', title: 'Feeling lucky?', line: 'Bet your chips on the roulette wheel. Goals pay extra chips when you hit them.' },
  { emoji: '🪫', title: 'Go broke and you’re done', line: 'Lose it all and that’s it for the day. Your salary gets you back in tomorrow.' },
];

/** How the campaign works: shown the first time the Campaign tab opens, and from its help row. */
export function CampaignIntroSheet() {
  // Seen once it's opened, however it's closed.
  useEffect(() => {
    const c = getCampaign();
    if (!c.intro) setCampaign({ ...c, intro: true });
  }, []);
  return (
    <Sheet title="How the campaign works">
      <ol className="camp-intro">
        {STEPS.map((s) => (
          <li key={s.title}>
            <span aria-hidden>{s.emoji}</span>
            <div>
              <b>{s.title}</b>
              <small>{s.line}</small>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-xl btn-green" onClick={closeSheet}>
        Let’s go
      </button>
    </Sheet>
  );
}
