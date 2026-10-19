import { useEffect, useMemo, useRef, useState } from 'react';
import {
  describeHand,
  equity,
  lastStanding,
  myPlayer,
  options,
  pot,
  seatFor,
  type Card,
  type Equity,
  type Game,
  type Hand,
  type Player,
  type Seat,
} from '../game';
import { dispatch, openSheet, useApp } from '../state/store';
import { Avatar, CardSlot, chips, PlayingCard, Spinner, useNow } from '../ui/components';
import { confetti, CONFETTI, haptic } from '../ui/effects';
import { MenuIcon, MinusIcon, PlusIcon } from '../ui/Icons';
import { Final } from './Final';
import { Lobby } from './Lobby';

export function Table() {
  const game = useApp((s) => s.game);
  const conn = useApp((s) => s.conn);
  const online = useApp((s) => s.session?.mode === 'online');

  if (!game) {
    return (
      <div className="screen">
        <TableBar game={null} />
        <div className="screen-body" style={{ justifyContent: 'center' }}>
          <Spinner label={conn === 'offline' ? 'No connection. Trying again…' : 'Finding your table…'} />
        </div>
      </div>
    );
  }
  return (
    <div className={`screen table-screen status-${game.status}`}>
      <TableBar game={game} />
      {online && conn === 'offline' && (
        <div className="conn-pill" role="status">
          <i /> Reconnecting…
        </div>
      )}
      {game.status === 'lobby' && <Lobby game={game} />}
      {game.status === 'playing' && <Felt game={game} />}
      {game.status === 'ended' && <Final game={game} />}
    </div>
  );
}

function TableBar({ game }: { game: Game | null }) {
  const online = useApp((s) => s.session?.mode === 'online');
  return (
    <div className="topbar table-bar">
      <button type="button" className="icon-btn press" aria-label="Menu" onClick={() => openSheet({ name: 'menu' })}>
        <MenuIcon />
      </button>
      <div className="topbar-title table-title">
        {game && (
          <>
            <b>
              Blinds {chips(game.settings.smallBlind)}/{chips(game.settings.bigBlind)}
            </b>
            <small className="muted">
              {game.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : online ? 'Online table' : 'You vs the bots'}
            </small>
          </>
        )}
      </div>
      {online && game?.code && (
        <button
          type="button"
          className="code-chip press"
          aria-label={`Invite: code ${game.code}`}
          onClick={() => openSheet({ name: 'invite' })}
        >
          {game.code}
        </button>
      )}
    </div>
  );
}

/** Everyone else, in seat order starting on this phone's left, so play moves left to right. */
function othersInOrder(game: Game, me: Player | undefined): Player[] {
  const all = [...game.players].sort((a, b) => a.seat - b.seat);
  if (!me) return all;
  const i = all.findIndex((p) => p.id === me.id);
  return [...all.slice(i + 1), ...all.slice(0, i)];
}

/** What a player's last move says in their speech bubble: "Call 150", "Fold". */
function bubbleText(last: NonNullable<Seat['last']>): string {
  const n = chips(last.amount);
  switch (last.move) {
    case 'fold':
      return 'Fold';
    case 'check':
      return 'Check';
    case 'call':
      return `Call ${n}`;
    case 'bet':
      return `Bet ${n}`;
    case 'raise':
      return `Raise ${n}`;
    case 'allin':
      return `All in ${n}`;
    case 'sb':
      return `SB ${n}`;
    default:
      return `BB ${n}`;
  }
}

/** An iMessage-style bubble: blue for chips going in, grey for check and fold. */
function Bubble({ last }: { last: NonNullable<Seat['last']> }) {
  const text = bubbleText(last);
  const money = last.move !== 'fold' && last.move !== 'check' && last.move !== 'sb' && last.move !== 'bb';
  // Keyed on the text, so every new move pops in.
  return (
    <span key={text} className={`bubble pop ${money ? 'bubble-blue' : 'bubble-grey'}`} role="status">
      {text}
    </span>
  );
}

