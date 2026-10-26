import { REPLAY_ON } from '../../train/replay';
import { useMemo, type CSSProperties } from 'react';
import { lastStanding, nearestStop, options, pot, raiseStops, stopAt, trackPosition, type Game, type Hand, type Player, type Seat } from '../../game';
import { dispatch, navigate, useApp } from '../../state/store';
import { handKey, hasHand } from '../../state/training';
import { chips } from '../../ui/components';
import { CloseIcon } from '../../ui/Icons';

/** Set before your turn. `current` only plays while the bet is still the `bet` it was set against. */
export type PreAction = { kind: 'checkfold' | 'callany' | 'current'; bet: number } | null;

export function ActionArea({
  game,
  me,
  seat,
  myTurn,
  sending,
  now,
  pre,
  setPre,
  raise,
  setRaise,
}: {
  game: Game;
  me?: Player;
  seat?: Seat;
  myTurn: boolean;
  sending: boolean;
  now: number;
  pre: PreAction;
  setPre: (p: PreAction) => void;
  /** The amount while the sizer is open (it sits where your cards are, see Table.tsx); null otherwise. */
  raise: number | null;
  setRaise: (to: number | null) => void;
}) {
  const hand = game.hand;
  const deviceId = useApp((s) => s.deviceId);
  const host = game.hostDeviceId === deviceId;

  if (!me) return <p className="table-note">You're watching this table.</p>;

  if (hand && !hand.result) {
    if (myTurn && seat) return <MyTurn game={game} hand={hand} seat={seat} sending={sending} raise={raise} setRaise={setRaise} />;
    const who = game.players.find((p) => p.id === hand.toAct);
    if (hand.runout) return <p className="table-note">Running it out…</p>;
    // Still in the hand with chips behind: you can set what to do before your turn comes round.
    // The three buttons sit where Fold, Check and Raise will be, so your thumb stays put.
    const canPre = !!seat && !seat.folded && !seat.allIn && !me.sittingOut;
    const o = canPre && seat ? options(game, hand, seat) : null;
    const set = (kind: 'checkfold' | 'callany' | 'current') => setPre(pre?.kind === kind ? null : { kind, bet: hand.currentBet });
    const preBtn = (kind: 'checkfold' | 'callany' | 'current', label: string, aria?: string) => (
      <button
        type="button"
        aria-pressed={pre?.kind === kind}
        aria-label={aria}
        className={`btn pre-btn press${pre?.kind === kind ? ' on' : ''}`}
        onClick={() => set(kind)}
      >
        {label}
      </button>
    );
    return (
      <div className="stack">
        <p className="table-note">
          {who ? (
            <>
              <b>{who.name}</b> {who.bot ? 'is thinking' : who.offline ? 'is offline' : 'to act'}
              <span className="dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </>
          ) : hand.nextStreetAt != null ? (
            `Dealing the ${hand.street === 'preflop' ? 'flop' : hand.street === 'flop' ? 'turn' : 'river'}…`
          ) : (
            '…'
          )}
          {me.sittingOut && <SitBack />}
        </p>
        {o && (
          <div className="action-buttons pre" role="group" aria-label="Before your turn">
            {preBtn('checkfold', 'Check / Fold')}
            {o.canCheck
              ? preBtn('current', 'Check', 'Check, unless someone bets')
              : preBtn('current', `Call ${chips(o.toCall)}`, `Call ${chips(o.toCall)}, unless someone raises`)}
            {preBtn('callany', 'Call any')}
          </div>
        )}
      </div>
    );
  }

  // Between hands.
  if (game.status === 'playing' && hand?.result && lastStanding(game) && game.nextHandAt) {
    // One player has all the chips: the others have a few seconds to rebuy, then the game ends.
    const secs = Math.max(0, Math.ceil((game.nextHandAt - now) / 1000));
    return (
      <div className="stack">
        {me.stack === 0 && game.settings.rebuys ? (
          <button type="button" className="btn btn-green" onClick={() => dispatch({ type: 'rebuy' })}>
            Rebuy for {chips(game.settings.startingStack)} · {secs}s
          </button>
        ) : (
          <p className="table-note">
            {me.stack > 0 ? 'Everyone else is out of chips.' : "You're out of chips."} The game ends in {secs}s.
          </p>
        )}
      </div>
    );
  }
  if (me.stack === 0) {
    return game.settings.rebuys ? (
      <div className="stack">
        <button type="button" className="btn btn-green" onClick={() => dispatch({ type: 'rebuy' })}>
          Rebuy for {chips(game.settings.startingStack)}
        </button>
      </div>
    ) : (
      <div className="stack">
        <p className="table-note">You're out of chips. Stick around and watch.</p>
      </div>
    );
  }
  if (me.sittingOut) {
    return (
      <div className="stack">
        <button type="button" className="btn btn-green" onClick={() => dispatch({ type: 'sitOut', out: false })}>
          I'm back. Deal me in
        </button>
      </div>
    );
  }
  // A new game: a few seconds to take in the table before the first cards.
  if (!hand && game.status === 'playing' && game.nextHandAt !== null) {
    const secs = Math.max(1, Math.ceil((game.nextHandAt - now) / 1000));
    return (
      <div className="stack">
        <p className="table-note">Dealing in {secs}…</p>
      </div>
    );
  }
  if (!hand?.result || game.nextHandAt === null) {
    return (
      <div className="stack">
        <p className="table-note">Waiting for more players…</p>
        {host && (
          <button type="button" className="btn btn-outline" onClick={() => dispatch({ type: 'addBot' })}>
            Add a bot
          </button>
        )}
      </div>
    );
  }

  const ready = game.ready.includes(me.id);
  const total = waitFor(hand.number, game.nextHandAt - now);
  const left = Math.max(0, Math.min(1, (game.nextHandAt - now) / total));
  return (
    <div className="stack">
      <button
        type="button"
        className="btn btn-dark next-btn"
        disabled={ready}
        style={{ ['--left' as string]: left }}
        onClick={() => dispatch({ type: 'next', hand: hand.number })}
      >
        <span className="next-fill" aria-hidden />
        {ready ? 'Waiting for the others…' : 'Next hand'}
      </button>
      <ReplayButton gameId={game.id} number={hand.number} />
    </div>
  );
}

