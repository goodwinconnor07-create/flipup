// Pieces shared by the training screens: GTO action colours, frequency bars, the 13x13 range
// grid, the card picker, and the colour-graded decision card used by reviews and custom hands.

import { useState } from 'react';
import { rankLabel, SUIT_SYMBOL, suitOf, type Card } from '../game';
import { PlayingCard } from '../ui/components';
import type { Colour, Decision, Grid, PracticeHand } from '../gto/types';
import { drillFor, scenarioTitle } from './scenarios';

// ── Actions ─────────────────────────────────────────────────────────────────

/** Solver labels look like "fold", "call", "bet 75% (6.00)", "raise to 22.50", "raise all-in (100.00)". */
export function actionKind(label: string): 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin' {
  const l = label.toLowerCase();
  if (l.includes('all-in') || l.startsWith('allin')) return 'allin';
  const head = l.split(' ')[0];
  if (head === 'fold' || head === 'check' || head === 'call' || head === 'bet' || head === 'raise') return head;
  return 'bet';
}

/** CSS class for each label in a list: bets and raises get darker the bigger they are. */
export function actionClasses(labels: string[]): Record<string, string> {
  const aggressive = labels.filter((l) => ['bet', 'raise'].includes(actionKind(l)));
  const out: Record<string, string> = {};
  for (const l of labels) {
    const k = actionKind(l);
    if (k === 'bet' || k === 'raise') {
      const i = aggressive.indexOf(l);
      const step = aggressive.length <= 1 ? 2 : 1 + Math.round((2 * i) / (aggressive.length - 1));
      out[l] = `act-bet-${step}`;
    } else out[l] = `act-${k}`;
  }
  return out;
}