/** Win and tie chances, only during an all-in run-out when every live hand is face up. */
function useOdds(hand: Hand | null): Map<string, { win: number; tie: number }> | null {
  const live = hand?.runout ? hand.seats.filter((s) => !s.folded && s.cards.length === 2) : [];
  const key = hand?.runout ? `${live.map((s) => s.cards.join('')).join('|')}/${hand.board.join('')}` : '';
  return useMemo(() => {
    if (!hand?.runout || live.length < 2) return null;
    const e: Equity = equity(
      live.map((s) => s.cards),
      hand.board,
    );
    return new Map(live.map((s, i) => [s.playerId, { win: e.win[i], tie: e.tie[i] }]));
  }, [key]);
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Felt({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const sending = useApp((s) => s.sending);
  const me = myPlayer(game, deviceId);
  const hand = game.hand;
  const mySeat = seatFor(hand, me?.id);
  const others = othersInOrder(game, me);
  const odds = useOdds(hand);
  const myTurn = !!hand && !hand.result && !!me && hand.toAct === me.id;
  const timed = !!hand?.deadline || (!!hand?.result && !!game.nextHandAt);
  const now = useNow(timed ? 200 : 60_000);

  // A buzz when it's your turn, and confetti when you win a pot.
  const turnKey = myTurn ? `${hand!.number}-${hand!.seq}` : '';
  useEffect(() => {
    if (turnKey) haptic('medium');
  }, [turnKey]);
  const won = hand?.result && me ? (hand.result.won[me.id] ?? 0) : 0;
  const winKey = won > 0 ? hand!.number : 0;
  useEffect(() => {
    if (!winKey) return;
    haptic('success');
    confetti(CONFETTI.win, { x: innerWidth / 2, y: innerHeight * 0.75 });
  }, [winKey]);

  // Which cards make the hand that matters: yours while you're in, the winner's at a showdown.
  const highlight = useMemo(() => {
    if (!hand || hand.board.length < 3) return null;
    if (hand.result?.showdown) {
      const winner = hand.result.pots[0]?.winners[0];
      const seat = seatFor(hand, winner);
      if (seat?.cards.length) return describeHand([...seat.cards, ...hand.board]);
    }
    if (mySeat && !mySeat.folded && mySeat.cards.length) return describeHand([...mySeat.cards, ...hand.board]);
    return null;
  }, [hand?.number, hand?.board.length, hand?.result, mySeat?.folded, mySeat?.cards.length]);
  const lit = new Set(highlight?.best ?? []);
  // Cards outside the winning hand grey out at showdown only, never while the hand is being played.
  const dim = (c: Card) => !!hand?.result?.showdown && !!highlight && !lit.has(c);
  const myValue = mySeat && !mySeat.folded && mySeat.cards.length ? describeHand([...mySeat.cards, ...(hand?.board ?? [])]) : null;
  // Before the flop, "High card" says nothing; a pocket pair is worth pointing out.
  const myHandName = myValue && (hand!.board.length >= 3 || myValue.category > 0) ? myValue.name : null;
  const pillName = hand?.result?.showdown ? highlight?.name : myHandName;

  return (
    <div className="felt">
      <div
        className={`pods pods-${others.length > 5 ? 'two' : 'one'}`}
        style={{ ['--cols' as string]: others.length > 5 ? Math.ceil(others.length / 2) : Math.max(others.length, 1) }}
      >
        {others.map((p) => (
          <Pod key={p.id} game={game} player={p} seat={seatFor(hand, p.id)} odds={odds?.get(p.id)} now={now} dimCard={dim} />
        ))}
      </div>

      <div className="board-area">
        <div className="board" aria-label="Board">
          {[0, 1, 2, 3, 4].map((i) => {
            const c = hand?.board[i];
            return c ? (
              <PlayingCard key={`${hand!.number}-${c}`} card={c} size="lg" dim={dim(c)} flip delay={i < 3 ? i * 160 : 0} />
            ) : (
              <CardSlot key={`slot-${i}`} size="lg" />
            );
          })}
        </div>
        <div className="board-meta">
          {pillName ? (
            <span key={pillName} className="hand-pill pop">
              {pillName}
            </span>
          ) : (
            <span />
          )}
          {hand && (
            <span className="pot" aria-label={`Pot ${pot(hand)}`}>
              <small>Pot</small> {chips(pot(hand))}
            </span>
          )}
        </div>
      </div>

      <div className="action-area">
        <ActionArea game={game} me={me} seat={mySeat} myTurn={myTurn} sending={!!sending} now={now} />
      </div>

      <div className="me-area">
        <div className="my-cards">
          {mySeat?.cards.length ? (
            mySeat.cards.map((c, i) => (
              <PlayingCard
                key={`${hand!.number}-${c}`}
                card={c}
                size="xl"
                dim={mySeat.folded || dim(c)}
                flip
                delay={i * 180}
                className={`my-card my-card-${i}`}
              />
            ))
          ) : (
            <>
              <CardSlot size="xl" />
              <CardSlot size="xl" />
            </>
          )}
        </div>
        <MyBox game={game} me={me} seat={mySeat} odds={me ? odds?.get(me.id) : undefined} />
      </div>
    </div>
  );
}

function Pod({
  game,
  player,
  seat,
  odds,
  now,
  dimCard,
}: {
  game: Game;
  player: Player;
  seat: Seat | undefined;
  odds?: { win: number; tie: number };
  now: number;
  dimCard: (c: Card) => boolean;
}) {
  const hand = game.hand;
  const deviceId = useApp((s) => s.deviceId);
  const host = game.hostDeviceId === deviceId;
  const turn = !!hand && !hand.result && hand.toAct === player.id;
  const out = !seat || seat.folded;
  const won = hand?.result?.won[player.id] ?? 0;
  const left = turn && hand!.deadline ? Math.max(0, (hand!.deadline - now) / (game.settings.turnSeconds * 1000)) : null;
  const status = player.stack === 0 && !seat ? 'Out' : player.sittingOut ? 'Away' : null;

  return (
    <button
      type="button"
      className={`pod${out ? ' out' : ''}${turn ? ' turn' : ''}${won ? ' won' : ''}`}
      aria-label={`${player.name}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}`}
      onClick={() => host && openSheet({ name: 'player', playerId: player.id })}
    >
      <span className="pod-pic" style={left !== null ? { ['--left' as string]: left } : undefined}>
        {turn && <span className={`pod-ring${left !== null ? ' timed' : ''}`} aria-hidden />}
        <Avatar emoji={player.emoji} size={50} />
        {hand?.buttonId === player.id && <span className="dealer-chip">D</span>}
        {seat?.last && !hand?.result && <Bubble last={seat.last} />}
      </span>
      <span className="pod-name">{player.name}</span>
      <span className="pod-stack num">{status ?? chips(player.stack)}</span>
      <span className="pod-under">
        {seat && !seat.folded && (
          <span className="pod-cards">
            {seat.cards.length
              ? seat.cards.map((c) => <PlayingCard key={c} card={c} size="sm" dim={dimCard(c)} flip />)
              : [0, 1].map((i) => <PlayingCard key={i} back size="sm" />)}
          </span>
        )}
        {won > 0 ? <span className="pod-tag win">+{chips(won)}</span> : odds ? <span className="pod-tag odds">{pct(odds.win)}</span> : null}
      </span>
    </button>
  );
}

function MyBox({ game, me, seat, odds }: { game: Game; me?: Player; seat?: Seat; odds?: { win: number; tie: number } }) {
  if (odds) {
    return (
      <div className="my-box odds-box" aria-label={`Win ${pct(odds.win)}, tie ${pct(odds.tie)}`}>
        <small>Win</small>
        <b className="odds-win">{pct(odds.win)}</b>
        <small>Tie</small>
        <b>{pct(odds.tie)}</b>
      </div>
    );
  }
  const won = me ? (game.hand?.result?.won[me.id] ?? 0) : 0;
  return (
    <div className="my-box">
      {seat?.last && !game.hand?.result && <Bubble last={seat.last} />}
      <small>Your chips</small>
      <b className="num">{me ? chips(me.stack) : '–'}</b>
      {won > 0 ? (
        <span className="my-box-note win">+{chips(won)}</span>
      ) : seat && seat.bet > 0 && !game.hand?.result ? (
        <span className="my-box-note">In: {chips(seat.bet)}</span>
      ) : null}
    </div>
  );
}

function ActionArea({
  game,
  me,
  seat,
  myTurn,
  sending,
  now,
}: {
  game: Game;
  me?: Player;
  seat?: Seat;
  myTurn: boolean;
  sending: boolean;
  now: number;
}) {
  const hand = game.hand;
  const deviceId = useApp((s) => s.deviceId);
  const host = game.hostDeviceId === deviceId;

  if (!me) return <p className="table-note">You're watching this table.</p>;

  if (hand && !hand.result) {
    if (myTurn && seat) return <MyTurn game={game} hand={hand} seat={seat} sending={sending} now={now} />;
    const who = game.players.find((p) => p.id === hand.toAct);
    if (hand.runout) return <p className="table-note">Running it out…</p>;
    return (
      <p className="table-note">
        {who ? (
          <>
            <b>{who.name}</b> {who.bot ? 'is thinking' : 'to act'}
            <span className="dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </>
        ) : (
          '…'
        )}
        {me.sittingOut && <SitBack />}
      </p>
    );
  }

  // Between hands.
  if (game.status === 'playing' && hand?.result && lastStanding(game) && game.nextHandAt) {
    // One player has all the chips: the others have a few seconds to rebuy, then the game ends.
    const secs = Math.max(0, Math.ceil((game.nextHandAt - now) / 1000));
    return (
      <div className="stack">
        <ResultLine game={game} />
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
        <ResultLine game={game} />
        <button type="button" className="btn btn-green" onClick={() => dispatch({ type: 'rebuy' })}>
          Rebuy for {chips(game.settings.startingStack)}
        </button>
      </div>
    ) : (
      <div className="stack">
        <ResultLine game={game} />
        <p className="table-note">You're out of chips. Stick around and watch.</p>
      </div>
    );
  }
  if (me.sittingOut) {
    return (
      <div className="stack">
        <ResultLine game={game} />
        <button type="button" className="btn btn-green" onClick={() => dispatch({ type: 'sitOut', out: false })}>
          I'm back. Deal me in
        </button>
      </div>
    );
  }
  if (!hand?.result || game.nextHandAt === null) {
    return (
      <div className="stack">
        {hand?.result && <ResultLine game={game} />}
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
  const total = hand.result.showdown ? 9000 : 5000;
  const left = Math.max(0, Math.min(1, (game.nextHandAt - now) / total));
  return (
    <div className="stack">
      <ResultLine game={game} />
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
    </div>
  );
}

function SitBack() {
  return (
    <button type="button" className="btn-link-small" onClick={() => dispatch({ type: 'sitOut', out: false })}>
      I'm back
    </button>
  );
}

/** "Remi wins 340 with two pair". One line per winner. */
function ResultLine({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const result = game.hand?.result;
  if (!result) return null;
  const me = myPlayer(game, deviceId);
  const mySeat = seatFor(game.hand, me?.id);
  // Your cards stayed hidden (you folded, won without a showdown, or mucked): you can turn them over.
  const canShow = !!mySeat && !mySeat.shown && mySeat.cards.length === 2;
  const lines = Object.entries(result.won).map(([id, amount]) => {
    const p = game.players.find((x) => x.id === id);
    const you = p?.deviceId === deviceId;
    return { id, name: you ? 'You' : (p?.name ?? 'Someone'), you, amount, how: result.names[id] };
  });
  return (
    <div className="result-lines" role="status">
      {lines.map((l) => (
        <p key={l.id} className={`result-line pop${l.you ? ' you' : ''}`}>
          <b>{l.name}</b> {l.you ? 'win' : 'wins'} <b className="num">{chips(l.amount)}</b>
          {l.how && <span className="muted"> · {l.how}</span>}
        </p>
      ))}
      {canShow && (
        <button type="button" className="btn-link-small show-btn" onClick={() => dispatch({ type: 'show', hand: game.hand!.number })}>
          Show my cards
        </button>
      )}
    </div>
  );
}

function MyTurn({ game, hand, seat, sending, now }: { game: Game; hand: Hand; seat: Seat; sending: boolean; now: number }) {
  const o = options(game, hand, seat);
  const [raising, setRaising] = useState(false);
  const act = (move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number) => {
    setRaising(false);
    dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move, ...(to !== undefined ? { to } : {}) });
  };
  const left = hand.deadline ? Math.max(0, Math.ceil((hand.deadline - now) / 1000)) : null;

  if (raising)
    return (
      <RaisePanel
        game={game}
        hand={hand}
        seat={seat}
        onCancel={() => setRaising(false)}
        onRaise={(to) => act(to >= o.maxTo ? 'allin' : o.word === 'Bet' ? 'bet' : 'raise', to)}
      />
    );

  return (
    <div className="stack">
      <p className="table-note your-turn">
        Your turn{left !== null && <span className={`turn-clock${left <= 5 ? ' low' : ''}`}> · {left}s</span>}
      </p>
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
          <button type="button" className="btn btn-blue" disabled={sending} onClick={() => setRaising(true)}>
            {o.word}
          </button>
        )}
      </div>
    </div>
  );
}

function RaisePanel({
  game,
  hand,
  seat,
  onCancel,
  onRaise,
}: {
  game: Game;
  hand: Hand;
  seat: Seat;
  onCancel: () => void;
  onRaise: (to: number) => void;
}) {
  const o = options(game, hand, seat);
  const bb = game.settings.bigBlind;
  const [to, setTo] = useState(o.minTo);
  const potNow = pot(hand);
  const range = useRef<HTMLInputElement>(null);

  // Pot-sized raise: call first, then raise by the size of the pot after the call.
  const potRaise = (fraction: number) => hand.currentBet + Math.round((potNow + o.toCall) * fraction);
  const clamp = (n: number) => Math.max(o.minTo, Math.min(o.maxTo, n));
  const presets = [
    { label: 'Min', to: o.minTo },
    { label: '½ pot', to: clamp(potRaise(0.5)) },
    { label: '¾ pot', to: clamp(potRaise(0.75)) },
    { label: 'Pot', to: clamp(potRaise(1)) },
    { label: 'All in', to: o.maxTo },
  ];
  const step = Math.max(1, Math.min(bb, Math.floor((o.maxTo - o.minTo) / 50) || 1));

  const nudge = (dir: 1 | -1) => setTo((t) => clamp(t + dir * step));

  // A panel pinned to the bottom of the screen, over your cards, so every option is in view without scrolling.
  return (
    <div className="raise-layer" onClick={onCancel}>
      <div className="raise-panel" role="dialog" aria-label={`${o.word} amount`} onClick={(e) => e.stopPropagation()}>
        <div className="raise-head">
          <span className="muted">{o.word} to</span>
          <b className="raise-amount num">{chips(to)}</b>
          <span className="muted raise-of">of {chips(o.maxTo)}</span>
        </div>
        <div className="raise-presets">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-label={p.label}
              className={`preset press${p.to === to ? ' on' : ''}`}
              onClick={() => setTo(p.to)}
            >
              <b>{p.label}</b>
              <small className="num">{chips(p.to)}</small>
            </button>
          ))}
        </div>
        <div className="raise-fine">
          <button type="button" className="icon-btn press" aria-label="Less" disabled={to <= o.minTo} onClick={() => nudge(-1)}>
            <MinusIcon />
          </button>
          <input
            ref={range}
            className="raise-slider"
            type="range"
            min={o.minTo}
            max={o.maxTo}
            step={step}
            value={to}
            aria-label={`${o.word} amount`}
            onChange={(e) => {
              const v = Number(e.target.value);
              // Snap to all in at the top, so the last step isn't lost to rounding.
              setTo(v + step > o.maxTo ? o.maxTo : v);
            }}
          />
          <button type="button" className="icon-btn press" aria-label="More" disabled={to >= o.maxTo} onClick={() => nudge(1)}>
            <PlusIcon />
          </button>
        </div>
        <div className="action-buttons two">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Back
          </button>
          <button type="button" className="btn btn-blue" onClick={() => onRaise(to)}>
            {to >= o.maxTo ? 'All in' : `${o.word} ${chips(to)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
