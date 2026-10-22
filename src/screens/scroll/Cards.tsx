// The two pop-ups of a Scroll card: the intro that announces the goal, and the result with the coach.

import { useMemo } from 'react';
import { Avatar } from '../../ui/components';
import { CoachSays } from '../../train/Coach';
import { GRADE_WORD, scrollLines } from '../../train/coach';
import { GradePill, streetName } from '../../train/widgets';
import { dealCard } from '../../scroll/deal';
import { goalText } from '../../scroll/play';
import { STYLE_NOTES } from '../../scroll/styleNotes';
import { seatName } from '../../scroll/deal';
import { storyLines } from '../../scroll/story';
import { THEMES, type CardRef, type Decision, type Outcome } from '../../scroll/types';
import { navigate } from '../../state/store';

export function Stars({ n, of = 3, big = false }: { n: number; of?: number; big?: boolean }) {
  return (
    <span className={`stars${big ? ' big' : ''}`} aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? 'on' : ''} style={{ ['--i' as string]: i }}>
          ★
        </span>
      ))}
    </span>
  );
}

/** The card announced in big type, with its goal, who you're up against and a hint or two. Start deals the cards. */
export function Intro({ card, number, live, onStart }: { card: CardRef; number: number; live: boolean; onStart: () => void }) {
  const dealt = useMemo(() => dealCard(card), [card.id, card.seed]);
  const t = dealt.template;
  const story = useMemo(() => storyLines(dealt), [dealt]);
  const solo = dealt.bots.length === 1 ? dealt.bots[0] : null;
  const note = solo ? STYLE_NOTES[solo.style] : null;
  return (
    <div className="scroll-intro" role="dialog" aria-label={`${t.title}. ${goalText(t)}`}>
      <div className="intro-inner">
        <small className="intro-kicker pop-in" style={{ ['--d' as string]: 0 }}>
          {THEMES[t.theme].title} · Card {number}
        </small>
        <h2 className="intro-title pop-in" style={{ ['--d' as string]: 1 }}>
          {t.title}
        </h2>
        <div className="intro-goal pop-in" style={{ ['--d' as string]: 2 }}>
          <small>Goal</small>
          <b>{goalText(t)}</b>
        </div>
        <div className="intro-who pop-in" style={{ ['--d' as string]: 3 }}>
          {solo ? (
            <>
              <Avatar emoji={solo.emoji} size={52} />
              <span>
                <b>
                  {solo.name} <i>{note?.label}</i>
                </b>
                <small>{note?.line}</small>
              </span>
            </>
          ) : (
            <>
              <span className="intro-faces" aria-hidden>
                {dealt.bots.slice(0, 5).map((b) => (
                  <Avatar key={b.name} emoji={b.emoji} size={34} />
                ))}
              </span>
              <span>
                <b>{dealt.bots.length} bots</b>
                <small>A mix of styles. Play it by the book.</small>
              </span>
            </>
          )}
        </div>
        <p className="intro-spot pop-in" style={{ ['--d' as string]: 4 }}>
          You&apos;re {seatName(t.at, t.bots + 1)} · {t.stack} big blinds deep
        </p>
        <ul className="intro-story pop-in" style={{ ['--d' as string]: 5 }}>
          {story.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <ul className="intro-hints pop-in" style={{ ['--d' as string]: 6 }}>
          {t.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="btn btn-xl btn-blue intro-start pop-in"
        style={{ ['--d' as string]: 7 }}
        disabled={!live}
        onClick={onStart}
      >
        Start
      </button>
    </div>
  );
}

const moveLabel = (d: Decision): string => {
  switch (d.mine) {
    case 'bet':
      return d.to !== undefined ? `Bet ${trim(d.to)}` : 'Bet';
    case 'raise':
      return d.to !== undefined ? `Raise to ${trim(d.to)}` : 'Raise';
    case 'allin':
      return 'All in';
    default:
      return d.mine.charAt(0).toUpperCase() + d.mine.slice(1);
  }
};
const trim = (x: number) => String(Number(x.toFixed(1)));

/** How the card went: pass or miss, the stars, what the coach thinks of your moves, and how to move on. */
export function Result({
  card,
  decisions,
  outcome,
  past = false,
  onNext,
}: {
  card: CardRef;
  decisions: Decision[];
  outcome: Outcome;
  /** A card from earlier, looked at again: the coach doesn't type it out again. */
  past?: boolean;
  onNext?: () => void;
}) {
  const dealt = useMemo(() => dealCard(card), [card.id, card.seed]);
  const t = dealt.template;
  const style = dealt.bots.length === 1 ? dealt.bots[0].style : null;
  const lines = useMemo(() => scrollLines(t, decisions, outcome, style ? { style } : null), [t, decisions, outcome, style]);
  const first = decisions.find((d) => !d.easy) ?? decisions[0];
  return (
    <div className={`scroll-result${outcome.passed ? ' pass' : ' miss'}`}>
      <div className="result-head">
        <span className="result-badge" aria-hidden>
          {outcome.passed ? '✓' : '✕'}
        </span>
        <span className="result-text">
          <b>{outcome.passed ? 'Passed' : 'Missed it'}</b>
          <small>
            {t.title}
            {!t.quick && outcome.net !== 0 ? ` · ${outcome.net > 0 ? 'won' : 'lost'} ${trim(Math.abs(outcome.net))} bb` : ''}
            {t.quick && first ? ` · ${GRADE_WORD[first.grade]}` : ''}
          </small>
        </span>
        <Stars n={outcome.stars} big />
      </div>
      <div className="result-body">
        <CoachSays lines={lines} quick={past} compact />
        {decisions.length > 0 && (
          <div className="result-moves" aria-label="Your moves">
            {decisions.map((d, i) => (
              <span key={i} className="result-move">
                <small>{streetName(d.street)}</small>
                <GradePill colour={d.grade} label={`${moveLabel(d)}`} />
              </span>
            ))}
          </div>
        )}
        <button type="button" className="btn-link-small result-numbers" onClick={() => navigate({ name: 'train', section: 'scroll' })}>
          Want the full numbers? They&apos;re in Train, under Scroll hands.
        </button>
      </div>
      {onNext && (
        <button type="button" className="btn btn-xl btn-blue result-next" onClick={onNext}>
          Next card
        </button>
      )}
    </div>
  );
}
