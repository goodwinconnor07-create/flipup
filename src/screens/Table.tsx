import { useEffect, useMemo, useRef, useState } from 'react';
import { cardName, describeHand, equity, myPlayer, options, pot, seatFor, type Card, type Equity, type Game, type Hand } from '../game';
import { dispatch, openSheet, useApp } from '../state/store';
import { toTableTime } from '../state/clock';
import { Avatar, CardSlot, chips, Count, PlayingCard, Spinner, useNow } from '../ui/components';
import { confetti, CONFETTI, haptic } from '../ui/effects';
import { MenuIcon } from '../ui/Icons';
import { playSound } from '../ui/sound';
import { useTableSounds } from '../ui/useTableSounds';
import { Final } from './Final';
import { SidePanel } from './SidePanel';
import { useDesktop } from '../ui/useDesktop';
import { Lobby } from './Lobby';
import { useWakeLock } from '../ui/useWakeLock';
import { ActionArea, RaiseSizer, type PreAction } from './table/Actions';
import { useReactions } from './table/Bubbles';
import { HiddenPlayers, MyBox, othersInOrder, Pod, usePodSlots } from './table/Pods';

export function Table() {
  const desktop = useDesktop();
  const game = useApp((s) => s.game);
  // Say so when the blinds go up: a red banner slides down from the top of the screen.
  const bigBlind = game?.settings.bigBlind;
  const lastBlind = useRef(bigBlind);
  const [blindNews, setBlindNews] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (game && bigBlind !== undefined && lastBlind.current !== undefined && bigBlind > lastBlind.current && game.status === 'playing') {
      setBlindNews({ id: Date.now(), text: `Blinds are now ${chips(game.settings.smallBlind)}/${chips(bigBlind)} 🚨` });
      playSound('chips');
    }
    lastBlind.current = bigBlind;
  }, [bigBlind]);
  const conn = useApp((s) => s.conn);
  const online = useApp((s) => s.session?.mode === 'online');
  // The screen stays on while you're at a table that's still going.
  useWakeLock(!!game && game.status !== 'ended');

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
      {blindNews && <BlindBanner key={blindNews.id} text={blindNews.text} onDone={() => setBlindNews(null)} />}
      <TableBar game={game} />
      <div className="rotate-hint" role="alert">
        <b>Turn your phone upright</b>
        <span>The table is built for portrait.</span>
      </div>
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

/** An announcement bar that slides down from the top, stays for five seconds, then slides back out. */
const BANNER_MS = 5000;
const BANNER_OUT_MS = 320; // matches banner-out in table.css

function BlindBanner({ text, onDone }: { text: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), BANNER_MS);
    const gone = setTimeout(onDone, BANNER_MS + BANNER_OUT_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, []);
  return (
    <div className={`blind-banner${leaving ? ' leaving' : ''}`} role="status">
      {text}
    </div>
  );
}

