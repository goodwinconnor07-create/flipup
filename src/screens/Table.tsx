import { useEffect, useMemo, useRef, useState } from 'react';
import {
  describeHand,
  equity,
  lastStanding,
  myPlayer,
  options,
  positionOf,
  pot,
  REACTIONS,
  reactionText,
  seatFor,
  type Card,
  type Equity,
  type Game,
  type Hand,
  type Player,
  type Seat,
} from '../game';
import { dispatch, openSheet, react, useApp } from '../state/store';
import { Avatar, CardSlot, chips, Count, PlayingCard, PositionChips, Spinner, useNow } from '../ui/components';
import { confetti, CONFETTI, haptic } from '../ui/effects';
import { ChatIcon, MenuIcon, MinusIcon, PlusIcon } from '../ui/Icons';
import { playSound } from '../ui/sound';
import { useTableSounds } from '../ui/useTableSounds';
import { Final } from './Final';
import { SidePanel } from './SidePanel';
import { useDesktop } from '../ui/useDesktop';
import { Lobby } from './Lobby';

export function Table() {
  const desktop = useDesktop();
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
    <div className={`screen table-screen status-${game.status}${desktop ? ' desk' : ''}`}>
      <TableBar game={game} />
      {online && conn === 'offline' && (
        <div className="conn-pill" role="status">
          <i /> Reconnecting…
        </div>
      )}
      {game.status === 'lobby' && <Lobby game={game} />}
      {game.status === 'playing' &&
        (desktop ? (
          <div className="desk-body">
            <div className="desk-main">
              <Felt game={game} />
            </div>
            <SidePanel />
          </div>
        ) : (
          <Felt game={game} />
        ))}
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
function Bubble({ last, street }: { last: NonNullable<Seat['last']>; street?: string }) {
  const text = bubbleText(last);
  const money = last.move !== 'fold' && last.move !== 'check' && last.move !== 'sb' && last.move !== 'bb';
  // Keyed on the text, so every new move pops in.
  return (
    <span
      key={text}
      className={`bubble pop ${money ? 'bubble-blue' : 'bubble-grey'}${street && last.street !== street ? ' bubble-old' : ''}`}
      role="status"
    >
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

type PreAction = 'checkfold' | 'callany' | null;

const MAX_PODS = 4;

/**
 * Up to four players show along the top. With more at the table the row moves: players who've
 * folded slide out, and when the action reaches someone off to the right they slide in from the
 * right while whoever's furthest left slides out. The window only moves when it has to, so
 * pictures don't jump about.
 */
function usePodSlots(
  game: Game,
  others: Player[],
  windowed: boolean,
): { slots: Map<string, { slot: number; away: boolean }>; n: number; hidden: number } {
  const start = useRef(0);
  const slots = new Map<string, { slot: number; away: boolean }>();
  if (!windowed || others.length <= MAX_PODS) {
    others.forEach((p, i) => slots.set(p.id, { slot: i, away: false }));
    return { slots, n: others.length, hidden: 0 };
  }
  const hand = game.hand;
  // Who's still worth looking at: anyone who hasn't folded (everyone, between hands).
  const live = others.filter((p) => {
    if (!hand) return true;
    const seat = seatFor(hand, p.id);
    return !!seat && !seat.folded;
  });
  const n = Math.min(MAX_PODS, live.length);
  // The player to keep in view: whoever's turn it is, or the winner once the hand is over.
  const focus = hand?.result ? Object.entries(hand.result.won).sort((a, b) => b[1] - a[1])[0]?.[0] : hand?.toAct;
  let s = Math.max(0, Math.min(start.current, live.length - n));
  const at = live.findIndex((p) => p.id === focus);
  if (at >= 0) {
    if (at < s) s = at;
    else if (at > s + n - 1) s = at - n + 1;
  }
  start.current = s;
  const visible = live.slice(s, s + n);
  const first = visible.length ? others.findIndex((p) => p.id === visible[0].id) : others.length;
  others.forEach((p, i) => {
    const k = visible.findIndex((v) => v.id === p.id);
    if (k >= 0) slots.set(p.id, { slot: k, away: false });
    // Out of view: to the left if they come before the ones showing, otherwise to the right.
    else slots.set(p.id, { slot: i < first ? -1 : n, away: true });
  });
  return { slots, n, hidden: others.length - n };
}

function Felt({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const sending = useApp((s) => s.sending);
  const look = useApp((s) => s.look);
  const me = myPlayer(game, deviceId);
  const hand = game.hand;
  const mySeat = seatFor(hand, me?.id);
  const others = othersInOrder(game, me);
  const odds = useOdds(hand);
  const desktop = useDesktop();
  // On a phone the row of four slides; on a computer everyone sits round the table.
  const podSlots = usePodSlots(game, others, !desktop);
  const myTurn = !!hand && !hand.result && !!me && hand.toAct === me.id;
  const timed = !!hand?.deadline || (!!hand?.result && !!game.nextHandAt);
  const now = useNow(timed ? 200 : 60_000);
  const reactions = useReactions(game);
  useTableSounds(game, me?.id);

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

  // A tick for each of your last five seconds.
  const secsLeft = myTurn && hand?.deadline ? Math.max(0, Math.ceil((hand.deadline - now) / 1000)) : null;
  useEffect(() => {
    if (secsLeft !== null && secsLeft > 0 && secsLeft <= 5) playSound('tick');
  }, [secsLeft]);

  // Pre-actions: tap Check/Fold or Call any before your turn and it plays itself when it comes round.
  // They're cleared on each new street, because the situation has changed.
  const [pre, setPre] = useState<PreAction>(null);
  const streetKey = hand ? `${hand.number}-${hand.street}` : '';
  useEffect(() => setPre(null), [streetKey]);
  useEffect(() => {
    if (!pre || !myTurn || !hand || !mySeat) return;
    const o = options(game, hand, mySeat);
    const move = o.canCheck ? 'check' : pre === 'callany' ? 'call' : 'fold';
    const t = setTimeout(() => {
      setPre(null);
      dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move });
    }, 400);
    return () => clearTimeout(t);
  }, [pre, myTurn, hand?.number, hand?.seq]);

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
  // At showdown the winning five cards lift and glow and the rest grey out. Never while the hand is being played.
  const showdown = !!hand?.result?.showdown && !!highlight;
  const dim = (c: Card) => showdown && !lit.has(c);
  const glow = (c: Card) => showdown && lit.has(c);
  const myValue = mySeat && !mySeat.folded && mySeat.cards.length ? describeHand([...mySeat.cards, ...(hand?.board ?? [])]) : null;
  // Before the flop, "High card" says nothing; a pocket pair is worth pointing out.
  const myHandName = myValue && (hand!.board.length >= 3 || myValue.category > 0) ? myValue.name : null;
  const pillName = hand?.result?.showdown ? highlight?.name : myHandName;
  // The pot counts down to nothing as it's pushed to the winner.
  const potNow = hand && !hand.result ? pot(hand) : 0;
  // Your cards stayed hidden (you folded, won without a showdown, or mucked): you can turn them over.
  const canShow = !!hand?.result && !!mySeat && !mySeat.shown && mySeat.cards.length === 2;
  // The host can turn every bot's cards over once the hand is done.
  const canReveal =
    !!hand?.result &&
    game.hostDeviceId === deviceId &&
    hand.seats.some((s) => !s.shown && game.players.find((p) => p.id === s.playerId)?.bot);

  return (
    <div className="felt">
      <div className="stage">
        {(others.length > 0 || desktop) && (
          <div
            className={`pods${others.length >= 8 ? ' crowded' : ''}`}
            style={{ ['--tile' as string]: others.length >= 8 ? '192px' : '232px' }}
          >
            {others.map((p, i) => {
              const at = podSlots.slots.get(p.id)!;
              // Seat round the table (computers): left, over the top, to the right, in turn order.
              // A full table of eight others needs a slightly wider sweep so the seats clear each other.
              const crowded = others.length >= 8;
              const span = crowded ? 230 : 220;
              const deg = others.length === 1 ? 90 : 90 + span / 2 - (i * span) / (others.length - 1);
              const rad = (deg * Math.PI) / 180;
              const ring = { x: 50 + (crowded ? 41 : 40) * Math.cos(rad), y: 55 - (crowded ? 41 : 40) * Math.sin(rad) };
              return (
                <Pod
                  key={p.id}
                  game={game}
                  player={p}
                  seat={seatFor(hand, p.id)}
                  odds={odds?.get(p.id)}
                  reaction={reactions[p.id]}
                  dimCard={dim}
                  glowCard={glow}
                  slot={at.slot}
                  ring={ring}
                  n={podSlots.n}
                  away={at.away}
                />
              );
            })}
            {desktop && me && (
              <Pod
                key={me.id}
                game={game}
                player={me}
                seat={mySeat}
                odds={odds?.get(me.id)}
                reaction={reactions[me.id]}
                dimCard={dim}
                glowCard={glow}
                slot={0}
                ring={{ x: 50, y: 90 }}
                n={1}
                away={false}
                self
              />
            )}
            {podSlots.hidden > 0 && (
              <span className="pods-more" aria-label={`${podSlots.hidden} more players not shown`}>
                +{podSlots.hidden}
              </span>
            )}
          </div>
        )}

        <div className={`table-oval rail-${look.rail}`} style={{ ['--felt' as string]: look.felt }}>
          <TableTimer game={game} now={now} mine={myTurn} />
          <div className="table-felt">
            <div className="table-top">
              {hand && (
                <span className="pot-pill" aria-label={`Pot ${chips(pot(hand))}`}>
                  <i className="pot-chip" aria-hidden />
                  <small>Pot</small> <Count value={potNow} />
                </span>
              )}
            </div>
            <div className="board" aria-label="Board">
              {[0, 1, 2, 3, 4].map((i) => {
                const c = hand?.board[i];
                return c ? (
                  <PlayingCard
                    key={`${hand!.number}-${c}`}
                    card={c}
                    size="lg"
                    dim={dim(c)}
                    glow={glow(c)}
                    flip
                    delay={i < 3 ? i * 160 : 0}
                  />
                ) : (
                  <CardSlot key={`slot-${i}`} size="lg" />
                );
              })}
            </div>
            <div className="table-foot">
              {hand?.result ? (
                <WinBanner game={game} />
              ) : pillName ? (
                <span key={pillName} className="hand-pill pop">
                  {pillName}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="action-area">
        <ActionArea game={game} me={me} seat={mySeat} myTurn={myTurn} sending={!!sending} now={now} pre={pre} setPre={setPre} />
      </div>

      <div className={`me-area${canShow || canReveal ? ' has-show' : ''}`}>
        <div className="my-cards">
          {mySeat?.cards.length ? (
            mySeat.cards.map((c, i) => (
              <PlayingCard
                key={`${hand!.number}-${c}`}
                card={c}
                size="xl"
                dim={mySeat.folded || dim(c)}
                glow={glow(c)}
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
          {(canShow || canReveal) && (
            <span className="show-row">
              {canShow && (
                <button
                  type="button"
                  className="show-small press"
                  aria-label="Show my cards"
                  onClick={() => dispatch({ type: 'show', hand: hand!.number })}
                >
                  Show cards
                </button>
              )}
              {canReveal && (
                <button
                  type="button"
                  className="show-small press"
                  aria-label="Reveal the bots' hands"
                  onClick={() => dispatch({ type: 'revealBots', hand: hand!.number })}
                >
                  Reveal bots
                </button>
              )}
            </span>
          )}
        </div>
        <MyBox game={game} me={me} seat={mySeat} odds={me ? odds?.get(me.id) : undefined} reaction={me ? reactions[me.id] : undefined} />
      </div>
    </div>
  );
}

/**
 * The turn timer, wrapped round the table: a bright line along the rail that shrinks back
 * towards the top as time runs out (blue on your turn, gold for anyone else, red at the end).
 */
function TableTimer({ game, now, mine }: { game: Game; now: number; mine: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const hand = game.hand;
  const live = !!hand?.deadline && !hand.result && game.settings.turnSeconds > 0;
  const total = game.settings.turnSeconds * 1000;
  const left = live ? Math.max(0, Math.min(1, (hand!.deadline! - now) / total)) : 0;
  const low = live && left * game.settings.turnSeconds <= 5;
  // A stadium along the middle of the rail, starting at the top middle and running clockwise.
  const { w, h } = size;
  const inset = 5.5;
  const r = (h - inset * 2) / 2;
  const x0 = inset;
  const x1 = w - inset;
  const y0 = inset;
  const y1 = h - inset;
  const d = `M ${w / 2} ${y0} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} H ${x0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`;
  return (
    <svg
      ref={ref}
      className={`table-timer${live ? ' live' : ''}${mine ? ' mine' : ''}${low ? ' low' : ''}`}
      aria-hidden={!live}
      role={live ? 'timer' : undefined}
      aria-label={live ? `${Math.ceil(left * game.settings.turnSeconds)} seconds left` : undefined}
    >
      {w > 0 && live && (
        <>
          <path d={d} className="timer-track" pathLength={100} />
          <path d={d} className="timer-run" pathLength={100} strokeDasharray={`${left * 100} 100`} />
        </>
      )}
    </svg>
  );
}

/** "Remi wins 340 · Two pair, kings and fives", on the table when a hand finishes. */
function WinBanner({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const hand = game.hand!;
  const result = hand.result!;
  const winners = Object.entries(result.won)
    .map(([id, amount]) => ({ p: game.players.find((x) => x.id === id), id, amount }))
    .filter((w) => w.p)
    .sort((a, b) => b.amount - a.amount);
  if (!winners.length) return null;
  const top = winners[0];
  const split = winners.length > 1;
  const you = top.p!.deviceId === deviceId;
  const title = split
    ? `Split pot · ${winners.map((w) => w.p!.name).join(' & ')}`
    : `${you ? 'You win' : `${top.p!.name} wins`} ${chips(top.amount)}`;
  const how = result.showdown ? result.names[top.id] : 'Everyone else folded';
  return (
    <div key={hand.number} className="win-banner pop" role="status">
      <Avatar emoji={top.p!.emoji} size={34} />
      <span className="win-text">
        <b>{title}</b>
        {how && <small>{how}</small>}
      </span>
    </div>
  );
}

/** Each player's latest quick message, shown for a few seconds after it arrives. */
function useReactions(game: Game): Record<string, string> {
  const seen = useRef<Record<string, number> | null>(null);
  const [active, setActive] = useState<Record<string, string>>({});
  const reactions = game.reactions;
  useEffect(() => {
    const now = reactions ?? {};
    if (seen.current === null) {
      // Whatever was said before you arrived stays unsaid.
      seen.current = Object.fromEntries(Object.entries(now).map(([id, r]) => [id, r.n]));
      return;
    }
    for (const [id, r] of Object.entries(now)) {
      if (seen.current[id] === r.n) continue;
      seen.current[id] = r.n;
      setActive((a) => ({ ...a, [id]: r.id }));
      playSound('pop');
      setTimeout(
        () =>
          setActive((a) => {
            if (a[id] !== r.id) return a;
            const { [id]: _gone, ...rest } = a;
            return rest;
          }),
        3800,
      );
    }
  }, [reactions]);
  return active;
}

/** A quick message bubble: white with a border, to tell it from an action. */
function ReactBubble({ id }: { id: string }) {
  const text = reactionText(id);
  const emoji = !/[A-Za-z]/.test(text);
  return (
    <span key={`${id}-${text}`} className={`bubble bubble-react pop${emoji ? ' bubble-emoji' : ''}`} role="status">
      {text}
    </span>
  );
}

function Pod({
  game,
  player,
  seat,
  odds,
  reaction,
  dimCard,
  glowCard,
  slot,
  ring,
  n,
  away,
  self = false,
}: {
  game: Game;
  player: Player;
  seat: Seat | undefined;
  odds?: { win: number; tie: number };
  reaction?: string;
  dimCard: (c: Card) => boolean;
  glowCard: (c: Card) => boolean;
  slot: number;
  ring: { x: number; y: number };
  n: number;
  away: boolean;
  /** My own seat, at the bottom of the table on a computer. */
  self?: boolean;
}) {
  const hand = game.hand;
  const deviceId = useApp((s) => s.deviceId);
  const host = game.hostDeviceId === deviceId;
  const turn = !!hand && !hand.result && hand.toAct === player.id;
  const out = !seat || seat.folded;
  const won = hand?.result?.won[player.id] ?? 0;
  const status = player.stack === 0 && !seat ? 'Out' : player.sittingOut ? 'Away' : null;

  return (
    <button
      type="button"
      className={`pod${out ? ' out' : ''}${turn ? ' turn' : ''}${won ? ' won' : ''}${away ? ' away' : ''}${self ? ' self' : ''}`}
      style={{ ['--slot' as string]: slot, ['--n' as string]: n, ['--ax' as string]: `${ring.x}%`, ['--ay' as string]: `${ring.y}%` }}
      tabIndex={away ? -1 : undefined}
      aria-hidden={away || undefined}
      aria-label={`${player.name}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}`}
      onClick={() => host && !self && openSheet({ name: 'player', playerId: player.id })}
    >
      <span className="pod-pic">
        {turn && <span className="pod-ring" aria-hidden />}
        <Avatar emoji={player.emoji} size={50} />
        <PositionChips pos={positionOf(hand, player.id)} />
        {reaction ? <ReactBubble id={reaction} /> : seat?.last && <Bubble last={seat.last} street={hand?.street} />}
      </span>
      <span className="pod-name">{player.name}</span>
      <span className="pod-stack num">{status ?? <Count value={player.stack} />}</span>
      <span className="pod-under">
        {!self && seat && (!seat.folded || (seat.shown && seat.cards.length > 0)) && (
          <span className="pod-cards">
            {seat.cards.length
              ? seat.cards.map((c) => <PlayingCard key={c} card={c} size="sm" dim={dimCard(c)} glow={glowCard(c)} flip />)
              : [0, 1].map((i) => <PlayingCard key={i} back size="sm" />)}
          </span>
        )}
        {won > 0 ? <span className="pod-tag win">+{chips(won)}</span> : odds ? <span className="pod-tag odds">{pct(odds.win)}</span> : null}
      </span>
    </button>
  );
}

/** Quick messages: a small button, and a small panel of phrases and emoji that closes as soon as you pick one. */
function ReactMenu() {
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const send = (id: string) => {
    if (cooling) return;
    haptic('light');
    react(id);
    setOpen(false);
    setCooling(true);
    setTimeout(() => setCooling(false), 2500);
  };
  return (
    <>
      <button type="button" className="react-btn press" aria-label="Quick messages" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ChatIcon />
      </button>
      {open && (
        <>
          <div className="react-scrim" onClick={() => setOpen(false)} />
          <div className="react-pop rise" role="menu" aria-label="Quick messages">
            {REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="menuitem"
                className={`react-item press${/[A-Za-z]/.test(r.text) ? '' : ' react-emoji'}`}
                disabled={cooling}
                onClick={() => send(r.id)}
              >
                {r.text}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function MyBox({
  game,
  me,
  seat,
  odds,
  reaction,
}: {
  game: Game;
  me?: Player;
  seat?: Seat;
  odds?: { win: number; tie: number };
  reaction?: string;
}) {
  const hand = game.hand;
  const desktop = useDesktop();
  // On a computer my seat is on the table (bottom), so the bubble and position are shown there.
  const bubble = desktop ? null : reaction ? (
    <ReactBubble id={reaction} />
  ) : seat?.last ? (
    <Bubble last={seat.last} street={hand?.street} />
  ) : null;
  const pos = me && !desktop && <PositionChips pos={positionOf(hand, me.id)} />;
  if (odds) {
    return (
      <div className="my-box odds-box" aria-label={`Win ${pct(odds.win)}, tie ${pct(odds.tie)}`}>
        {bubble}
        <small>Win</small>
        <b className="odds-win">{pct(odds.win)}</b>
        <small>Tie</small>
        <b>{pct(odds.tie)}</b>
        {pos}
        {me && <ReactMenu />}
      </div>
    );
  }
  const won = me ? (hand?.result?.won[me.id] ?? 0) : 0;
  return (
    <div className="my-box">
      {bubble}
      <small>Your chips</small>
      <b>{me ? <Count value={me.stack} /> : '–'}</b>
      {won > 0 ? (
        <span className="my-box-note win">+{chips(won)}</span>
      ) : seat && seat.bet > 0 && !hand?.result ? (
        <span className="my-box-note">In: {chips(seat.bet)}</span>
      ) : null}
      {pos}
      {me && <ReactMenu />}
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
  pre,
  setPre,
}: {
  game: Game;
  me?: Player;
  seat?: Seat;
  myTurn: boolean;
  sending: boolean;
  now: number;
  pre: PreAction;
  setPre: (p: PreAction) => void;
}) {
  const hand = game.hand;
  const deviceId = useApp((s) => s.deviceId);
  const host = game.hostDeviceId === deviceId;

  if (!me) return <p className="table-note">You're watching this table.</p>;

  if (hand && !hand.result) {
    if (myTurn && seat) return <MyTurn game={game} hand={hand} seat={seat} sending={sending} />;
    const who = game.players.find((p) => p.id === hand.toAct);
    if (hand.runout) return <p className="table-note">Running it out…</p>;
    // Still in the hand with chips behind: you can set what to do before your turn comes round.
    const canPre = !!seat && !seat.folded && !seat.allIn && !me.sittingOut;
    return (
      <div className="stack">
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
        {canPre && (
          <div className="pre-actions" role="group" aria-label="Before your turn">
            <button
              type="button"
              aria-pressed={pre === 'checkfold'}
              className={`pre-btn press${pre === 'checkfold' ? ' on' : ''}`}
              onClick={() => setPre(pre === 'checkfold' ? null : 'checkfold')}
            >
              Check / Fold
            </button>
            <button
              type="button"
              aria-pressed={pre === 'callany'}
              className={`pre-btn press${pre === 'callany' ? ' on' : ''}`}
              onClick={() => setPre(pre === 'callany' ? null : 'callany')}
            >
              Call any
            </button>
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
  const total = hand.result.showdown ? 9000 : 5000;
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

function MyTurn({ game, hand, seat, sending }: { game: Game; hand: Hand; seat: Seat; sending: boolean }) {
  const o = options(game, hand, seat);
  const [raising, setRaising] = useState(false);
  const act = (move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number) => {
    setRaising(false);
    dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move, ...(to !== undefined ? { to } : {}) });
  };
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
