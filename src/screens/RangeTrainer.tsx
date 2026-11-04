// Range training: a hand played to the turn or river with the whole action log, one decision, then why, with the
// opponent's range broken down and how your hand does against each part of it.

import { useMemo, useState } from 'react';
import { read, write } from '../state/persist';
import { analyse, bb, breakEven, equityAgainst, gradeOf, optionsFor, priceToCall, replay, shareOf, type Grade, type OptionId, type Role, type Scenario, type Street } from '../train/ranges/model';
import { SCENARIOS } from '../train/ranges/scenarios';
import { BackBar, PlayingCard } from '../ui/components';
import { haptic } from '../ui/effects';

const KEY = 'flipup.ranges';

/** Your best grade on each hand, by id. */
export function loadRangeProgress(): Record<string, Grade> {
  const saved = read<Record<string, Grade>>(KEY);
  return saved && typeof saved === 'object' ? saved : {};
}

function saveGrade(id: string, grade: Grade) {
  const all = loadRangeProgress();
  const rank = { mistake: 0, ok: 1, best: 2 };
  if (all[id] === undefined || rank[grade] > rank[all[id]]) write(KEY, { ...all, [id]: grade });
}

/** Hands you haven't got right yet first, then the rest. */
function nextHand(after: string | null): Scenario {
  const done = loadRangeProgress();
  const start = after ? SCENARIOS.findIndex((s) => s.id === after) + 1 : 0;
  const order = [...SCENARIOS.slice(start), ...SCENARIOS.slice(0, start)];
  return order.find((s) => done[s.id] !== 'best' && s.id !== after) ?? order[0];
}

