// The GTO Coach: an emoji at the top of anything that gives advice, and the advice itself in text bubbles.
// Wording lives in coach.ts; this file is how it looks and the bits that talk back (retry a spot).

import { useState, type ReactNode } from 'react';
import type { Colour, Decision, PracticeHand } from '../gto/types';
import { recordDrill } from '../state/training';
import { noteDrill } from '../state/progress';
import { COACH_EMOJI, COACH_NAME, GRADE_WORD, lessonLine, verdictLines } from './coach';
import { bb, pct, prettyAction } from './format';
import { drillFor, scenarioTitle } from './scenarios';
import { DecisionCard, gradePick, MiniCards, MixBar, splitCards } from './widgets';
import { navigate } from '../state/store';

/** The coach's face. `busy` makes it bob while they're "typing". */
export function CoachAvatar({ size = 40, busy = false }: { size?: number; busy?: boolean }) {
  return (
    <span className={`coach-avatar${busy ? ' busy' : ''}`} style={{ width: size, height: size, fontSize: size * 0.62 }} aria-hidden>
      {COACH_EMOJI}
    </span>
  );
}

/** The coach's name, a small caption over the first bubble (and what they're doing, or a grade). */
export function CoachHeader({ status }: { status?: ReactNode }) {
  return (
    <div className="coach-head">
      <b>{COACH_NAME}</b>
      {status && <small>{status}</small>}
    </div>
  );
}

/** One speech bubble. `tone` tints it by how the move went. */
export function CoachBubble({
  children,
  tone,
  className = '',
  i = 0,
}: {
  children: ReactNode;
  tone?: Colour | null;
  className?: string;
  i?: number;
}) {
  return (
    <div className={`coach-bubble${tone ? ` ${tone}` : ''} ${className}`} style={{ ['--i' as string]: i }}>
      {children}
    </div>
  );
}

/**
 * The coach talking, laid out like a chat: their face on the left, their name over the bubbles, then a
 * bubble per line popping in one after another (the first after a moment of "typing"). `quick` skips
 * the typing, for chatter while a replay plays or a greeting you've already seen.
 */
export function CoachSays({
  lines,
  tone,
  header = true,
  compact = false,
  quick = false,
  status,
  children,
}: {
  lines: ReactNode[];
  tone?: Colour | null;
  header?: boolean;
  compact?: boolean;
  quick?: boolean;
  status?: ReactNode;
  /** Extra things to put inside the last bubble's stack, such as a bar or buttons. */
  children?: ReactNode;
}) {
  return (
    <div className={`coach${quick ? ' quick' : ''}${header ? ' with-face' : ''}${compact ? ' compact' : ''}`}>
      {header && <CoachAvatar size={compact ? 28 : 32} />}
      <div className="coach-stack">
        {header && <CoachHeader status={status} />}
        {!quick && (
          <div className="coach-bubble typing" aria-hidden>
            <i />
            <i />
            <i />
          </div>
        )}
        {lines.map((l, i) => (
          <CoachBubble key={i} tone={tone} className="pop" i={i}>
            {l}
          </CoachBubble>
        ))}
        {children}
      </div>
    </div>
  );
}

/** "Thinking" state while the solver works. */
export function CoachBusy({ text }: { text: string }) {
  return (
    <div className="coach quick with-face">
      <CoachAvatar size={32} busy />
      <div className="coach-stack">
        <CoachHeader status="working on it…" />
        <CoachBubble className="pop">
          {text}
          <span className="coach-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </CoachBubble>
      </div>
    </div>
  );
}

