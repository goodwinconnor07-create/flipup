import { useState } from 'react';
import { loadBank, loadQuiz } from '../quiz/save';
import { navigate, openScroll } from '../state/store';
import { CoachSays } from '../train/Coach';
import { ChevronIcon, ScrollIcon } from '../ui/Icons';

/** What the coach opens with on the Scroll tab. */
function hello(hands: number, right: number | null): string {
  if (hands === 0)
    return "Play whole hands the solver has already worked out. I'll stop you at every decision, preflop to river, tell you if you got it right and why.";
  if (right != null && right >= 0.8) return `You're getting ${Math.round(right * 100)}% of decisions right. Keep it going.`;
  if (right != null && right < 0.5) return "Lots of close spots lately. Read the why after each move: that's where it sticks.";
  return 'Ready for another hand?';
}

/** The Scroll tab: where you stand, and a big button to keep going. */
export function ScrollTab() {
  const [save] = useState(loadQuiz);
  const [bank] = useState(loadBank);
  const decided = save.green + save.yellow + save.red;
  const right = decided ? (save.green + save.yellow / 2) / decided : null;
  return (
    <>
      <button
        type="button"
        className="hero scroll-hero press"
        onClick={openScroll}
        aria-label={save.hands ? 'Keep scrolling' : 'Start scrolling'}
      >
        <span className="hero-top">
          <span className="hero-eyebrow">Solved hands</span>
          <span className="hero-title">{save.hands ? 'Keep scrolling' : 'Start scrolling'}</span>
          <span className="hero-sub">
            {save.hands
              ? `${save.hands} hands played · ${decided} decisions`
              : 'Whole hands, preflop to river. Every move graded by the solver.'}
          </span>
        </span>
        <span className="hero-foot">
          {save.hands ? 'Next hand' : 'Deal the first hand'}
          <ChevronIcon width={18} height={18} />
        </span>
      </button>
      <div className="group">
        <button type="button" className="group-row press" onClick={() => navigate({ name: 'train', section: 'scroll' })}>
          <span className="gr-icon sb-icon">
            <ScrollIcon />
          </span>
          <span className="gr-text">Study bank</span>
          <small className="muted num">{bank.length || ''}</small>
          <ChevronIcon className="gr-chev" width={16} height={16} />
        </button>
      </div>
      <div className="glass-card coach-card">
        <CoachSays lines={[hello(save.hands, right)]} />
      </div>
      <div className="scroll-tiles">
        <div className="glass-card tile">
          <small className="eyebrow">Right</small>
          <b className="num">{right == null ? '–' : `${Math.round(right * 100)}%`}</b>
        </div>
        <div className="glass-card tile">
          <small className="eyebrow">Costly</small>
          <b className="num">{decided ? save.red : '–'}</b>
        </div>
      </div>
    </>
  );
}