const STREET_NAME: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const ROLE: Record<Role, string> = { value: 'Value', bluff: 'Bluff', calls: 'Calls', folds: 'Folds', raises: 'Raises' };
const GRADE: Record<Grade, string> = { best: 'Best play', ok: 'Also good', mistake: 'Not this time' };
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function RangeTrainer() {
  const [scenario, setScenario] = useState(() => nextHand(null));
  const [pick, setPick] = useState<OptionId | null>(null);
  const r = useMemo(() => replay(scenario), [scenario]);
  const options = useMemo(() => optionsFor(scenario, r), [scenario, r]);
  const views = useMemo(() => (pick ? analyse(scenario) : []), [scenario, pick]);
  const done = loadRangeProgress();
  const solved = SCENARIOS.filter((s) => done[s.id] === 'best').length;
  const decision = scenario.board.length === 4 ? 'turn' : 'river';

  const answer = (id: OptionId) => {
    if (pick) return;
    const grade = gradeOf(scenario, id);
    saveGrade(scenario.id, grade);
    haptic(grade === 'mistake' ? 'error' : 'success');
    setPick(id);
  };
  const next = () => {
    setScenario(nextHand(scenario.id));
    setPick(null);
    window.scrollTo({ top: 0 });
  };

  const grade = pick ? gradeOf(scenario, pick) : null;
  const best = options.find((o) => o.id === scenario.best)!;
  const facing = r.toCall > 0;
  // The board as it came, street by street.
  const boardAt: Record<Street, string[]> = { preflop: [], flop: scenario.board.slice(0, 3), turn: scenario.board.slice(3, 4), river: scenario.board.slice(4, 5) };
  const streets: Street[] = ['preflop', 'flop', 'turn', 'river'].slice(0, scenario.board.length - 1) as Street[];

  return (
    <div className="screen ranges">
      <BackBar title="Range training" right={<span className="rt-count">{solved} of {SCENARIOS.length}</span>} />
      <div className="rt-page">
        <header className="rt-head">
          <span className="rt-concept">{scenario.concept}</span>
          <h1 className="rt-title">{scenario.title}</h1>
          <p className="rt-sub">
            You’re {scenario.hero.pos}, they’re {scenario.villain.pos} ({scenario.villainType.toLowerCase()}) · {scenario.stack}bb deep
          </p>
        </header>

        <section className="rt-table" aria-label="The hand">
          <div className="rt-board">
            {scenario.board.map((c, i) => (
              <PlayingCard key={c} card={c} size="md" flip delay={i * 80} />
            ))}
          </div>
          <div className="rt-me">
            <span className="rt-label">Your hand</span>
            <span className="rt-hole">
              {scenario.hero.cards.map((c) => (
                <PlayingCard key={c} card={c} size="md" />
              ))}
            </span>
            <span className="rt-pot">
              Pot <b className="num">{bb(r.pot)}</b>
            </span>
          </div>
        </section>

        <section className="rt-log" aria-label="Hand log">
          {streets.map((st) => (
            <div key={st} className="rt-street">
              <div className="rt-street-head">
                <b>{STREET_NAME[st]}</b>
                {boardAt[st].length > 0 && (
                  <span className="rt-street-cards">
                    {boardAt[st].map((c) => (
                      <PlayingCard key={c} card={c} size="sm" />
                    ))}
                  </span>
                )}
                {st !== 'preflop' && r.potAt[st] !== undefined && <small className="num">pot {bb(r.potAt[st]!)}</small>}
              </div>
              <ul>
                {r.lines
                  .filter((l) => l.street === st)
                  .map((l, i) => (
                    <li key={i}>{l.text}</li>
                  ))}
                {st === decision && <li className="rt-now">{facing ? 'Your move: call, fold or raise?' : 'Your move'}</li>}
              </ul>
            </div>
          ))}
        </section>

        {!pick ? (
          <section className="rt-options" aria-label="Your options">
            {options.map((o) => (
              <button key={o.id} type="button" className="btn btn-outline rt-option press" onClick={() => answer(o.id)}>
                {o.label}
              </button>
            ))}
          </section>
        ) : (
          <section className="rt-review" aria-live="polite">
            <div className={`rt-grade rt-${grade}`}>
              <b>{GRADE[grade!]}</b>
              <span>{pick === scenario.best ? best.label : `Best: ${best.label}`}</span>
            </div>
            <p className="rt-why">{scenario.why}</p>
            <div className="rt-numbers">
              {facing ? (
                <>
                  <span>
                    You need <b>{pct(priceToCall(r))}</b> to call
                  </span>
                  <span>
                    You win <b>{pct(equityAgainst(views, ['value', 'bluff']))}</b> against their range
                  </span>
                </>
              ) : scenario.bluff ? (
                <>
                  <span>
                    A {best.label.toLowerCase()} needs <b>{pct(breakEven(r, best.amount))}</b> folds
                  </span>
                  <span>
                    They fold <b>{pct(shareOf(views, ['folds']))}</b> of the time
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Against the hands that would call a bet you win <b>{pct(equityAgainst(views, ['calls', 'raises']))}</b>
                  </span>
                  <span>
                    They’d fold <b>{pct(shareOf(views, ['folds']))}</b>
                  </span>
                </>
              )}
            </div>

            <h2 className="rt-h">What each street told you</h2>
            <ol className="rt-clues">
              {scenario.clues.map((c, i) => (
                <li key={i}>
                  <b>{STREET_NAME[c.street]}</b> {c.text}
                </li>
              ))}
            </ol>

            <h2 className="rt-h">Their range now</h2>
            <ul className="rt-range">
              {views.map((v) => {
                const share = v.weight / views.reduce((n, x) => n + x.weight, 0);
                return (
                  <li key={v.group.label} className={`rt-group${v.equity >= 0.5 ? ' rt-ahead' : ''}`}>
                    <span className="rt-group-top">
                      <span className="rt-role">{ROLE[v.group.role]}</span>
                      <span className="rt-group-name">{v.group.label}</span>
                      <span className="rt-share num">{pct(share)}</span>
                    </span>
                    <span className="rt-bar" aria-label={`You win ${pct(v.equity)} against these`}>
                      <i style={{ width: `${Math.round(v.equity * 100)}%` }} />
                    </span>
                    <small className="muted">
                      {v.combos} combo{v.combos === 1 ? '' : 's'} · you win {pct(v.equity)}
                    </small>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn btn-dark rt-next press" onClick={next}>
              Next hand
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