/** How the coach answers one of your decisions: the verdict, GTO's mix, the lesson, a retry and the full numbers. */
export function CoachFeedback({
  d,
  onPractice,
  compact = false,
}: {
  d: Decision;
  onPractice?: (scenario: string) => void;
  compact?: boolean;
}) {
  const tone = d.pending ? null : d.colour;
  const mix = d.gto && d.gto.some((g) => g.frequency != null) ? Object.fromEntries(d.gto.map((g) => [g.action, g.frequency ?? 0])) : null;
  const lesson = lessonLine(d);
  const lines: ReactNode[] = verdictLines(d);
  const drill = d.scenario ? drillFor(d.scenario) : null;
  const canRetry = !d.pending && tone && tone !== 'green' && !!d.hand && !!d.gto && d.gto.length > 1;
  return (
    <div className={`coach-feedback ${tone ?? ''}${compact ? ' compact' : ''}`}>
      <CoachSays
        lines={lines}
        tone={tone}
        compact={compact}
        quick
        status={tone ? <span className={`grade-pill ${tone}`}>{GRADE_WORD[tone]}</span> : undefined}
      >
        {mix && (
          <CoachBubble tone={tone} className="pop wide">
            <small className="coach-label">What I'd do with your hand</small>
            <MixBar mix={mix} mark={d.matched_action} />
          </CoachBubble>
        )}
        {lesson && (
          <CoachBubble tone={tone} className="pop lesson">
            {lesson}
          </CoachBubble>
        )}
      </CoachSays>
      <div className="coach-actions">
        {canRetry && <RetrySpot d={d} />}
        {drill && onPractice && tone && tone !== 'green' && !d.pending && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => onPractice(drill)}>
            Practise {scenarioTitle(drill).toLowerCase()}
          </button>
        )}
      </div>
      <details className="coach-numbers">
        <summary>Show me the numbers</summary>
        <DecisionCard d={d} defaultOpen />
      </details>
    </div>
  );
}

/** "Try this spot again": the same hand, board and pot, without your answer. */
export function RetrySpot({ d }: { d: Decision }) {
  const [shown, setShown] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const p: PracticeHand = {
    hand: d.hand ?? '',
    options: (d.gto ?? []).map((g) => ({ action: g.action, frequency: g.frequency ?? 0, ev_bb: g.ev_bb })),
    best_action: d.best_action ?? '',
  };
  const result = picked ? gradePick(p, picked, d.pot_bb) : null;

  const pick = (action: string) => {
    if (picked) return;
    setPicked(action);
    const g = gradePick(p, action, d.pot_bb);
    if (d.scenario) {
      recordDrill(d.scenario, g.colour, g.loss);
      noteDrill();
    }
  };

  if (!shown) {
    return (
      <button type="button" className="btn btn-sm btn-dark" onClick={() => setShown(true)}>
        Try this spot again
      </button>
    );
  }
  const drill = d.scenario ? drillFor(d.scenario) : null;
  return (
    <div className="retry">
      <CoachSays quick header={false} lines={['Same spot, fresh start. What do you do?']} />
      <div className="retry-spot">
        <MiniCards cards={splitCards(d.hand)} size="md" />
        {d.board.length > 0 && <MiniCards cards={d.board} />}
        <span className="muted">
          Pot {bb(d.pot_bb)}
          {d.to_call_bb > 0 ? ` · ${bb(d.to_call_bb)} to call` : ''}
        </span>
      </div>
      <div className="t-list">
        {p.options.map((o) => {
          const g = picked ? gradePick(p, o.action, d.pot_bb) : null;
          return (
            <button
              key={o.action}
              type="button"
              className={`btn answer-btn ${picked ? g!.colour : 'btn-outline'}${picked === o.action ? ' picked' : ''}`}
              disabled={!!picked}
              onClick={() => pick(o.action)}
            >
              <span>{prettyAction(o.action)}</span>
              {picked && <small>{pct(o.frequency)}</small>}
            </button>
          );
        })}
      </div>
      {result && (
        <CoachSays
          quick
          header={false}
          tone={result.colour}
          lines={[
            result.colour === 'green'
              ? "That's it. You fixed it."
              : result.colour === 'yellow'
                ? `Closer. I'd still lean ${prettyAction(p.best_action).toLowerCase()}.`
                : `Not quite. ${prettyAction(p.best_action)} is the play, and ${prettyAction(picked!).toLowerCase()} gives up ${bb(result.loss)}.`,
          ]}
        >
          {drill && result.colour !== 'green' && (
            <button type="button" className="btn btn-sm btn-outline" onClick={() => navigate({ name: 'drill', scenario: drill })}>
              Practise more like this
            </button>
          )}
        </CoachSays>
      )}
    </div>
  );
}