/** " · blinds up in 4:32", counting down. When it hits zero the blinds go up as the next hand is dealt. */
function BlindClock({ game }: { game: Game }) {
  const now = useNow(1000);
  if (game.blindsRaiseAt == null) return null;
  const left = Math.max(0, Math.ceil((game.blindsRaiseAt - now) / 1000));
  if (left === 0) return <> · blinds up next hand</>;
  return (
    <>
      {' '}
      · blinds up in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </>
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
              {game.status === 'playing' && !!game.settings.blindMinutes && <BlindClock game={game} />}
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

/** The table itself: the other players, the board, the actions and your cards. `bare` is how a Scroll card uses it: no show-cards buttons or between-hands bar, and no confetti of its own. */
export function Felt({ game, bare = false }: { game: Game; bare?: boolean }) {
  const deviceId = useApp((s) => s.deviceId);
  const sending = useApp((s) => s.sending);
  const look = useApp((s) => s.look);
  const me = myPlayer(game, deviceId);
  const hand = game.hand;
  const mySeat = seatFor(hand, me?.id);
  const others = othersInOrder(game, me);
  const odds = useOdds(hand);
  const desktop = useDesktop();
  const speakerOk = useRef<(id: string) => boolean>(() => true);
  const { say: reactions, quiet } = useReactions(game, speakerOk);
  // On a phone the row of four slides; on a computer everyone sits round the table.
  // Someone who folded stays in view while they're still saying something.
  const podSlots = usePodSlots(game, others, !desktop, reactions);
  speakerOk.current = podSlots.canShow;
  const myTurn = !!hand && !hand.result && !!me && hand.toAct === me.id;
  const timed = !!hand?.deadline || ((!hand || !!hand.result) && !!game.nextHandAt);
  const real = useNow(timed ? 200 : 60_000);
  const now = toTableTime(real, game.fast);
  useTableSounds(game, me?.id);

  // A buzz when it's your turn, and confetti when you win a pot.
  const turnKey = myTurn ? `${hand!.number}-${hand!.seq}` : '';
  useEffect(() => {
    if (turnKey) haptic('medium');
  }, [turnKey]);
  const won = hand?.result && me ? (hand.result.won[me.id] ?? 0) : 0;
  // Getting your own blind back when everyone folds isn't worth a party; a real win is.
  const gained = won - (mySeat?.total ?? 0);
  const winKey = won > 0 && (hand?.result?.showdown ? gained > 0 : gained >= game.settings.bigBlind) ? hand!.number : 0;
  useEffect(() => {
    if (!winKey || bare) return;
    haptic('success');
    confetti(CONFETTI.win, { x: innerWidth / 2, y: innerHeight * 0.75 });
  }, [winKey]);

  // The tab says so when it's your turn and you're looking at something else.
  useEffect(() => {
    const base = 'GTODuel';
    const update = () => {
      document.title = myTurn && document.hidden ? `Your turn · ${base}` : base;
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      document.title = base;
    };
  }, [myTurn]);

  // For a screen reader: what just happened, and when it's your turn, said once each.
  const lastLine = hand?.log[hand.log.length - 1]?.replace(/\[([2-9TJQKA][shdc])\]/g, (_m, c: string) => cardName(c)) ?? '';
  const announce = myTurn ? `${lastLine} It is your move.` : lastLine;

  // A tick for each of your last five seconds.
  const secsLeft = myTurn && hand?.deadline ? Math.max(0, Math.ceil((hand.deadline - now) / 1000)) : null;
  useEffect(() => {
    if (secsLeft !== null && secsLeft > 0 && secsLeft <= 5) playSound('tick');
  }, [secsLeft]);

  // Pre-actions: tap Check/Fold, Call current or Call any before your turn and it plays itself when it comes round.
  // They're cleared on each new street, because the situation has changed. Call current is also cleared the
  // moment someone raises, so it never calls more than you saw.
  const [pre, setPre] = useState<PreAction>(null);
  // The raise amount while the sizer is open. The sizer takes the place of your cards and chip counter.
  const [raise, setRaise] = useState<number | null>(null);
  useEffect(() => {
    if (!myTurn) setRaise(null);
  }, [myTurn]);
  const sizing = raise !== null && myTurn && !!hand && !!mySeat;
  const streetKey = hand ? `${hand.number}-${hand.street}` : '';
  useEffect(() => setPre(null), [streetKey]);
  useEffect(() => {
    if (!pre || !hand || !mySeat) return;
    if (pre.kind === 'current' && hand.currentBet !== pre.bet) {
      setPre(null);
      return;
    }
    if (!myTurn) return;
    const o = options(game, hand, mySeat);
    const move = o.canCheck ? 'check' : pre.kind === 'checkfold' ? 'fold' : 'call';
    const t = setTimeout(() => {
      setPre(null);
      dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move });
    }, 400);
    return () => clearTimeout(t);
  }, [pre, myTurn, hand?.number, hand?.seq, hand?.currentBet]);

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
  const canShow = !bare && !!hand?.result && !!mySeat && !mySeat.shown && mySeat.cards.length === 2;

  return (
    <div className="felt">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
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
                  quiet={quiet[p.id]}
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
                quiet={quiet[me.id]}
                dimCard={dim}
                glowCard={glow}
                slot={0}
                ring={{ x: 50, y: 90 }}
                n={1}
                away={false}
                self
              />
            )}
            {podSlots.hidden > 0 && <HiddenPlayers game={game} players={others.filter((p) => podSlots.slots.get(p.id)?.away)} />}
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
        {bare && (!hand || hand.result) ? null : <ActionArea game={game} me={me} seat={mySeat} myTurn={myTurn} sending={!!sending} now={now} pre={pre} setPre={setPre} raise={raise} setRaise={setRaise} />}
        {sizing && desktop && <RaiseSizer game={game} hand={hand!} seat={mySeat!} to={raise!} setTo={setRaise} onCancel={() => setRaise(null)} />}
      </div>

      <div className={`me-area${canShow ? ' has-show' : ''}${sizing && !desktop ? ' sizing' : ''}`}>
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
          {canShow && (
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
            </span>
          )}
        </div>
        <MyBox game={game} me={me} seat={mySeat} odds={me ? odds?.get(me.id) : undefined} reaction={me ? reactions[me.id] : undefined} quiet={me ? quiet[me.id] : undefined} />
        {sizing && !desktop && <RaiseSizer game={game} hand={hand!} seat={mySeat!} to={raise!} setTo={setRaise} onCancel={() => setRaise(null)} />}
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
