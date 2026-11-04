// Range training: a hand played to the turn or river with the whole action log, one decision, then why: what each
// street told you, every opponent's range broken down with how your hand does against each part of it, and what
// each play wins on average.

import { useMemo, useState } from 'react';
import { read, write } from '../state/persist';
import { analyse, bb, gradeOf, optionsFor, replay, spotOf, type Grade, type OptionId, type RangeGroup, type Scenario, type Street } from '../train/ranges/model';
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
const GRADE: Record<Grade, string> = { best: 'Best play', ok: 'Also good', mistake: 'Not this time' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${bb(Math.abs(Math.round(n * 10) / 10))}`;

/** What a group does, in a few words: "Value", or "Folds · calls ⅓" when a small bet changes its mind. */
function respond(g: RangeGroup, facing: boolean): string {
  if (facing) return g.role === 'value' ? 'Value' : g.role === 'bluff' ? 'Bluff' : 'Called';
  const word = { calls: 'Calls', folds: 'Folds', raises: 'Raises', value: 'Value', bluff: 'Bluff' };
  const extra = [g.small && g.small !== g.role ? `${word[g.small].toLowerCase()} ⅓` : '', g.big && g.big !== g.role ? `${word[g.big].toLowerCase()} to an overbet` : ''].filter(Boolean);
  return [word[g.role], ...extra].join(' · ');
}

export function RangeTrainer() {
  const [scenario, setScenario] = useState(() => nextHand(null));
  const [pick, setPick] = useState<OptionId | null>(null);
  const r = useMemo(() => replay(scenario), [scenario]);
  const options = useMemo(() => optionsFor(scenario, r), [scenario, r]);
  const views = useMemo(() => (pick ? analyse(scenario, r) : []), [scenario, r, pick]);
  // What each play wins on average (worked out once you've answered).
  const evs = useMemo(() => {
    if (!pick) return null;
    if (r.toCall > 0) {
      const spot = spotOf(scenario, r);
      return { equity: spot.equity, price: spot.price!, rows: [{ id: 'fold' as OptionId, ev: 0 }, { id: 'call' as OptionId, ev: spot.evCall! }] };
    }
    const spot = spotOf(scenario, r);
    const rows = [{ id: 'check' as OptionId, ev: spot.evCheck! }, ...(['bet33', 'bet75', 'bet125'] as const).map((id) => ({ id: id as OptionId, ev: spotOf(scenario, r, id).bet!.ev }))];
    return { equity: spot.equity, price: 0, rows };
  }, [scenario, r, pick]);
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
  const label = (id: OptionId) => options.find((o) => o.id === id)?.label ?? id;
  // The board as it came, street by street.
  const boardAt: Record<Street, string[]> = { preflop: [], flop: scenario.board.slice(0, 3), turn: scenario.board.slice(3, 4), river: scenario.board.slice(4, 5) };
  const streets: Street[] = ['preflop', 'flop', 'turn', 'river'].slice(0, scenario.board.length - 1) as Street[];
  const inPot = scenario.opponents.filter((o) => r.live.includes(o.pos));
  const topEv = evs ? Math.max(...evs.rows.map((x) => Math.abs(x.ev)), 0.1) : 1;

  return (
    <div className="screen ranges">
      <BackBar title="Range training" right={<span className="rt-count">{solved} of {SCENARIOS.length}</span>} />
      <div className="rt-page">
        <header className="rt-head">
          <span className="rt-concept">{scenario.concept}</span>
          <h1 className="rt-title">{scenario.title}</h1>
          <p className="rt-sub">
            You’re {scenario.hero.pos} · {scenario.table === 9 ? '9-handed live' : '6-handed'} · {scenario.stack}bb deep
          </p>
          <ul className="rt-players">
            {scenario.opponents.map((o) => (
              <li key={o.pos} className={r.live.includes(o.pos) ? '' : 'rt-out'}>
                <b>{o.pos}</b> {o.type.toLowerCase()}
                {r.live.includes(o.pos) ? '' : ' (folded)'}
              </li>
            ))}
          </ul>
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

            {evs && (
              <div className="rt-numbers">
                {facing ? (
                  <>
                    <span>
                      You need <b>{pct(evs.price)}</b> to call
                    </span>
                    <span>
                      You win <b>{pct(evs.equity)}</b> against {inPot.length > 1 ? 'everyone still in' : 'their range'}
                    </span>
                  </>
                ) : (
                  <span>
                    At a showdown now you’d win <b>{pct(evs.equity)}</b> of the pot{inPot.length > 1 ? ' against everyone still in' : ''}
                  </span>
                )}
                <h3 className="rt-ev-title">What each play wins on average</h3>
                <ul className="rt-evs">
                  {evs.rows.map((row) => (
                    <li key={row.id} className={`${row.id === scenario.best ? 'rt-ev-best' : ''}${row.id === pick ? ' rt-ev-pick' : ''}`}>
                      <span className="rt-ev-name">{label(row.id)}</span>
                      <span className="rt-ev-bar">
                        <i className={row.ev >= 0 ? 'up' : 'down'} style={{ width: `${Math.round((Math.abs(row.ev) / topEv) * 100)}%` }} />
                      </span>
                      <b className="num">{signed(row.ev)}</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h2 className="rt-h">What each street told you</h2>
            <ol className="rt-clues">
              {scenario.clues.map((c, i) => (
                <li key={i}>
                  <b>{STREET_NAME[c.street]}</b> {c.text}
                </li>
              ))}
            </ol>

            {views.map((v) => {
              const total = v.groups.reduce((n, g) => n + g.weight, 0);
              return (
                <div key={v.opponent.pos} className="rt-opp">
                  <h2 className="rt-h">
                    {views.length > 1 ? `${v.opponent.pos}’s range now` : 'Their range now'}
                    <small> {v.opponent.type.toLowerCase()}</small>
                  </h2>
                  <ul className="rt-range">
                    {v.groups.map((g) => (
                      <li key={g.group.label + g.group.role} className={`rt-group${g.equity >= 0.5 ? ' rt-ahead' : ''}`}>
                        <span className="rt-group-top">
                          <span className="rt-role">{respond(g.group, facing)}</span>
                          <span className="rt-group-name">{g.group.label}</span>
                          <span className="rt-share num">{pct(g.weight / total)}</span>
                        </span>
                        <span className="rt-bar" aria-label={`You win ${pct(g.equity)} against these`}>
                          <i style={{ width: `${Math.round(g.equity * 100)}%` }} />
                        </span>
                        <small className="muted">
                          {g.combos} combo{g.combos === 1 ? '' : 's'} · you win {pct(g.equity)} against these
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <button type="button" className="btn btn-dark rt-next press" onClick={next}>
              Next hand
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
