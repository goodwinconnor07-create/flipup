import { useEffect, useRef, useState } from 'react';
import { recordNet, type HandRecord } from '../../game';
import type { HandReport } from '../../gto/types';
import { navigate } from '../../state/store';
import { loadHistory } from '../../state/training';
import { reviewAndSave, savedReport } from '../../train/reviews';
import { drillFor, scenarioTitle } from '../../train/scenarios';
import { CoachBusy, CoachFeedback, CoachSays } from '../../train/Coach';
import { handLesson, summaryLine } from '../../train/coach';
import { GradePill, MiniCards, streetName } from '../../train/widgets';
import { BackBar } from '../../ui/components';

const STREETS = ['preflop', 'flop', 'turn', 'river'] as const;
const BOARD_AT = { preflop: 0, flop: 3, turn: 4, river: 5 };

/** The moves on one street as short chips: "Ollie raises 6", "Connor calls". */
function streetMoves(r: HandRecord, street: string): string[] {
  const name = (id: string) => r.players.find((p) => p.id === id)?.name ?? '?';
  return r.actions
    .filter((a) => a.street === street && !a.outOfTurn)
    .map((a) => {
      const n = name(a.playerId);
      if (a.move === 'fold') return `${n} folds`;
      if (a.move === 'check') return `${n} checks`;
      if (a.move === 'call') return `${n} calls ${a.to}`;
      if (a.move === 'bet') return `${n} bets ${a.to}`;
      if (a.move === 'allin') return `${n} all in ${a.to}`;
      return `${n} raises to ${a.to}`;
    });
}

/** A coach's walk through one hand you played, street by street. */
export function Lesson({ handKey }: { handKey: string }) {
  const [hand] = useState(() => loadHistory().find((h) => h.key === handKey) ?? null);
  const [report, setReport] = useState<HandReport | null>(() => savedReport(handKey));
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!hand) return;
    setError(null);
    setProgress('Solving every street of this hand…');
    try {
      const out = await reviewAndSave([hand]);
      setReport(out[hand.key] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The review failed.');
    } finally {
      setProgress(null);
    }
  };

  // Start once when the screen opens (the ref stops a second review in dev's double effects).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (hand && !report) void run();
  }, []);

  if (!hand) {
    return (
      <div className="screen train">
        <BackBar title="Hand review" />
        <div className="screen-body">
          <p className="muted">This hand isn't saved on this phone any more.</p>
        </div>
      </div>
    );
  }
  const r = hand.record;
  const net = recordNet(r, hand.heroId);
  const practise = (scenario: string) => navigate({ name: 'drill', scenario });
  const colours = report?.summary.colours;

  return (
    <div className="screen train">
      <BackBar
        title={`Hand #${r.number}`}
        right={
          <button type="button" className="chip-btn press" onClick={() => navigate({ name: 'replay', key: handKey })}>
            Watch it back
          </button>
        }
      />
      <div className="screen-body">
        <section className="lesson-head">
          <div className="slot-row">
            <MiniCards cards={r.holes[hand.heroId] ?? []} size="md" />
            <span className="muted">on</span>
            {r.board.length ? <MiniCards cards={r.board} /> : <span className="muted">no flop</span>}
          </div>
          <p className="muted">
            {r.players.length} players · blinds {r.smallBlind}/{r.bigBlind} ·{' '}
            <b className={net > 0 ? 'good' : net < 0 ? 'bad' : ''}>
              {net > 0 ? 'won ' : net < 0 ? 'lost ' : 'broke even'}
              {net !== 0 ? Math.abs(net) : ''}
            </b>
          </p>
          {colours && (
            <div className="slot-row">
              <GradePill colour="green" label={`${colours.green} good`} />
              <GradePill colour="yellow" label={`${colours.yellow} close`} />
              <GradePill colour="red" label={`${colours.red} costly`} />
              {report!.summary.total_ev_loss_bb > 0.01 && <span className="muted">{report!.summary.total_ev_loss_bb.toFixed(2)}bb given up</span>}
            </div>
          )}
        </section>

        {progress && <CoachBusy text={progress} />}
        {error && (
          <CoachSays quick lines={[error]}>
            <button type="button" className="btn btn-sm btn-dark" onClick={() => void run()}>
              Try again
            </button>
          </CoachSays>
        )}
        {report && <LessonSummary report={report} onPractice={practise} />}

        {report &&
          STREETS.filter((s) => s === 'preflop' || r.board.length >= BOARD_AT[s]).map((s) => {
            const ds = report.decisions.filter((d) => d.street === s);
            const moves = streetMoves(r, s);
            if (!ds.length && !moves.length) return null;
            return (
              <section key={s} className="t-list">
                <div className="street-head">
                  <span className="h3">{streetName(s)}</span>
                  {BOARD_AT[s] > 0 && <MiniCards cards={r.board.slice(0, BOARD_AT[s])} />}
                </div>
                {moves.length > 0 && (
                  <div className="act-log">
                    {moves.map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                  </div>
                )}
                {ds.map((d, i) => (
                  <CoachFeedback key={i} d={d} onPractice={practise} compact />
                ))}
              </section>
            );
          })}

        {report?.notes.map((n, i) => (
          <p key={i} className="note">
            {n}
          </p>
        ))}
      </div>
    </div>
  );
}

/** The coach opens the review: how it went, and the one thing to take from it. */
function LessonSummary({ report, onPractice }: { report: HandReport; onPractice: (scenario: string) => void }) {
  const lesson = handLesson(report);
  const drill = lesson.scenario ? drillFor(lesson.scenario) : null;
  return (
    <CoachSays lines={report.decisions.length === 0 ? [lesson.text] : [summaryLine(report), lesson.text]} status="Here's how it went">
      {drill && (
        <button type="button" className="btn btn-sm btn-dark" onClick={() => onPractice(drill)}>
          Practise {scenarioTitle(drill).toLowerCase()}
        </button>
      )}
    </CoachSays>
  );
}
