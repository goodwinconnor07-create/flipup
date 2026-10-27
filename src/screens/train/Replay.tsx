import { useEffect, useMemo, useRef, useState } from 'react';
import { recordNet, type HandRecord } from '../../game';
import type { Decision, HandReport } from '../../gto/types';
import { navigate } from '../../state/store';
import { loadCoachMet, loadTableLook, saveCoachMet } from '../../state/persist';
import { loadHistory } from '../../state/training';
import { CoachBusy, CoachFeedback, CoachSays } from '../../train/Coach';
import { handLesson } from '../../train/coach';
import { buildFrames, matchDecisions, mistakeFrames, type Frame } from '../../train/replay';
import { reviewAndSave, savedReport } from '../../train/reviews';
import { streetName } from '../../train/widgets';
import { Avatar, BackBar, chips, PlayingCard, CardSlot } from '../../ui/components';

const SPEEDS = [1, 2, 4];

/** Seats around the felt, you at the bottom, everyone else clockwise. */
function seatPos(i: number, n: number): { left: string; top: string } {
  const a = Math.PI / 2 + (2 * Math.PI * i) / n;
  return { left: `${50 + 41 * Math.cos(a)}%`, top: `${48 + 38 * Math.sin(a)}%` };
}

export function Seat({ r, id, f, i, n, heroId }: { r: HandRecord; id: string; f: Frame; i: number; n: number; heroId: string }) {
  const p = r.players.find((x) => x.id === id)!;
  const folded = f.folded.includes(id);
  const cards = r.holes[id];
  const faceUp = !!cards && f.reveal.includes(id) && (!folded || f.kind === 'result');
  const won = f.won[id] ?? 0;
  const says = f.says[id];
  const isDealer = r.buttonId === id;
  const live = !folded && f.kind !== 'result';
  return (
    <div
      className={`rp-seat${folded ? ' folded' : ''}${f.actor === id ? ' acting' : ''}${id === heroId ? ' hero' : ''}${won > 0 ? ' winner' : ''}`}
      style={seatPos(i, n)}
    >
      <div className="rp-cards">
        {folded && f.kind !== 'result' ? null : faceUp ? (
          cards.map((c, k) => <PlayingCard key={k} card={c} size="sm" flip={f.kind === 'result' && id !== heroId} delay={k * 120} />)
        ) : live || f.kind === 'result' ? (
          <>
            <PlayingCard back size="sm" />
            <PlayingCard back size="sm" />
          </>
        ) : null}
      </div>
      <div className="rp-plate">
        <Avatar emoji={p.emoji} size={28} />
        <span>
          <b>{id === heroId ? 'You' : p.name}</b>
          <small className="num">{chips(f.stacks[id] ?? 0)}</small>
        </span>
        {isDealer && <i className="rp-dealer" title="Dealer">D</i>}
      </div>
      {won > 0 ? <em className="rp-tag win">+{chips(won)}</em> : says ? <em className={`rp-tag${folded ? ' out' : ''}`}>{says}</em> : null}
    </div>
  );
}

