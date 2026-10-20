import { useEffect, useRef, useState } from 'react';
import { getDrill } from '../../gto/api';
import type { Drill as DrillData } from '../../gto/types';
import { recordDrill } from '../../state/training';
import { CoachSays } from '../../train/Coach';
import { drillLines } from '../../train/coach';
import { scenarioTitle } from '../../train/scenarios';
import { bb, MiniCards, pct, prettyAction, splitCards, StrategyGrid, streetName } from '../../train/widgets';
import { BackBar, Spinner } from '../../ui/components';

/** A library drill: a hand in a classic spot, your answer, then GTO's. */
export function Drill({ scenario }: { scenario: string }) {
  const [drill, setDrill] = useState<DrillData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ n: 0, green: 0, yellow: 0 });

  const next = async () => {
    setDrill(null);
    setPicked(null);
    setError(null);
    try {
      setDrill(await getDrill(scenario, Math.floor(Math.random() * 1e9)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't deal a drill.");
    }
  };

  // Deal the first hand when the screen opens (once, even with dev's double effects).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void next();
  }, []);

  const pick = (action: string) => {
    if (!drill || picked) return;
    setPicked(action);
    const o = drill.answer.options.find((x) => x.action === action);
    if (o?.colour) {
      recordDrill(scenario, o.colour, o.ev_loss_bb);
      setScore((s) => ({ n: s.n + 1, green: s.green + (o.colour === 'green' ? 1 : 0), yellow: s.yellow + (o.colour === 'yellow' ? 1 : 0) }));
    }
  };

  const chosen = drill && picked ? drill.answer.options.find((o) => o.action === picked) : null;
  const heroClass = drill?.hand_class ?? null;

  return (
    <div className="screen train">
      <BackBar
        title={scenarioTitle(scenario)}
        right={score.n > 0 ? <span className="grade-pill">{`${score.green}/${score.n}`}</span> : undefined}
      />
      <div className="screen-body">
        {error && (
          <>
            <p className="note">{error}</p>
            <button type="button" className="btn btn-dark" onClick={() => void next()}>
              Try again
            </button>
          </>
        )}
        {!drill && !error && <Spinner label="Dealing…" />}
        {drill && (
          <>
            <div className="kv">
              <span>
                You are <b>{drill.position}</b>
              </span>
              {drill.villain && (
                <span>
                  vs <b>{drill.villain}</b>
                </span>
              )}
              <span>
                {streetName(drill.street)} · pot <b>{bb(drill.pot_bb)}</b>
              </span>
              {drill.to_call_bb > 0 && (
                <span>
                  to call <b>{bb(drill.to_call_bb)}</b>
                </span>
              )}
              <span>
                stacks <b>{bb(drill.stack_bb)}</b>
              </span>
            </div>
            {drill.history.length > 0 && (
              <ul className="history">
                {drill.history.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
            {drill.board.length > 0 && (
              <div className="drill-board">
                <MiniCards cards={drill.board} size="md" />
              </div>
            )}
            <div className="drill-hand">
              <MiniCards cards={splitCards(drill.hand)} size="md" />
            </div>
            <p className="h3" style={{ textAlign: 'center' }}>
              {picked ? 'GTO says' : 'What do you do?'}
            </p>
            <div className="t-list">
              {drill.answer.options.map((o) => (
                <button
                  key={o.action}
                  type="button"
                  className={`btn answer-btn ${picked ? (o.colour ?? '') : 'btn-outline'}${picked === o.action ? ' picked' : ''}`}
                  disabled={!!picked}
                  onClick={() => pick(o.action)}
                >
                  <span>{prettyAction(o.action)}</span>
                  {picked && (
                    <small>
                      {pct(o.frequency)} · {o.ev_bb >= 0 ? '+' : ''}
                      {bb(o.ev_bb)}
                    </small>
                  )}
                </button>
              ))}
            </div>
            {chosen && (
              <CoachSays
                key={picked}
                quick
                tone={chosen.colour}
                lines={drillLines(chosen.colour, drill.answer.best_action, chosen.frequency, chosen.ev_loss_bb)}
              />
            )}
            {chosen && (
              <article className={`decision ${chosen.colour ?? ''}`}>
                <div className="decision-band">
                  <b>
                    {chosen.colour === 'green'
                      ? 'Good'
                      : chosen.colour === 'yellow'
                        ? 'Close call'
                        : `${chosen.colour === 'red' ? 'Costly: ' : ''}GTO prefers ${prettyAction(drill.answer.best_action).toLowerCase()}`}
                  </b>
                  {chosen.ev_loss_bb > 0.005 && <small>−{bb(chosen.ev_loss_bb)}</small>}
                </div>
                <div className="decision-body">
                  {chosen.why && <p className="note">{chosen.why}</p>}
                  {drill.tips.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                  {drill.grid && Object.keys(drill.grid).length > 0 && (
                    <details className="lesson-sec">
                      <summary>GTO's whole range here</summary>
                      <StrategyGrid grid={drill.grid} mine={heroClass} />
                    </details>
                  )}
                </div>
              </article>
            )}
          </>
        )}
      </div>
      {picked && (
        <div className="screen-foot">
          <button type="button" className="btn btn-dark btn-xl" onClick={() => void next()}>
            Next hand
          </button>
        </div>
      )}
    </div>
  );
}
