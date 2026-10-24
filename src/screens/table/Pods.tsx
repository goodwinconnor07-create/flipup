import { useRef, useState } from 'react';
import { positionOf, seatFor, type Card, type Game, type Player, type Seat } from '../../game';
import { dispatch, openSheet, useApp } from '../../state/store';
import { Avatar, chips, Count, PlayingCard, PositionChips } from '../../ui/components';
import { useDesktop } from '../../ui/useDesktop';
import { loadBigBlinds, saveBigBlinds } from '../../state/persist';
import { Bubble, moveSig, ReactBubble, ReactMenu } from './Bubbles';

/** Everyone else, in seat order starting on this phone's left, so play moves left to right. */
export function othersInOrder(game: Game, me: Player | undefined): Player[] {
  const all = [...game.players].sort((a, b) => a.seat - b.seat);
  if (!me) return all;
  const i = all.findIndex((p) => p.id === me.id);
  return [...all.slice(i + 1), ...all.slice(0, i)];
}

/** 98.5 BB, or 120 BB: one decimal only while it's small. */
const bigBlinds = (n: number) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString('en-US');

export const pct = (n: number) => `${Math.round(n * 100)}%`;

const MAX_PODS = 4;

/**
 * Up to four players show along the top. With more at the table the row moves: players who've
 * folded slide out, and when the action reaches someone off to the right they slide in from the
 * right while whoever's furthest left slides out. The window only moves when it has to, so
 * pictures don't jump about.
 */
export function usePodSlots(
  game: Game,
  others: Player[],
  windowed: boolean,
  talking: Record<string, string> = {},
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
    return !!seat && (!seat.folded || !!talking[p.id]);
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

/** "+3": the players not in the row right now. Tap it for who they are and how many chips each has. */
export function HiddenPlayers({ game, players }: { game: Game; players: Player[] }) {
  const [open, setOpen] = useState(false);
  const hand = game.hand;
  return (
    <>
      {open && <button type="button" className="hidden-scrim" aria-label="Close" onClick={() => setOpen(false)} />}
      <span className="hidden-wrap">
        {open && (
          <div className="hidden-pop pop" role="dialog" aria-label="Other players">
            {players.map((p) => {
              const seat = seatFor(hand, p.id);
              const note = p.stack === 0 && !seat ? 'Out' : seat?.folded ? 'Folded' : p.sittingOut ? 'Away' : p.offline ? 'Offline' : null;
              return (
                <div key={p.id} className="hidden-row">
                  <Avatar emoji={p.emoji} size={24} />
                  <span className="hidden-name">{p.name}</span>
                  {note && <small className="muted">{note}</small>}
                  <b className="num">{chips(p.stack)}</b>
                </div>
              );
            })}
          </div>
        )}
        <button
          type="button"
          className="pods-more press"
          aria-label={`${players.length} more players not shown`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          +{players.length}
        </button>
      </span>
    </>
  );
}

export function Pod({
  game,
  player,
  seat,
  odds,
  reaction,
  quiet,
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
  /** The move whose bubble has been spoken over: it stays hidden. */
  quiet?: string;
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
  const canPeek = !!hand?.result && player.bot && !!seat && !seat.shown;
  // Before the first hand is dealt nobody is out: they're just waiting for the cards.
  const out = !!hand && (!seat || seat.folded);
  const won = hand?.result?.won[player.id] ?? 0;
  const status = player.stack === 0 && !seat ? 'Out' : player.sittingOut ? 'Away' : null;
  // A bot on the clock shows typing dots until it speaks or moves.
  const thinking = turn && player.bot && !hand?.runout;
  // The seats at each end of the row keep their bubble from hanging off the screen.
  const desk = useDesktop();
  const edge = n > 1 && !self && !desk ? (slot === 0 ? ' edge-l' : slot === n - 1 ? ' edge-r' : '') : '';

  return (
    <button
      type="button"
      className={`pod${out ? ' out' : ''}${player.offline ? ' offline' : ''}${turn ? ' turn' : ''}${won ? ' won' : ''}${away ? ' away' : ''}${self ? ' self' : ''}${edge}`}
      style={{ ['--slot' as string]: slot, ['--n' as string]: n, ['--ax' as string]: `${ring.x}%`, ['--ay' as string]: `${ring.y}%` }}
      tabIndex={away ? -1 : undefined}
      aria-hidden={away || undefined}
      aria-label={`${player.name}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}${player.offline ? ', offline' : ''}`}
      onClick={() => {
        if (!host || self) return;
        // Once the hand is done, tapping a bot's face-down cards turns them over.
        if (canPeek) dispatch({ type: 'revealBots', hand: hand!.number, playerId: player.id });
        else openSheet({ name: 'player', playerId: player.id });
      }}
    >
      <span className="pod-pic">
        {turn && <span className="pod-ring" aria-hidden />}
        <Avatar emoji={player.emoji} size={50} />
        <PositionChips pos={positionOf(hand, player.id)} />
        {reaction ? (
          <ReactBubble id={reaction} game={game} />
        ) : thinking ? (
          <span className="bubble bubble-grey bubble-typing pop" aria-label={`${player.name} is thinking`}>
            <i />
            <i />
            <i />
          </span>
        ) : (
          seat?.last && quiet !== moveSig(hand!.number, seat.last) && <Bubble last={seat.last} street={hand?.street} />
        )}
      </span>
      <span className="pod-name">{player.name}</span>
      <span className="pod-stack num">{status ?? <Count value={player.stack} />}</span>
      <span className="pod-under">
        {!self && seat && (!seat.folded || seat.cards.length > 0) && (
          <span className="pod-cards">
            {seat.cards.length
              ? seat.cards.map((c) => <PlayingCard key={c} card={c} size="sm" dim={dimCard(c)} glow={glowCard(c)} flip />)
              : [0, 1].map((i) => <PlayingCard key={i} back size="sm" />)}
          </span>
        )}
        {won > 0 ? (
          <span className="pod-tag win">+{chips(won)}</span>
        ) : odds ? (
          <span className="pod-tag odds">{pct(odds.win)}</span>
        ) : player.offline ? (
          <span className="pod-tag offline">Offline</span>
        ) : null}
      </span>
    </button>
  );
}

export function MyBox({
  game,
  me,
  seat,
  odds,
  reaction,
  quiet,
}: {
  game: Game;
  me?: Player;
  seat?: Seat;
  odds?: { win: number; tie: number };
  reaction?: string;
  quiet?: string;
}) {
  const hand = game.hand;
  const desktop = useDesktop();
  const [inBB, setInBB] = useState(loadBigBlinds);
  // On a computer my seat is on the table (bottom), so the bubble and position are shown there.
  const bubble = desktop ? null : reaction ? (
    <ReactBubble id={reaction} game={game} />
  ) : seat?.last && quiet !== moveSig(hand!.number, seat.last) ? (
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
  const bb = Math.max(game.settings.bigBlind, 1);
  return (
    <div className="my-box">
      {bubble}
      {me && (
        <span className="my-name">
          <Avatar emoji={me.emoji} size={22} />
          <small>{me.name}</small>
        </span>
      )}
      <button
        type="button"
        className="my-stack press"
        aria-label={`${inBB ? 'Stack in big blinds' : 'Stack in chips'}, tap to switch`}
        onClick={() => {
          saveBigBlinds(!inBB);
          setInBB(!inBB);
        }}
      >
        {!me ? '–' : me.stack === 0 && (!hand || hand.result) ? 'Out' : inBB ? <>{bigBlinds(me.stack / bb)}<small> BB</small></> : <Count value={me.stack} />}
      </button>
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