/** Watch a saved hand back, a move at a time. You're a spectator here: nothing to tap but the scrubber. */
export function Replay({ handKey }: { handKey: string }) {
  const [hand] = useState(() => loadHistory().find((h) => h.key === handKey) ?? null);
  const [report, setReport] = useState<HandReport | null>(() => savedReport(handKey));
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [met] = useState(loadCoachMet);
  const [look] = useState(loadTableLook);
  const frames = useMemo(() => (hand ? buildFrames(hand.record, hand.heroId) : []), [hand]);
  const graded = useMemo(() => (hand && report ? matchDecisions(hand.record, hand.heroId, report.decisions) : new Map<number, Decision>()), [hand, report]);
  const mistakes = useMemo(() => mistakeFrames(frames, graded), [frames, graded]);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const last = frames.length - 1;

  useEffect(() => {
    if (!met) saveCoachMet();
  }, [met]);

  const decisionAt = (i: number): Decision | undefined => {
    const f = frames[i];
    return f && f.action != null ? graded.get(f.action) : undefined;
  };

  // Play on its own, but stop at a move worth a look.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    if (at >= last) {
      setPlaying(false);
      return;
    }
    const f = frames[at];
    const mine = f.action != null && hand?.record.actions[f.action]?.playerId === hand?.heroId;
    const wait = (f.kind === 'deal' ? 1400 : f.kind === 'street' ? 1000 : mine ? 1900 : 1100) / speed;
    const t = setTimeout(() => {
      const next = at + 1;
      setAt(next);
      const d = decisionAt(next);
      if (d && (d.colour === 'red' || d.colour === 'yellow')) setPlaying(false);
    }, wait);
    return () => clearTimeout(t);
  }, [playing, at, speed, frames, graded]);

  const go = (i: number) => {
    setAt(Math.max(0, Math.min(last, i)));
  };
  const step = (d: number) => {
    setPlaying(false);
    go(at + d);
  };
  const jumpMistake = () => {
    if (mistakes.length === 0) return;
    setPlaying(false);
    go(mistakes.find((m) => m > at) ?? mistakes[0]);
  };

  // Arrow keys and space on a keyboard.
  const keys = useRef({ step, setPlaying });
  keys.current = { step, setPlaying };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SUMMARY/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') keys.current.step(1);
      else if (e.key === 'ArrowLeft') keys.current.step(-1);
      else if (e.key === ' ') {
        e.preventDefault();
        keys.current.setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const grade = async () => {
    if (!hand || reviewing) return;
    setError(null);
    setReviewing(true);
    try {
      const out = await reviewAndSave([hand]);
      setReport(out[hand.key] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The review failed.');
    } finally {
      setReviewing(false);
    }
  };

  if (!hand) {
    return (
      <div className="screen train">
        <BackBar title="Replay" />
        <div className="screen-body">
          <p className="muted">This hand isn't saved on this phone any more.</p>
        </div>
      </div>
    );
  }

  const r = hand.record;
  const f = frames[at];
  const order = [...r.players].sort((a, b) => a.seat - b.seat);
  const heroAt = Math.max(0, order.findIndex((p) => p.id === hand.heroId));
  const seated = [...order.slice(heroAt), ...order.slice(0, heroAt)];
  const d = decisionAt(at);
  const heroMove = f.action != null && r.actions[f.action].playerId === hand.heroId;
  const net = recordNet(r, hand.heroId);
  const potBb = r.bigBlind ? f.pot / r.bigBlind : 0;

  return (
    <div className="screen train replay">
      <BackBar
        title={`Hand #${r.number}`}
        right={
          <button type="button" className="chip-btn press" onClick={() => navigate({ name: 'lesson', key: handKey })}>
            Full review
          </button>
        }
      />
      <div className="rp-body">
        <div className="rp-felt" role="img" aria-label={f.text} style={{ ['--felt' as string]: look.felt }}>
          <div className="rp-middle">
            <span className="rp-badge">Replay · {streetName(f.street)}</span>
            <div className="rp-board">
              {[0, 1, 2, 3, 4].map((k) => (k < f.boardCount ? <PlayingCard key={k} card={r.board[k]} size="sm" flip={k === f.boardCount - 1 || (f.boardCount === 3 && k < 3)} /> : <CardSlot key={k} size="sm" />))}
            </div>
            {f.kind !== 'result' && (
              <div className="rp-pot num">
                Pot <b>{chips(f.pot)}</b>
                <small>{r.bigBlind ? ` · ${Number(potBb.toFixed(1))} bb` : ''}</small>
              </div>
            )}
          </div>
          {seated.map((p, k) => (
            <Seat key={p.id} r={r} id={p.id} f={f} i={k} n={seated.length} heroId={hand.heroId} />
          ))}
        </div>

        <div className="rp-scrub" role="group" aria-label="Hand timeline">
          {frames.map((fr, i) => {
            const dd = decisionAt(i);
            const mine = fr.action != null && r.actions[fr.action].playerId === hand.heroId;
            const label = fr.kind === 'deal' ? 'Deal' : fr.kind === 'street' ? streetName(fr.street) : fr.kind === 'result' ? 'Result' : fr.text;
            return (
              <button
                key={i}
                type="button"
                className={`rp-tick ${fr.kind}${mine ? ' mine' : ''}${dd?.colour ? ` ${dd.colour}` : ''}${i === at ? ' on' : ''}${i < at ? ' past' : ''}`}
                aria-label={`${i + 1} of ${frames.length}: ${label}`}
                aria-current={i === at}
                onClick={() => {
                  setPlaying(false);
                  go(i);
                }}
              >
                {fr.kind === 'street' ? streetName(fr.street)[0] : fr.kind === 'result' ? '★' : ''}
              </button>
            );
          })}
        </div>

        <div className="rp-controls">
          <button type="button" className="icon-btn press" aria-label="Previous move" disabled={at === 0} onClick={() => step(-1)}>
            ◀
          </button>
          <button
            type="button"
            className="btn btn-dark rp-play"
            onClick={() => {
              if (!playing && at >= last) go(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? 'Pause' : at >= last ? 'Watch again' : 'Play'}
          </button>
          <button type="button" className="icon-btn press" aria-label="Next move" disabled={at >= last} onClick={() => step(1)}>
            ▶
          </button>
        </div>
        <div className="rp-extras">
          <button type="button" className="chip-btn press" aria-label={`Speed ${speed}x`} onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>
            Speed {speed}×
          </button>
          <button type="button" className="chip-btn press" disabled={mistakes.length === 0} onClick={jumpMistake}>
            {mistakes.length > 0 ? `Jump to my mistakes · ${mistakes.length}` : report ? 'No mistakes' : 'Mistakes'}
          </button>
        </div>

        <div className="rp-coach" aria-live="polite">
          {d && heroMove ? (
            <CoachFeedback key={at} d={d} onPractice={(scenario) => navigate({ name: 'drill', scenario })} />
          ) : heroMove && !report ? (
            reviewing ? (
              <CoachBusy text="Going through your moves…" />
            ) : (
              <CoachSays key={at} quick lines={error ? [error] : ["That's your move. Want me to grade it?"]}>
                <button type="button" className="btn btn-sm btn-dark" onClick={() => void grade()}>
                  {error ? 'Try again' : 'Grade my moves'}
                </button>
              </CoachSays>
            )
          ) : (
            <CoachSays key={at} quick lines={narration(r, f, !met, report, net)}>
              {f.kind === 'result' && report && <ResultExtras report={report} mistakes={mistakes.length} onJump={jumpMistake} />}
              {f.kind === 'result' && !report && !reviewing && (
                <button type="button" className="btn btn-sm btn-dark" onClick={() => void grade()}>
                  Grade my moves
                </button>
              )}
              {f.kind === 'result' && reviewing && <CoachBusy text="Going through your moves…" />}
              {f.kind === 'result' && error && <small className="muted">{error}</small>}
            </CoachSays>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultExtras({ report, mistakes, onJump }: { report: HandReport; mistakes: number; onJump: () => void }) {
  const lesson = handLesson(report);
  return (
    <div className="coach-actions">
      <div className="coach-bubble pop lesson" style={{ ['--i' as string]: 1 }}>
        <small className="coach-label">One thing to take away</small>
        {lesson.text}
      </div>
      {mistakes > 0 && (
        <button type="button" className="btn btn-sm btn-dark" onClick={onJump}>
          Show me my mistakes
        </button>
      )}
    </div>
  );
}

/** The coach's chatter on frames that aren't one of your graded moves. */
function narration(r: HandRecord, f: Frame, intro: boolean, report: HandReport | null, net: number): string[] {
  if (f.kind === 'deal') {
    return [...(intro ? ["Hi, I'm your Coach. I'll talk you through this one."] : []), "Here's the hand. I'll pause at any move worth a look."];
  }
  if (f.kind === 'street') {
    const bbs = r.bigBlind ? Number((f.pot / r.bigBlind).toFixed(1)) : null;
    return [`${f.text.replace('.', '')} is down.${bbs != null ? ` The pot's ${bbs} big blinds.` : ''}`];
  }
  if (f.kind === 'result') {
    const s = net > 0 ? `You won ${chips(net)}.` : net < 0 ? `You lost ${chips(-net)}.` : 'You broke even.';
    return [f.text, report ? s : `${s} I haven't graded this one yet.`];
  }
  const a = r.actions[f.action!];
  const lines = [f.text];
  if ((a.move === 'bet' || a.move === 'raise') && r.bigBlind) lines[0] += ` That's ${Number((a.to / r.bigBlind).toFixed(1))} big blinds.`;
  return lines;
}
