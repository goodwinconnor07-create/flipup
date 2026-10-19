import { useMemo, useState } from 'react';
import type { Move, Street } from '../../game';
import { analyzeHand } from '../../gto/api';
import type { HandHistory, HandReport } from '../../gto/types';
import { navigate } from '../../state/store';
import { replay, STREETS, type BuilderAction, type BuilderSetup, type BuilderState } from '../../train/builder';
import { CardPicker, DecisionCard, MiniCards, streetName } from '../../train/widgets';
import { BackBar, CardSlot, Choice, PlayingCard, Spinner } from '../../ui/components';

// Seats run SB, BB, then the early positions round to the button (heads-up: button/SB, BB).
const POSITIONS: Record<number, string[]> = {
  2: ['BTN', 'BB'],
  3: ['SB', 'BB', 'BTN'],
  4: ['SB', 'BB', 'CO', 'BTN'],
  5: ['SB', 'BB', 'HJ', 'CO', 'BTN'],
  6: ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'],
  7: ['SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO', 'BTN'],
  8: ['SB', 'BB', 'UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN'],
  9: ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN'],
};

type Target = { kind: 'hole'; id: string; slot: number } | { kind: 'board'; slot: number } | null;
type Step = 'setup' | 'action' | 'result';

const BOARD_AT: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };
const num = (s: string, fallback: number) => {
  const v = Number(s);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
const round = (x: number) => Math.round(x * 100) / 100;

/** Enter any hand (players, stacks, blinds, cards and every move) and see GTO on each street. */
export function Custom() {
  const [step, setStep] = useState<Step>('setup');
  const [n, setN] = useState(6);
  const [sb, setSb] = useState('1');
  const [bbStr, setBb] = useState('2');
  const [stacks, setStacks] = useState<string[]>(() => Array(9).fill('200'));
  const [hero, setHero] = useState(5);
  const [holes, setHoles] = useState<Record<string, string[]>>({});
  const [board, setBoard] = useState<string[]>([]);
  const [actions, setActions] = useState<BuilderAction[]>([]);
  const [target, setTarget] = useState<Target>({ kind: 'hole', id: 'p5', slot: 0 });
  const [report, setReport] = useState<HandReport | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const smallBlind = num(sb, 1);
  const bigBlind = num(bbStr, 2);
  const names = POSITIONS[n];
  const setup: BuilderSetup = useMemo(
    () => ({
      players: names.map((name, i) => ({ id: `p${i}`, name, stack: num(stacks[i], 100 * bigBlind) })),
      buttonIndex: n === 2 ? 0 : n - 1,
      smallBlind,
      bigBlind,
    }),
    [names, stacks, n, smallBlind, bigBlind],
  );
  const heroId = `p${Math.min(hero, n - 1)}`;

  let state: BuilderState | null = null;
  let stateError: string | null = null;
  try {
    state = replay(setup, actions, board.length);
  } catch (e) {
    stateError = e instanceof Error ? e.message : 'That move isn’t legal.';
  }

  const taken = new Set([...Object.values(holes).flat(), ...board]);

  const pickCard = (c: string) => {
    if (!target) return;
    if (target.kind === 'hole') {
      const cur = [...(holes[target.id] ?? [])];
      if (cur[target.slot] === c) cur.splice(target.slot, 1);
      else cur[target.slot] = c;
      const clean = cur.filter(Boolean);
      setHoles({ ...holes, [target.id]: clean });
      // Hero's second card next, then stop.
      setTarget(target.slot === 0 && clean.length === 1 ? { ...target, slot: 1 } : null);
    } else {
      // Changing a card already on the board.
      if (target.slot <= board.length) setBoard(board.map((b, i) => (i === target.slot ? c : b)).concat(target.slot === board.length ? [c] : []));
      setTarget(null);
    }
  };

  const changeN = (v: number) => {
    setN(v);
    setHero(v === 2 ? 0 : v - 1);
    setActions([]);
    setHoles({});
    setBoard([]);
    setTarget(null);
  };

  const act = (move: Move, to = 0) => {
    if (!state?.toAct) return;
    let amount = to;
    if (move === 'call') amount = Math.min(state.toCall + state.bets[state.toAct], state.maxTo);
    if (move === 'allin') amount = state.maxTo;
    const next = [...actions, { street: state.street, playerId: state.toAct, move, to: round(amount) }];
    try {
      const s = replay(setup, next, board.length);
      setActions(next);
      if (s.needCards > 0) setTarget({ kind: 'board', slot: board.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That move isn’t legal.');
    }
  };

  // Board cards stay put (tap one to change it); only the last move goes.
  const undo = () => setActions(actions.slice(0, -1));

  const history = (): HandHistory => ({
    id: 'custom',
    small_blind: smallBlind,
    big_blind: bigBlind,
    button: setup.players[setup.buttonIndex].id,
    players: setup.players.map((p, i) => ({ id: p.id, name: p.name, seat: i, stack: p.stack, cards: holes[p.id]?.length === 2 ? holes[p.id] : null })),
    actions: actions.map((a) => ({ street: a.street, player: a.playerId, move: a.move, to: a.to })),
    board,
  });

  const analyze = async () => {
    setStep('result');
    setReport(null);
    setError(null);
    setProgress('Solving…');
    try {
      const r = await analyzeHand(history(), undefined, (j) =>
        setProgress(j.total > 0 ? `Solving street ${Math.min(j.progress + 1, j.total)} of ${j.total}…` : 'Solving…'),
      );
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The analysis failed.');
    } finally {
      setProgress(null);
    }
  };

  // ── Setup ────────────────────────────────────────────────────────────────
  if (step === 'setup') {
    const heroCards = holes[heroId] ?? [];
    return (
      <div className="screen train">
        <BackBar title="Custom hand" />
        <div className="screen-body">
          <Choice label="Players" value={n} options={[2, 3, 4, 5, 6, 7, 8, 9]} onChange={changeN} />
          <div className="builder-blinds">
            <label>
              <span className="section-title">Small blind</span>
              <input className="num-field" inputMode="decimal" value={sb} onChange={(e) => setSb(e.target.value)} />
            </label>
            <label>
              <span className="section-title">Big blind</span>
              <input className="num-field" inputMode="decimal" value={bbStr} onChange={(e) => setBb(e.target.value)} />
            </label>
          </div>
          <div className="t-list">
            <p className="section-title">Seats · tap a seat to make it you, tap the cards to set a hand</p>
            {setup.players.map((p, i) => {
              const cards = holes[p.id] ?? [];
              return (
                <div key={p.id} className={`seat-row${p.id === heroId ? ' me' : ''}`}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setHero(i)} aria-pressed={p.id === heroId}>
                    {p.name}
                  </button>
                  <input
                    className="field"
                    inputMode="decimal"
                    aria-label={`${p.name} stack`}
                    value={stacks[i]}
                    onChange={(e) => setStacks(stacks.map((s, j) => (j === i ? e.target.value : s)))}
                  />
                  <span className="slot-row">
                    {[0, 1].map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`slot-btn${target?.kind === 'hole' && target.id === p.id && target.slot === k ? ' active' : ''}`}
                        onClick={() => setTarget({ kind: 'hole', id: p.id, slot: Math.min(k, cards.length) })}
                        aria-label={`${p.name} card ${k + 1}`}
                      >
                        {cards[k] ? <PlayingCard card={cards[k]} size="sm" /> : <CardSlot size="sm" />}
                      </button>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          {target?.kind === 'hole' && (
            <div className="t-list">
              <p className="section-title">
                {setup.players.find((p) => p.id === target.id)?.name} · card {target.slot + 1}
              </p>
              <CardPicker taken={taken} selected={(holes[target.id] ?? [])[target.slot]} onPick={pickCard} />
            </div>
          )}
          {heroCards.length < 2 && <p className="muted">Your cards are optional, but with them GTO tells you exactly what to do with your hand.</p>}
        </div>
        <div className="screen-foot">
          <button
            type="button"
            className="btn btn-dark btn-xl"
            onClick={() => {
              setTarget(null);
              setStep('action');
            }}
          >
            Enter the action
          </button>
        </div>
      </div>
    );
  }

  // ── Result ───────────────────────────────────────────────────────────────
  if (step === 'result') {
    const posOf = (id: string) => setup.players.find((p) => p.id === id)?.name ?? id;
    return (
      <div className="screen train">
        <BackBar title="GTO strategy" onBack={() => setStep('action')} />
        <div className="screen-body">
          <div className="slot-row">
            <MiniCards cards={holes[heroId] ?? []} size="md" />
            {board.length > 0 && <MiniCards cards={board} />}
          </div>
          {progress && <Spinner label={progress} />}
          {error && (
            <>
              <p className="note">{error}</p>
              <button type="button" className="btn btn-dark" onClick={() => void analyze()}>
                Try again
              </button>
            </>
          )}
          {report &&
            STREETS.map((s) => {
              const ds = report.decisions.filter((d) => d.street === s);
              if (!ds.length) return null;
              return (
                <section key={s} className="t-list">
                  <div className="street-head">
                    <span className="h3">{streetName(s)}</span>
                    {BOARD_AT[s] > 0 && <MiniCards cards={board.slice(0, BOARD_AT[s])} />}
                  </div>
                  {ds.map((d, i) => (
                    <DecisionCard
                      key={i}
                      d={d}
                      who={d.player === heroId ? 'You' : posOf(d.player)}
                      onPractice={(scenario) => navigate({ name: 'drill', scenario })}
                    />
                  ))}
                </section>
              );
            })}
          {report?.notes.map((t, i) => (
            <p key={i} className="note">
              {t}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // ── Action ───────────────────────────────────────────────────────────────
  const actor = state?.toAct ? setup.players.find((p) => p.id === state!.toAct) : null;
  const currentBet = state && actor ? state.toCall + state.bets[actor.id] : 0;
  const presets = (): { label: string; to: number }[] => {
    if (!state || !actor || !state.canRaise) return [];
    const out: { label: string; to: number }[] = [];
    // Whole chips at normal blinds; finer steps only for tiny blinds like 0.5/1.
    const step = (x: number) => (bigBlind >= 2 ? Math.round(x) : round(x));
    const clamp = (x: number) => step(Math.min(state!.maxTo, Math.max(state!.minTo, x)));
    if (state.street === 'preflop') {
      if (currentBet <= bigBlind) [2, 2.5, 3].forEach((m) => out.push({ label: `${m}x`, to: clamp(m * bigBlind) }));
      else [3, 4].forEach((m) => out.push({ label: `${m}x`, to: clamp(m * currentBet) }));
    } else {
      const fracs = currentBet === 0 ? [0.33, 0.5, 0.75, 1] : [0.5, 1];
      for (const f of fracs) {
        const to = currentBet === 0 ? f * state.pot : currentBet + f * (state.pot + state.toCall);
        out.push({ label: currentBet === 0 ? `${Math.round(100 * f)}%` : `${f === 1 ? 'Pot' : 'Half pot'}`, to: clamp(to) });
      }
    }
    return out.filter((p, i, a) => p.to < state!.maxTo && a.findIndex((q) => q.to === p.to) === i);
  };
  const needBoard = state && state.needCards > 0;
  const boardSlots = Math.max(3, Math.min(5, board.length + (needBoard ? state!.needCards : 0)));

  return (
    <div className="screen train">
      <BackBar title="Custom hand" onBack={() => setStep('setup')} />
      <div className="screen-body">
        <div className="slot-row" aria-label="Board">
          {Array.from({ length: boardSlots }, (_, k) => (
            <button
              key={k}
              type="button"
              className={`slot-btn${target?.kind === 'board' && target.slot === k ? ' active' : ''}`}
              disabled={k > board.length}
              onClick={() => setTarget({ kind: 'board', slot: k })}
              aria-label={`Board card ${k + 1}`}
            >
              {board[k] ? <PlayingCard card={board[k]} size="md" /> : <CardSlot size="md" />}
            </button>
          ))}
        </div>

        {actions.length > 0 && (
          <div className="act-log">
            {actions.map((a, i) => (
              <ActChip key={i} a={a} prev={actions[i - 1]} name={setup.players.find((p) => p.id === a.playerId)?.name ?? ''} />
            ))}
          </div>
        )}

        {stateError && <p className="note">{stateError}</p>}
        {error && <p className="note">{error}</p>}

        {state && needBoard && (
          <div className="t-list">
            <p className="h3">
              {board.length < 3 ? 'Deal the flop' : board.length === 3 ? 'Deal the turn' : 'Deal the river'}
              {state.runout ? ' (everyone is all in)' : ''}
            </p>
            <CardPicker
              taken={taken}
              selected={target?.kind === 'board' ? board[target.slot] : null}
              onPick={(c) => {
                if (!target || target.kind !== 'board') setTarget({ kind: 'board', slot: board.length });
                pickCardAt(c);
              }}
            />
          </div>
        )}
        {state && !needBoard && target?.kind === 'board' && (
          <div className="t-list">
            <p className="section-title">Board card {target.slot + 1}</p>
            <CardPicker taken={taken} selected={board[target.slot]} onPick={pickCard} />
          </div>
        )}

        {state && actor && !needBoard && (
          <div className="t-list">
            <p className="h3">
              {actor.name}
              {actor.id === heroId ? ' (you)' : ''} to act · {streetName(state.street)}
            </p>
            <div className="kv">
              <span>
                Pot <b>{round(state.pot)}</b>
              </span>
              {state.toCall > 0 && (
                <span>
                  To call <b>{round(Math.min(state.toCall, state.stacks[actor.id]))}</b>
                </span>
              )}
              <span>
                Stack <b>{round(state.stacks[actor.id])}</b>
              </span>
            </div>
            <div className="act-grid">
              {state.toCall > 0 && (
                <button type="button" className="btn btn-outline" onClick={() => act('fold')}>
                  Fold
                </button>
              )}
              {state.canCheck && (
                <button type="button" className="btn btn-outline" onClick={() => act('check')}>
                  Check
                </button>
              )}
              {state.toCall > 0 && (
                <button type="button" className="btn btn-outline" onClick={() => act('call')}>
                  Call {round(Math.min(state.toCall, state.stacks[actor.id]))}
                </button>
              )}
              {presets().map((p) => (
                <button key={p.label} type="button" className="btn btn-outline" onClick={() => act(currentBet === 0 ? 'bet' : 'raise', p.to)}>
                  {currentBet === 0 ? 'Bet' : 'Raise'} {p.label}
                  <small>{p.to}</small>
                </button>
              ))}
              {state.maxTo > currentBet && (
                <button type="button" className="btn btn-outline" onClick={() => act('allin')}>
                  All in {round(state.maxTo)}
                </button>
              )}
            </div>
            {state.canRaise && <SizeEntry state={state} raise={currentBet > 0} onSubmit={(to) => act(currentBet === 0 ? 'bet' : 'raise', to)} />}
          </div>
        )}
        {state?.over && <p className="h3">The hand is complete.</p>}
      </div>
      <div className="screen-foot">
        <div className="home-links">
          <button type="button" className="btn btn-outline" disabled={actions.length === 0} onClick={undo}>
            Undo
          </button>
          <button type="button" className="btn btn-dark" disabled={!state} onClick={() => void analyze()}>
            {state?.over ? 'Analyze hand' : 'GTO from here'}
          </button>
        </div>
      </div>
    </div>
  );

  function pickCardAt(c: string) {
    const slot = target?.kind === 'board' ? target.slot : board.length;
    const cur = [...board];
    cur[slot] = c;
    const clean = cur.slice(0, slot + 1).filter(Boolean);
    setBoard(clean);
    const need = state ? BOARD_AT[STREETS[Math.min(3, STREETS.indexOf(state.street) + 1)]] : 5;
    const want = state?.runout ? 5 : need;
    setTarget(clean.length < want ? { kind: 'board', slot: clean.length } : null);
  }
}

function ActChip({ a, prev, name }: { a: BuilderAction; prev?: BuilderAction; name: string }) {
  const verb =
    a.move === 'fold'
      ? 'folds'
      : a.move === 'check'
        ? 'checks'
        : a.move === 'call'
          ? `calls ${a.to}`
          : a.move === 'bet'
            ? `bets ${a.to}`
            : a.move === 'allin'
              ? `all in ${a.to}`
              : `raises to ${a.to}`;
  return (
    <>
      {(!prev || prev.street !== a.street) && <span className="street">{streetName(a.street)}</span>}
      <span>
        {name} {verb}
      </span>
    </>
  );
}

/** Any bet or raise size, typed in (a "to" amount for the street). */
function SizeEntry({ state, raise, onSubmit }: { state: BuilderState; raise: boolean; onSubmit: (to: number) => void }) {
  const [v, setV] = useState('');
  const to = Number(v);
  const ok = Number.isFinite(to) && to >= state.minTo && to <= state.maxTo;
  return (
    <form
      className="builder-size"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSubmit(to);
      }}
    >
      <input
        className="num-field"
        inputMode="decimal"
        placeholder={`${raise ? 'Raise to' : 'Bet'} ${round(state.minTo)}–${round(state.maxTo)}`}
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <button type="submit" className="btn btn-dark" disabled={!ok}>
        {raise ? 'Raise' : 'Bet'}
      </button>
    </form>
  );
}