/** Watch the hand that just finished, if this phone was dealt in and saved it. */
function ReplayButton({ gameId, number }: { gameId: string; number: number }) {
  const key = handKey(gameId, number);
  const saved = useMemo(() => hasHand(key), [key]);
  if (!saved || !REPLAY_ON) return null;
  return (
    <button type="button" className="btn btn-sm btn-outline" onClick={() => navigate({ name: 'replay', key })}>
      Replay this hand
    </button>
  );
}

/** How long this pause was when it began, so the bar drains from full whatever extra time was added. */
let pause = { hand: -1, ms: 0 };
function waitFor(hand: number, remaining: number): number {
  if (pause.hand !== hand || remaining > pause.ms) pause = { hand, ms: Math.max(remaining, 1) };
  return pause.ms;
}

function SitBack() {
  return (
    <button type="button" className="btn-link-small" onClick={() => dispatch({ type: 'sitOut', out: false })}>
      I'm back
    </button>
  );
}

function MyTurn({
  game,
  hand,
  seat,
  sending,
  raise,
  setRaise,
}: {
  game: Game;
  hand: Hand;
  seat: Seat;
  sending: boolean;
  raise: number | null;
  setRaise: (to: number | null) => void;
}) {
  const o = options(game, hand, seat);
  const act = (move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number) => {
    setRaise(null);
    dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move, ...(to !== undefined ? { to } : {}) });
  };
  const confirm = () => {
    if (raise === null) return;
    act(raise >= o.maxTo ? 'allin' : o.word === 'Bet' ? 'bet' : 'raise', raise);
  };
  // The buttons never move. While you size, Raise shows the amount and becomes the confirm.
  const raiseLabel = raise === null ? o.word : raise >= o.maxTo ? 'All in' : `${o.word} ${chips(raise)}`;
  return (
    <div className="stack">
      <p className="table-note your-turn">Your turn</p>
      <div className="action-buttons">
        <button type="button" className="btn btn-fold" disabled={sending} onClick={() => act('fold')}>
          Fold
        </button>
        {o.canCheck ? (
          <button type="button" className="btn btn-green" disabled={sending} onClick={() => act('check')}>
            Check
          </button>
        ) : (
          <button type="button" className="btn btn-green" disabled={sending} onClick={() => act('call')}>
            {o.callIsAllIn ? 'All in' : 'Call'} <span className="num">{chips(o.toCall)}</span>
          </button>
        )}
        {o.canRaise && (
          <button type="button" className="btn btn-blue" disabled={sending} onClick={() => (raise === null ? setRaise(o.minTo) : confirm())}>
            {raiseLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The amount and one slider. Min, half pot, pot and All in are marks along the line you can tap, and the
 * slider moves one round notch at a time. It fills the space your cards and chip counter use (they stay in
 * place underneath, hidden), so nothing else on the table moves.
 */
export function RaiseSizer({
  game,
  hand,
  seat,
  to,
  setTo,
  onCancel,
}: {
  game: Game;
  hand: Hand;
  seat: Seat;
  to: number;
  setTo: (to: number) => void;
  onCancel: () => void;
}) {
  const o = options(game, hand, seat);
  const stops = raiseStops(o.minTo, o.maxTo, game.settings.bigBlind);
  const potNow = pot(hand);

  // Pot-sized raise: call first, then raise by the size of the pot after the call.
  const potRaise = (fraction: number) => hand.currentBet + Math.round((potNow + o.toCall) * fraction);
  // Sizes that come to the same amount (a small pot next to the minimum) show once, under the name that matters most.
  const rank = ['Min', 'All in', 'Pot', '½ pot'];
  const marks = [
    { label: 'Min', to: o.minTo },
    { label: '½ pot', to: nearestStop(stops, potRaise(0.5)) },
    { label: 'Pot', to: nearestStop(stops, potRaise(1)) },
    { label: 'All in', to: o.maxTo },
  ]
    .filter((m, i, all) => all.every((q, j) => q.to !== m.to || j === i || rank.indexOf(m.label) < rank.indexOf(q.label)))
    .sort((a, b) => a.to - b.to);
  const anchors = marks.map((m) => m.to);
  const pos = trackPosition(stops, anchors, to);
  const last = Math.max(1, marks.length - 1);

  return (
    <div className="raise-panel" role="group" aria-label={`${o.word} amount`}>
      <div className="raise-top">
        <b className="raise-amount num">{chips(to)}</b>
        <button type="button" className="icon-btn press raise-close" aria-label="Back" onClick={onCancel}>
          <CloseIcon />
        </button>
      </div>
      <div className="raise-marks">
        {marks.map((m, i) => (
          <button
            key={m.label}
            type="button"
            aria-label={m.label}
            className={`preset press${m.to === to ? ' on' : ''}`}
            style={{ '--at': marks.length > 1 ? i / last : 0 } as CSSProperties}
            onClick={() => setTo(m.to)}
          >
            <b>{m.label}</b>
            <small className="num">{chips(m.to)}</small>
          </button>
        ))}
      </div>
      <input
        className="raise-slider"
        style={{ '--pos': pos } as CSSProperties}
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(pos * 1000)}
        disabled={stops.length < 2}
        aria-label={`${o.word} amount`}
        aria-valuetext={chips(to)}
        onChange={(e) => setTo(stopAt(stops, anchors, Number(e.target.value) / 1000))}
      />
    </div>
  );
}
