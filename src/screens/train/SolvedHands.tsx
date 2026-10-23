// Solved hands: whole hands the GTO solver played out ahead of time. The hand plays itself on the replay
// table and stops at each of your decisions; pick a move and the coach grades it against the solver
// straight away (no server needed), then the hand carries on the way it was solved.

import { useEffect, useMemo, useState } from 'react';
import { recordNet } from '../../game';
import type { Colour } from '../../gto/types';
import { getHand, gradeChoice, gtoMix, nextHand, POSITIONS, seatId, toRecord, type QuizHand } from '../../quiz/hands';
import { isBanked, loadQuiz, recordPlayed, saveQuizHand, saveToBank } from '../../quiz/save';
import { loadTableLook, markPlayedToday } from '../../state/persist';
import { CoachBusy, CoachSays } from '../../train/Coach';
import { GRADE_WORD, quizCarryOn, quizLines, quizResult, quizSummary, quizWhy } from '../../train/coach';
import { readSpot } from '../../quiz/read';
import { buildFrames } from '../../train/replay';
import { streetName } from '../../train/widgets';
import { BackBar, CardSlot, chips, PlayingCard } from '../../ui/components';
import { Seat } from './Replay';

const SUIT: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const cardText = (c: string) => `${c[0] === 'T' ? '10' : c[0]}${SUIT[c[1]]}`;
/** A name to start from when saving: "BTN K♣9♦ on J♣ 9♥ Q♦". */
const defaultName = (h: QuizHand) => `${POSITIONS[h.hero]} ${h.cards.map(cardText).join('')} on ${h.board.slice(0, 3).map(cardText).join(' ')}`;