/** "bet 75% (6.00)" → "Bet 75%", "raise to 22.50" → "Raise to 22.5". */
export function prettyAction(label: string): string {
  const l = label.replace(/\s*\(([\d.]+)\)$/, (_, amt: string) => (/%/.test(label) ? '' : ` ${trim(amt)}`));
  const t = l.replace(/to ([\d.]+)/, (_, a: string) => `to ${trim(a)}`);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const trim = (s: string) => String(Number(Number(s).toFixed(2)));

export const pct = (x: number | null | undefined, digits = 0) => (x == null ? '–' : `${(100 * x).toFixed(digits)}%`);
export const bb = (x: number | null | undefined) => (x == null ? '–' : `${Number(x.toFixed(2))}bb`);

/** A stacked bar of action frequencies. */
export function MixBar({ mix, legend = true }: { mix: Record<string, number>; legend?: boolean }) {
  const labels = Object.keys(mix).filter((k) => k !== 'weight');
  const cls = actionClasses(labels);
  const total = labels.reduce((s, l) => s + Math.max(0, mix[l]), 0) || 1;
  return (
    <div>
      <div className="mix" role="img" aria-label={labels.map((l) => `${prettyAction(l)} ${pct(mix[l] / total)}`).join(', ')}>
        {labels.map((l) => (mix[l] > 0 ? <span key={l} className={cls[l]} style={{ width: `${(100 * mix[l]) / total}%` }} /> : null))}
      </div>
      {legend && (
        <div className="mix-legend">
          {labels
            .filter((l) => mix[l] >= 0.005)
            .map((l) => (
              <span key={l}>
                <i className={cls[l]} />
                {prettyAction(l)} {pct(mix[l] / total)}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Range grid ──────────────────────────────────────────────────────────────

const RANKS = 'AKQJT98765432';

export function gridClass(row: number, col: number): string {
  const a = RANKS[row];
  const b = RANKS[col];
  if (row === col) return a + b;
  return row < col ? `${a}${b}s` : `${b}${a}o`;
}

/** The class of two cards, e.g. ["Ah","Kh"] → "AKs". */
export function classOf(cards: string[]): string | null {
  if (cards.length !== 2) return null;
  const [x, y] = [...cards].sort((p, q) => RANKS.indexOf(p[0]) - RANKS.indexOf(q[0]));
  if (x[0] === y[0]) return x[0] + y[0];
  return `${x[0]}${y[0]}${x[1] === y[1] ? 's' : 'o'}`;
}

/**
 * GTO's strategy for every hand class: each square is split by how often each action is taken,
 * and faded by how much of the class is still in the range. Tap a square to see its numbers.
 */
export function StrategyGrid({ grid, mine }: { grid: Grid; mine?: string | null }) {
  const [sel, setSel] = useState<string | null>(mine ?? null);
  const labels = [...new Set(Object.values(grid).flatMap((c) => Object.keys(c).filter((k) => k !== 'weight')))];
  const cls = actionClasses(labels);
  const maxW = Math.max(1e-9, ...Object.values(grid).map((c) => c.weight ?? 1));
  const cell = sel ? grid[sel] : null;
  return (
    <div className="grid-wrap">
      <div className="grid13" role="grid" aria-label="GTO strategy by hand">
        {Array.from({ length: 169 }, (_, i) => {
          const r = Math.floor(i / 13);
          const c = i % 13;
          const name = gridClass(r, c);
          const g = grid[name];
          const w = g ? (g.weight ?? 1) / maxW : 0;
          return (
            <button
              key={name}
              type="button"
              className={`${g && w > 0.02 ? '' : 'out'}${sel === name ? ' sel' : ''}${mine === name ? ' mine' : ''}`}
              onClick={() => setSel(name)}
              aria-label={name}
            >
              {g &&
                labels.map((l) =>
                  (g[l] ?? 0) > 0 ? (
                    <span key={l} className={`fill ${cls[l]}`} style={{ width: `${100 * (g[l] ?? 0)}%`, opacity: 0.35 + 0.65 * Math.min(1, w) }} />
                  ) : null,
                )}
              <b>{name}</b>
            </button>
          );
        })}
      </div>
      <div className="grid-detail">
        {sel && cell ? (
          <>
            <b>
              {sel}
              {mine === sel ? ' (your hand)' : ''}
            </b>
            <MixBar mix={Object.fromEntries(labels.map((l) => [l, cell[l] ?? 0]))} />
          </>
        ) : sel ? (
          <p className="muted">{sel} isn't in this range here: GTO wouldn't have it by this point.</p>
        ) : (
          <p className="muted">Tap a hand to see how GTO plays it.</p>
        )}
      </div>
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────

const SUITS = ['s', 'h', 'd', 'c'] as const;

/** All 52 cards; taken ones are greyed out. */
export function CardPicker({
  taken,
  onPick,
  selected,
  highlighted,
}: {
  taken: Set<string>;
  onPick: (c: Card) => void;
  selected?: string | null;
  /** Cards already picked in this step: shown selected and tappable to unpick. */
  highlighted?: Set<string>;
}) {
  return (
    <div className="picker" role="grid" aria-label="Pick a card">
      {SUITS.flatMap((s) =>
        [...RANKS].map((r) => {
          const c = r + s;
          return (
            <button
              key={c}
              type="button"
              className={`suit-${s}${selected === c || highlighted?.has(c) ? ' on' : ''}`}
              disabled={taken.has(c) && selected !== c && !highlighted?.has(c)}
              onClick={() => onPick(c)}
              aria-label={c}
            >
              <span>{rankLabel(c)}</span>
              <span>{SUIT_SYMBOL[suitOf(c)]}</span>
            </button>
          );
        }),
      )}
    </div>
  );
}

export function MiniCards({ cards, size = 'sm' }: { cards: string[]; size?: 'sm' | 'md' }) {
  return (
    <span className="t-cards">
      {cards.map((c, i) => (
        <PlayingCard key={i} card={c} size={size} />
      ))}
    </span>
  );
}

/** "AhKd" or "Ah Kd" → ["Ah","Kd"]. */
export function splitCards(s: string | undefined | null): string[] {
  if (!s) return [];
  return s.replace(/\s+/g, '').match(/[2-9TJQKA][shdc]/g) ?? [];
}

// ── Grades ──────────────────────────────────────────────────────────────────

const COLOUR_WORD: Record<Colour, string> = { green: 'GTO', yellow: 'Close', red: 'Off' };

export function GradePill({ colour, label }: { colour: Colour | null | undefined; label?: string }) {
  if (!colour) return <span className="grade-pill">{label ?? 'Not graded'}</span>;
  return <span className={`grade-pill ${colour}`}>{label ?? COLOUR_WORD[colour]}</span>;
}

export function Dots({ colours }: { colours: (Colour | null)[] }) {
  return (
    <span className="dots" aria-hidden>
      {colours.map((c, i) => (
        <i key={i} className={`dot ${c ?? ''}`} />
      ))}
    </span>
  );
}

const STREET_NAME: Record<string, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
export const streetName = (s: string) => STREET_NAME[s] ?? s;

function moveText(d: Decision, who: string): string {
  if (!d.action) return `${who === 'You' ? 'Your' : `${who}'s`} move`;
  const { move, to_bb } = d.action;
  if (move === 'fold' || move === 'check') return `${who} ${move === 'fold' ? 'folded' : 'checked'}`;
  if (move === 'call') return `${who} called ${bb(to_bb)}`;
  if (move === 'bet') return `${who} bet ${bb(to_bb)}`;
  if (move === 'allin') return `${who} went all in (${bb(to_bb)})`;
  return `${who} raised to ${bb(to_bb)}`;
}

/**
 * One decision, coach style: the colour band says how it went, then the numbers, GTO's mix for
 * your hand, the EV of every option, the lesson sections, a range grid and a practice quiz.
 */
export function DecisionCard({
  d,
  onPractice,
  defaultOpen = false,
  who = 'You',
}: {
  d: Decision;
  onPractice?: (scenario: string) => void;
  defaultOpen?: boolean;
  /** Who made the move ("You", or a position for other players in a custom hand). */
  who?: string;
}) {
  const colour = d.pending ? null : d.colour;
  const labels = d.actions ?? d.gto?.map((g) => g.action) ?? [];
  const best = d.best_action;
  const mixForHand = d.gto && d.gto.some((g) => g.frequency != null) ? Object.fromEntries(d.gto.map((g) => [g.action, g.frequency ?? 0])) : null;
  const drill = d.scenario ? drillFor(d.scenario) : null;
  const heroClass = d.hand_class ?? classOf(splitCards(d.hand));
  return (
    <article className={`decision ${colour ?? ''}`}>
      <div className="decision-band">
        <b>{d.pending ? `${who === 'You' ? 'What to do now' : `${who} to act`}${d.hand ? ` with ${d.hand}` : ''}` : moveText(d, who)}</b>
        {colour ? <GradePill colour={colour} /> : d.pending ? <span className="grade-pill">Next</span> : null}
      </div>
      <div className="decision-body">
        {d.colour_reason && !d.pending && <p className="note">{d.colour_reason}</p>}
        <div className="kv">
          <span>
            Position <b>{d.position}</b>
          </span>
          <span>
            Pot <b>{bb(d.pot_bb)}</b>
          </span>
          {d.to_call_bb > 0 && (
            <span>
              To call <b>{bb(d.to_call_bb)}</b>
            </span>
          )}
          {d.spr != null && (
            <span>
              SPR <b>{d.spr.toFixed(1)}</b>
            </span>
          )}
          {d.equity != null && (
            <span>
              Equity <b>{pct(d.equity)}</b>
            </span>
          )}
          {d.scenario && (
            <span>
              Spot <b>{scenarioTitle(d.scenario)}</b>
            </span>
          )}
        </div>
        {d.spot_text && <p className="muted">{d.spot_text}</p>}

        {mixForHand && (
          <div>
            <p className="section-title">GTO with {d.hand ? 'your hand' : 'this hand'}</p>
            <MixBar mix={mixForHand} />
          </div>
        )}
        {!mixForHand && d.gto_range && (
          <div>
            <p className="section-title">GTO with the whole range</p>
            <MixBar mix={d.gto_range} />
          </div>
        )}

        {d.gto && d.gto.length > 0 && (
          <table className="ev-table">
            <tbody>
              <tr>
                <td className="muted">Option</td>
                <td className="muted">GTO</td>
                <td className="muted">EV</td>
              </tr>
              {d.gto.map((g) => (
                <tr key={g.action} className={`${g.action === best ? 'best' : ''}${g.action === d.matched_action ? ' mine' : ''}`}>
                  <td>{prettyAction(g.action)}</td>
                  <td>{g.frequency == null ? '–' : pct(g.frequency)}</td>
                  <td>{g.ev_bb >= 0 ? '+' : ''}{bb(g.ev_bb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {d.ev_loss_bb != null && d.ev_loss_bb > 0.005 && !d.pending && (
          <p className="muted">
            Cost against the best option: <b>{bb(d.ev_loss_bb)}</b>
            {d.ev_loss_pct_pot != null ? ` (${d.ev_loss_pct_pot.toFixed(1)}% of the pot)` : ''}
          </p>
        )}

        {d.lesson && d.lesson.length > 0 ? (
          d.lesson.map((s, i) => (
            <details key={s.title} className="lesson-sec" open={defaultOpen || i === d.lesson!.length - 1}>
              <summary>{s.title}</summary>
              {s.body.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </details>
          ))
        ) : d.explanation.length > 0 ? (
          <details className="lesson-sec" open>
            <summary>Why</summary>
            {d.explanation.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </details>
        ) : null}

        {d.grid && Object.keys(d.grid).length > 0 && (
          <details className="lesson-sec">
            <summary>GTO's whole range here</summary>
            <StrategyGrid grid={d.grid} mine={heroClass} />
          </details>
        )}

        {d.practice && d.practice.length > 0 && !d.pending && <PracticeQuiz hands={d.practice} labels={labels} />}

        {drill && onPractice && !d.pending && colour && colour !== 'green' && (
          <button type="button" className="btn btn-outline" onClick={() => onPractice(drill)}>
            Practise {scenarioTitle(drill).toLowerCase()}
          </button>
        )}
        {d.note && <p className="note">{d.note}</p>}
        {d.assumptions && d.assumptions.length > 0 && <p className="muted">Assumed: {d.assumptions.join(' ')}</p>}
      </div>
    </article>
  );
}

// ── Practice ────────────────────────────────────────────────────────────────

/** Grades a pick from a practice hand by how much EV it gives up. */
export function gradePick(p: PracticeHand, action: string, pot?: number): { colour: Colour; loss: number } {
  const best = Math.max(...p.options.map((o) => o.ev_bb));
  const o = p.options.find((x) => x.action === action);
  if (!o) return { colour: 'red', loss: 0 };
  const loss = Math.max(0, best - o.ev_bb);
  const scale = pot && pot > 0 ? (100 * loss) / pot : loss * 10;
  const colour: Colour = loss <= 0.005 || o.frequency >= 0.25 ? 'green' : scale <= 2.5 || o.frequency >= 0.05 ? 'yellow' : 'red';
  return { colour, loss };
}

/** "Similar hand, same spot: what would you do?" One question per practice hand. */
export function PracticeQuiz({ hands, labels, pot }: { hands: PracticeHand[]; labels?: string[]; pot?: number }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const p = hands[i];
  if (!p) return null;
  const opts = p.options.length ? p.options : (labels ?? []).map((a) => ({ action: a, frequency: 0, ev_bb: 0 }));
  const result = picked ? gradePick(p, picked, pot) : null;
  return (
    <div className="lesson-sec practice">
      <p className="section-title">Practice · similar hand {hands.length > 1 ? `${i + 1} of ${hands.length}` : ''}</p>
      <div className="drill-hand">
        <MiniCards cards={splitCards(p.hand)} size="md" />
        <span className="muted">{p.category ?? p.class ?? ''}</span>
      </div>
      <p>Same spot, but you hold {p.hand}. What's the best play?</p>
      <div className="t-list">
        {opts.map((o) => {
          const g = picked ? gradePick(p, o.action, pot) : null;
          return (
            <button
              key={o.action}
              type="button"
              className={`btn answer-btn ${picked ? g!.colour : 'btn-outline'}${picked === o.action ? ' picked' : ''}`}
              disabled={!!picked}
              onClick={() => setPicked(o.action)}
            >
              <span>{prettyAction(o.action)}</span>
              {picked && <small>GTO {pct(o.frequency)}</small>}
            </button>
          );
        })}
      </div>
      {result && (
        <p className="note">
          {result.colour === 'green'
            ? 'Spot on.'
            : result.colour === 'yellow'
              ? `Close. GTO prefers ${prettyAction(p.best_action).toLowerCase()} (you give up ${bb(result.loss)}).`
              : `Not this time. GTO's play is ${prettyAction(p.best_action).toLowerCase()}; your pick gives up ${bb(result.loss)}.`}
        </p>
      )}
      {picked && i + 1 < hands.length && (
        <button
          type="button"
          className="btn btn-dark"
          onClick={() => {
            setI(i + 1);
            setPicked(null);
          }}
        >
          Next hand
        </button>
      )}
    </div>
  );
}
