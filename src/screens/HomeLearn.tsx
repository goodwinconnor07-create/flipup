import { useState } from 'react';
import { loadQuiz } from '../quiz/save';
import { navigate, openScroll, type TrainSection } from '../state/store';
import { CoachSays } from '../train/Coach';
import { BookIcon, ChevronIcon, PencilIcon } from '../ui/Icons';

/** What the coach says once you've played some solved hands (nothing before: the banner already explains). */
function hello(right: number): string {
  if (right >= 0.8) return `You're getting ${Math.round(right * 100)}% of decisions right. Keep it going.`;
  if (right < 0.5) return "Lots of close spots lately. Read the why after each move: that's where it sticks.";
  return 'Ready for another hand?';
}

const ROWS: { id: TrainSection; title: string; hint: string; Icon: typeof BookIcon; colour: string }[] = [
  { id: 'library', title: 'Poker library', hint: 'Drills, spot by spot', Icon: BookIcon, colour: 'var(--indigo)' },
  { id: 'custom', title: 'Custom hand', hint: 'See GTO for any hand', Icon: PencilIcon, colour: 'var(--slate-hi)' },
];

let greeted = false;

/** The Learn tab: solved multiway hands up top, then drills and the custom hand tool. */
export function LearnTab() {
  const [save] = useState(loadQuiz);
  const decided = save.green + save.yellow + save.red;
  const right = decided ? (save.green + save.yellow / 2) / decided : null;
  const quick = greeted;
  greeted = true;
  return (
    <>
      <button
        type="button"
        className="hero hero-blue press"
        onClick={openScroll}
        aria-label={save.hands ? 'Next solved hand' : 'Play a solved hand'}
      >
        <span className="hero-top">
          <span className="hero-eyebrow">Solved hands</span>
          <span className="hero-title">{save.hands ? 'Next solved hand' : 'Play a solved hand'}</span>
          <span className="hero-sub">
            {save.hands
              ? `${save.hands} ${save.hands === 1 ? 'hand' : 'hands'} played · ${decided} ${decided === 1 ? 'decision' : 'decisions'}`
              : 'Three or four players see the flop. Every move graded the moment you make it.'}
          </span>
        </span>
        <span className="hero-foot">
          Deal a hand
          <ChevronIcon width={18} height={18} />
        </span>
      </button>
      {right != null && (
        <>
          <CoachSays quick={quick} lines={[hello(right)]} />
          <div className="scroll-tiles">
            <div className="glass-card tile">
              <small className="eyebrow">Right</small>
              <b className="num">{`${Math.round(right * 100)}%`}</b>
            </div>
            <div className="glass-card tile">
              <small className="eyebrow">Costly</small>
              <b className="num">{save.red}</b>
            </div>
          </div>
        </>
      )}
      <div className="group">
        {ROWS.map(({ id, title, hint, Icon, colour }) => (
          <button key={id} type="button" className="group-row press" onClick={() => navigate({ name: 'train', section: id })}>
            <span className="gr-icon" style={{ background: colour }}>
              <Icon />
            </span>
            <span className="gr-text">
              {title}
              <small>{hint}</small>
            </span>
            <ChevronIcon className="gr-chev" width={16} height={16} />
          </button>
        ))}
      </div>
    </>
  );
}
