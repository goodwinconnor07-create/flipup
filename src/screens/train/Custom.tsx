import { useEffect, useMemo, useRef, useState } from 'react';
import { customSpot } from '../../gto/api';
import type { CustomOption, CustomRequest, CustomSpot } from '../../gto/types';
import { CardPicker, actionClasses, pct, streetName } from '../../train/widgets';
import { BackBar, CardSlot, Choice, PlayingCard, Spinner } from '../../ui/components';

// Seats in preflop action order, the same as the solver's (index = engine player).
const POSITIONS: Record<number, string[]> = {
  2: ['BTN', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  5: ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

interface Setup {
  players: number;
  sb: number;
  bb: number;
  stacks: number[]; // chips, per seat
  hero: number;
  cards: string[];
}

/** Everything entered after setup, in order, so Undo removes the last thing. */
type Entry = { kind: 'act'; street: 'preflop' | 'flop' | 'turn' | 'river'; id: number } | { kind: 'card'; card: string };

const num = (s: string) => {
  const v = Number(s);
  return Number.isFinite(v) && v > 0 ? v : null;
};

function toRequest(setup: Setup, log: Entry[]): CustomRequest {
  const req: CustomRequest = {
    players: setup.players,
    stacks_bb: setup.stacks.map((c) => Math.round((c / setup.bb) * 100) / 100),
    hero: setup.hero,
    hero_cards: setup.cards.length === 2 ? setup.cards.join('') : null,
    preflop: [],
    flop: [],
    turn: [],
    river: [],
    board: [],
  };
  for (const e of log) {
    if (e.kind === 'card') req.board.push(e.card);
    else req[e.street].push(e.id);
  }
  return req;
}

/** Custom hand: set up the table, enter your hand, then play it out with GTO's numbers at every decision. */
export function Custom() {
  const [setup, setSetup] = useState<Setup | null>(null);
  return setup ? <HandView setup={setup} onEdit={() => setSetup(null)} /> : <SetupView onStart={setSetup} />;
}

// ── Setup ───────────────────────────────────────────────────────────────────

function SetupView({ onStart }: { onStart: (s: Setup) => void }) {
  const [players, setPlayers] = useState(6);
  const [sb, setSb] = useState('1');
  const [bb, setBb] = useState('2');
  const [stacks, setStacks] = useState<string[]>(() => Array(9).fill('200'));
  const [hero, setHero] = useState(3);
  const [cards, setCards] = useState<string[]>([]);
  const names = POSITIONS[players];
  const bbNum = num(bb) ?? 2;
  const heroSeat = Math.min(hero, players - 1);

  const changePlayers = (n: number) => {
    setPlayers(n);
    // Default to the button, the most common seat to study.
    setHero(POSITIONS[n].indexOf('BTN'));
  };

  const pick = (c: string) => {
    if (cards.includes(c)) setCards(cards.filter((x) => x !== c));
    else if (cards.length < 2) setCards([...cards, c]);
    else setCards([cards[0], c]);
  };

  const ok = num(sb) !== null && num(bb) !== null && stacks.slice(0, players).every((s) => num(s) !== null);
  const start = () => {
    if (!ok) return;
    onStart({
      players,
      sb: num(sb)!,
      bb: num(bb)!,
      stacks: stacks.slice(0, players).map((s) => num(s)!),
      hero: heroSeat,
      cards,
    });
  };

  return (
    <div className="screen train">
      <BackBar title="Custom hand" />
      <div className="screen-body">
        <Choice label="Players" value={players} options={[2, 3, 4, 5, 6, 7, 8, 9]} onChange={changePlayers} />

        <div className="builder-blinds">
          <label>
            <span className="section-title">Small blind</span>
            <input className="num-field" inputMode="decimal" value={sb} onChange={(e) => setSb(e.target.value)} />
          </label>
          <label>
            <span className="section-title">Big blind</span>
            <input className="num-field" inputMode="decimal" value={bb} onChange={(e) => setBb(e.target.value)} />
          </label>
        </div>

        <div>
          <p className="section-title">Your position</p>
          <div className="pos-row" role="radiogroup" aria-label="Your position">
            {names.map((n, i) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={i === heroSeat}
                className={`choice-option press${i === heroSeat ? ' on' : ''}`}
                onClick={() => setHero(i)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="t-list">
          <p className="section-title">Stacks</p>
          {names.map((n, i) => (
            <div key={n} className={`stack-row${i === heroSeat ? ' me' : ''}`}>
              <b>
                {n}
                {i === heroSeat ? ' · you' : ''}
              </b>
              <input
                className="num-field"
                inputMode="decimal"
                aria-label={`${n} stack`}
                value={stacks[i]}
                onChange={(e) => setStacks(stacks.map((s, j) => (j === i ? e.target.value : s)))}
              />
              <small className="muted">{num(stacks[i]) ? `${Math.round((num(stacks[i])! / bbNum) * 10) / 10}bb` : ''}</small>
            </div>
          ))}
        </div>

        <div className="t-list">
          <p className="section-title">Your hand</p>
          <div className="slot-row">
            {[0, 1].map((k) => (cards[k] ? <PlayingCard key={k} card={cards[k]} size="md" /> : <CardSlot key={k} size="md" />))}
          </div>
          <CardPicker taken={new Set()} selected={null} onPick={pick} highlighted={new Set(cards)} />
        </div>
      </div>
      <div className="screen-foot">
        <button type="button" className="btn btn-dark btn-xl" disabled={!ok || cards.length !== 2} onClick={start}>
          {cards.length === 2 ? 'Start the hand' : 'Pick your two cards'}
        </button>
      </div>
    </div>
  );
}

// ── The hand ────────────────────────────────────────────────────────────────

function HandView({ setup, onEdit }: { setup: Setup; onEdit: () => void }) {
  const [log, setLog] = useState<Entry[]>([]);
  const [spot, setSpot] = useState<CustomSpot | null>(null);
  const [solving, setSolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<string[]>([]);
  const req = useMemo(() => toRequest(setup, log), [setup, log]);
  const seq = useRef(0);

  useEffect(() => {
    const my = ++seq.current;
    const signal = { cancelled: false };
    setError(null);
    setSolving(null);
    customSpot(req, (m) => my === seq.current && setSolving(m), signal)
      .then((s) => {
        if (my !== seq.current) return;
        setSpot(s);
        setSolving(null);
      })
      .catch((e: unknown) => {
        if (my !== seq.current) return;
        setSolving(null);
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      });
    return () => {
      signal.cancelled = true;
    };
  }, [req]);

  const names = POSITIONS[setup.players];
  const board = req.board;
  const needs = spot?.needs_cards ?? null;
  const taken = new Set([...setup.cards, ...board, ...picking]);

  const act = (o: CustomOption) => {
    if (!spot?.street || spot.street === 'done' || spot.street === 'runout') return;
    setLog([...log, { kind: 'act', street: spot.street, id: o.id }]);
  };

  const pickCard = (c: string) => {
    if (!needs) return;
    if (picking.includes(c)) return setPicking(picking.filter((x) => x !== c));
    const next = [...picking, c];
    if (next.length >= needs.count) {
      setPicking([]);
      setLog([...log, ...next.map((card) => ({ kind: 'card' as const, card }))]);
    } else setPicking(next);
  };

  const undo = () => {
    if (picking.length) return setPicking(picking.slice(0, -1));
    // A street's cards go together (the flop is three cards).
    const last = log[log.length - 1];
    if (!last) return;
    if (last.kind === 'card') {
      let k = log.length;
      const street = board.length <= 3 ? 3 : 1;
      while (k > 0 && log[k - 1].kind === 'card' && log.length - k < street) k--;
      setLog(log.slice(0, k));
    } else setLog(log.slice(0, -1));
  };

  const history = spot?.history ?? [];
  const streets = ['preflop', 'flop', 'turn', 'river'].filter((s) => history.some((h) => h.street === s));
  const players: NonNullable<CustomSpot['players']> =
    spot?.players ?? setup.stacks.map((c, i) => ({ position: names[i], stack_bb: c / setup.bb }));

  return (
    <div className="screen train">
      <BackBar title="Custom hand" right={<button type="button" className="btn btn-sm btn-outline" onClick={onEdit}>New hand</button>} />
      <div className="screen-body">
        <section className="table-strip">
          <div className="slot-row" aria-label="Board">
            {[0, 1, 2, 3, 4].map((k) =>
              board[k] ? <PlayingCard key={k} card={board[k]} size="md" /> : picking[k - board.length] ? <PlayingCard key={k} card={picking[k - board.length]} size="md" dim /> : <CardSlot key={k} size="md" />,
            )}
          </div>
          <div className="kv">
            <span>
              Pot <b>{spot?.pot_bb !== undefined ? `${spot.pot_bb}bb` : '1.5bb'}</b>
            </span>
            <span>
              Blinds <b>{setup.sb}/{setup.bb}</b>
            </span>
          </div>
        </section>

        <div className="seat-strip">
          {players.map((p, i) => (
            <div key={i} className={`seat-chip${i === setup.hero ? ' me' : ''}${p.folded ? ' out' : ''}${spot?.to_act === i ? ' turn' : ''}`}>
              <b>{p.position}</b>
              <small>{Math.round((p.behind_bb ?? p.stack_bb) * 10) / 10}bb</small>
              {i === setup.hero && (
                <span className="t-cards">
                  {setup.cards.map((c) => (
                    <PlayingCard key={c} card={c} size="sm" />
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>

        {streets.length > 0 && (
          <div className="act-log">
            {streets.map((s) => (
              <StreetLog key={s} street={s} items={history.filter((h) => h.street === s)} hero={setup.hero} />
            ))}
          </div>
        )}

        {error && (
          <div className="t-list">
            <p className="note">{error}</p>
            <button type="button" className="btn btn-outline" onClick={() => setLog([...log])}>
              Try again
            </button>
          </div>
        )}

        {!error && (solving || !spot) && <Spinner label={solving ?? 'Loading…'} />}

        {!error && !solving && spot && needs && (
          <div className="t-list">
            <p className="h3">
              {needs.street === 'runout'
                ? `Deal the rest of the board (${needs.count} card${needs.count === 1 ? '' : 's'})`
                : needs.street === 'flop'
                  ? 'Pick the flop'
                  : `Pick the ${needs.street}`}
            </p>
            {spot.message && <p className="muted">{spot.message}</p>}
            <CardPicker taken={taken} selected={null} onPick={pickCard} highlighted={new Set(picking)} />
          </div>
        )}

        {!error && !solving && spot && !needs && spot.street !== 'done' && spot.options && spot.options.length > 0 && (
          <Decision spot={spot} hero={setup.hero} onPick={act} />
        )}

        {!error && !solving && spot?.street === 'done' && (
          <div className="t-list">
            <p className="h3">{spot.message ?? 'Hand over.'}</p>
            <button type="button" className="btn btn-dark" onClick={onEdit}>
              New hand
            </button>
          </div>
        )}

        {spot?.notes?.map((n, i) => (
          <p key={i} className="muted small-note">
            {n}
          </p>
        ))}
      </div>
      <div className="screen-foot">
        <button type="button" className="btn btn-outline btn-xl" disabled={!log.length && !picking.length} onClick={undo}>
          Undo
        </button>
      </div>
    </div>
  );
}

function StreetLog({ street, items, hero }: { street: string; items: { position: string; player: number; text: string }[]; hero: number }) {
  return (
    <>
      <span className="street">{streetName(street)}</span>
      {items.map((h, i) => (
        <span key={i} className={h.player === hero ? 'mine' : ''}>
          {h.position} {h.text.toLowerCase()}
        </span>
      ))}
    </>
  );
}

/** Whose turn it is and every legal option, with how often GTO takes each one. */
function Decision({ spot, hero, onPick }: { spot: CustomSpot; hero: number; onPick: (o: CustomOption) => void }) {
  const opts = spot.options ?? [];
  const mine = spot.to_act === hero;
  const cls = actionClasses(opts.map((o) => o.label));
  const best = opts.reduce<CustomOption | null>((b, o) => (o.freq !== null && (!b || (o.freq ?? 0) > (b.freq ?? 0)) ? o : b), null);
  return (
    <section className="t-list decision-panel">
      <div className="decision-head">
        <p className="h3">
          {spot.to_act_position}
          {mine ? ' (you)' : ''} to act
        </p>
        <span className="muted">
          {streetName(spot.street ?? '')}
          {spot.to_call_bb ? ` · ${spot.to_call_bb}bb to call` : ''}
        </span>
      </div>
      {!spot.multiway && (
        <p className="muted">
          {spot.hand_specific
            ? `How often GTO plays each option with your ${spot.hand ?? 'hand'}${spot.equity !== undefined ? ` (equity ${pct(spot.equity)})` : ''}:`
            : mine
              ? 'How often GTO takes each option:'
              : `How often the ${spot.to_act_position}'s range takes each option:`}
        </p>
      )}
      <div className="option-list">
        {opts.map((o) => (
          <button key={o.id} type="button" className={`option-btn press${best?.id === o.id ? ' best' : ''}`} onClick={() => onPick(o)}>
            {o.freq !== null && <span className={`option-fill ${cls[o.label]}`} style={{ width: `${Math.max(0, Math.min(1, o.freq)) * 100}%` }} />}
            <span className="option-label">{o.label}</span>
            {o.freq !== null && <b className="option-pct">{pct(o.freq)}</b>}
          </button>
        ))}
      </div>
      {spot.hand_specific && opts.some((o) => o.ev_bb !== null) && (
        <p className="muted small-note">
          EV: {opts.map((o) => `${o.label} ${o.ev_bb! >= 0 ? '+' : ''}${o.ev_bb!.toFixed(2)}bb`).join(' · ')}
        </p>
      )}
      <p className="muted small-note">Tap any option to play it, GTO or not, and keep going.</p>
    </section>
  );
}