/** Scroll: one solved hand at a time. `handId` opens a particular hand (from the study bank) first. */
export function SolvedHands({ handId }: { handId?: string }) {
  const [save, setSave] = useState(loadQuiz);
  const [hand, setHand] = useState<QuizHand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [look] = useState(loadTableLook);
  const [at, setAt] = useState(0);
  const [asking, setAsking] = useState<number | null>(null);
  const [picks, setPicks] = useState<(number | undefined)[]>([]);
  const [saved, setSaved] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [banked, setBanked] = useState(false);

  const deal = (id?: string) => {
    setError(null);
    setHand(null);
    setNaming(false);
    (id ? getHand(id) : nextHand(loadQuiz().seen))
      .then((h) => {
        setHand(h);
        setAt(0);
        setAsking(null);
        setPicks([]);
        setSaved(false);
        setBanked(isBanked(h.id));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load a hand."));
  };
  useEffect(() => deal(handId), []);

  const record = useMemo(() => (hand ? toRecord(hand) : null), [hand]);
  const heroId = hand ? seatId(hand.hero) : '';
  const frames = useMemo(() => (record ? buildFrames(record, heroId) : []), [record, heroId]);
  // The frame showing each decision's move, by decision number.
  const decisionFrame = useMemo(() => (hand ? hand.decisions.map((d) => frames.findIndex((f) => f.action === d.at)) : []), [hand, frames]);
  const last = frames.length - 1;
  const grades: Colour[] = hand ? hand.decisions.flatMap((d, k) => (picks[k] == null ? [] : [gradeChoice(d, picks[k]!).colour])) : [];

  // Play on its own, stopping just before each of your moves.
  useEffect(() => {
    if (!hand || asking != null || at >= last) return;
    const next = at + 1;
    const k = decisionFrame.indexOf(next);
    if (k >= 0 && picks[k] == null) {
      setAsking(k);
      return;
    }
    const f = frames[at];
    const t = setTimeout(() => setAt(next), f.kind === 'deal' ? 1200 : f.kind === 'street' ? 900 : 800);
    return () => clearTimeout(t);
  }, [hand, at, asking, picks, frames, decisionFrame, last]);

  const played = () => ({ id: hand!.id, at: Date.now(), title: defaultName(hand!), cards: hand!.cards, picks: hand!.decisions.map((_, k) => picks[k] ?? null), grades });

  // Count the hand once it's over, and keep it for 24 hours in case you want to save it.
  useEffect(() => {
    if (hand && frames.length && at >= last && !saved) {
      setSaved(true);
      setSave(saveQuizHand(hand.id, grades));
      recordPlayed(played());
      markPlayedToday();
    }
  }, [hand, at, last, saved, frames.length]);

  const openSave = () => {
    if (!hand) return;
    setName(name && naming ? name : defaultName(hand));
    setNaming(true);
  };
  const confirmSave = () => {
    if (!hand) return;
    saveToBank(played(), name || defaultName(hand));
    setBanked(true);
    setNaming(false);
  };

  const header = (
    <BackBar
      title="Scroll"
      right={
        hand ? (
          <button type="button" className={`chip-btn press${banked ? ' on' : ''}`} onClick={openSave} aria-label={banked ? 'Saved to your study bank. Rename it' : 'Save to your study bank'}>
            {banked ? 'Saved' : 'Save'}
          </button>
        ) : (
          <span className="chip-btn" aria-label={`${save.hands} hands played`}>
            {save.hands} played
          </span>
        )
      }
    />
  );

  if (!hand || !record) {
    return (
      <div className="screen train replay">
        {header}
        <div className="screen-body">
          {error ? (
            <CoachSays quick lines={[error]}>
              <button type="button" className="btn btn-sm btn-dark" onClick={() => deal(handId)}>
                Try again
              </button>
            </CoachSays>
          ) : (
            <CoachBusy text="Dealing a hand…" />
          )}
        </div>
      </div>
    );
  }

  const f = frames[at];
  const order = [...record.players].sort((a, b) => a.seat - b.seat);
  const heroAt = Math.max(0, order.findIndex((p) => p.id === heroId));
  const seated = [...order.slice(heroAt), ...order.slice(0, heroAt)];
  const d = asking != null ? hand.decisions[asking] : null;
  const pick = asking != null ? picks[asking] : undefined;
  const grade = d && pick != null ? gradeChoice(d, pick) : null;

  const answer = (i: number) => {
    if (asking == null || picks[asking] != null) return;
    const next = [...picks];
    next[asking] = i;
    setPicks(next);
  };
  const carryOn = () => {
    if (asking == null) return;
    setAt(decisionFrame[asking]);
    setAsking(null);
  };

  return (
    <div className="screen train replay quiz">
      {header}
      <div className="rp-body">
        <div className="rp-felt" role="img" aria-label={f.text} style={{ ['--felt' as string]: look.felt }}>
          <div className="rp-middle">
            <span className="rp-badge">{streetName(f.street)}</span>
            <div className="rp-board">
              {[0, 1, 2, 3, 4].map((k) =>
                k < f.boardCount ? (
                  <PlayingCard key={k} card={record.board[k]} size="sm" flip={k === f.boardCount - 1 || (f.boardCount === 3 && k < 3)} />
                ) : (
                  <CardSlot key={k} size="sm" />
                ),
              )}
            </div>
            {f.kind !== 'result' && (
              <div className="rp-pot num">
                Pot <b>{chips(f.pot)}</b>
                <small> · {Number((f.pot / record.bigBlind).toFixed(1))} bb</small>
              </div>
            )}
          </div>
          {seated.map((p, k) => (
            <Seat key={p.id} r={record} id={p.id} f={f} i={k} n={seated.length} heroId={heroId} />
          ))}
        </div>

        {naming && (
          <form
            className="glass-card quiz-save"
            onSubmit={(e) => {
              e.preventDefault();
              confirmSave();
            }}
          >
            <label htmlFor="quiz-save-name" className="eyebrow">
              Save to your study bank
            </label>
            <input id="quiz-save-name" className="field" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />
            <div className="quiz-save-actions">
              <button type="button" className="btn btn-link" onClick={() => setNaming(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-sm btn-dark">
                {banked ? 'Rename' : 'Save'}
              </button>
            </div>
          </form>
        )}

        <div className="rp-coach" aria-live="polite">
          {d ? (
            <div className="quiz-ask">
              <div className="quiz-options" role="group" aria-label="Your move">
                {d.options.map((o, i) => {
                  const g = pick != null && i === pick ? grade!.colour : null;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`btn answer-btn press${g ? ` ${g} picked` : ''}${pick != null && i !== pick ? ' quiz-other' : ''}`}
                      disabled={pick != null}
                      onClick={() => answer(i)}
                    >
                      <span>{o.label}</span>
                      {pick != null && <small className="num">{o.ev == null ? 'GTO never' : `GTO ${Math.round(o.freq * 100)}%`}</small>}
                    </button>
                  );
                })}
              </div>
              {grade && pick != null ? (
                <CoachSays
                  key={`${asking}-${pick}`}
                  quick
                  tone={grade.colour}
                  lines={[
                    <b key="g">{GRADE_WORD[grade.colour]}</b>,
                    ...(([verdict, mixLine]) => [verdict, ...quizWhy(readSpot(hand, d), d.options[pick]), mixLine])(
                      quizLines(grade.colour, (gtoMix(d)[0] ?? grade.best).label, d.options[pick].freq, grade.loss, gtoMix(d)),
                    ),
                    ...(pick !== d.line ? [quizCarryOn(d.options[d.line].label)] : []),
                  ]}
                >
                  <button type="button" className="btn btn-sm btn-dark" onClick={carryOn}>
                    Carry on
                  </button>
                </CoachSays>
              ) : (
                <CoachSays key={`ask-${asking}`} quick lines={[d.toCall > 0 ? `${Number(d.toCall.toFixed(1))}bb to call. Your move.` : 'Your move.']} />
              )}
            </div>
          ) : f.kind === 'result' ? (
            <CoachSays key="end" quick lines={[quizResult(recordNet(record, heroId) / record.bigBlind, hand.showdown), quizSummary(grades)]}>
              <div className="quiz-end-actions">
                {!banked && (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={openSave}>
                    Save to study bank
                  </button>
                )}
                <button type="button" className="btn btn-sm btn-dark" onClick={() => deal()}>
                  Next hand
                </button>
              </div>
            </CoachSays>
          ) : (
            <CoachSays key={at} quick lines={[f.text]} />
          )}
        </div>
      </div>
    </div>
  );
}
