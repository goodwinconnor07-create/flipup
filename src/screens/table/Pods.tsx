import { useRef, useState } from 'react';
import { pot, positionOf, seatFor, variantOf, type Card, type Game, type Player, type Seat, type Talk } from '../../game';
import { dispatch, openSheet, useApp } from '../../state/store';
import { Avatar, chips, Count, PlayingCard, PositionChips } from '../../ui/components';
import { useDesktop } from '../../ui/useDesktop';
import { loadBigBlinds, saveBigBlinds } from '../../state/persist';
import { Bubble, moveSig, ReactMenu, Thread } from './Bubbles';

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
  talking: Record<string, unknown> = {},
): { slots: Map<string, { slot: number; away: boolean }>; n: number; hidden: number; canShow: (id: string) => boolean } {
  const start = useRef(0);
  const slots = new Map<string, { slot: number; away: boolean }>();
  if (!windowed || others.length <= MAX_PODS) {
    others.forEach((p, i) => slots.set(p.id, { slot: i, away: false }));
    return { slots, n: others.length, hidden: 0, canShow: () => true };
  }
  const hand = game.hand;
  // Who's still worth looking at: anyone who hasn't folded (everyone, between hands) or is saying something.
  const liveFor = (speaking: ReadonlySet<string>) =>
    others.filter((p) => {
      if (!hand) return true;
      const seat = seatFor(hand, p.id);
      return !!seat && (!seat.folded || speaking.has(p.id));
    });
  // The player to keep in view: whoever's turn it is, or the winner once the hand is over.
  const focus = hand?.result ? Object.entries(hand.result.won).sort((a, b) => b[1] - a[1])[0]?.[0] : hand?.toAct;
  // Where the row starts, given who is talking: it moves only to keep the focus in view, or to bring a speaker in
  // when the focus can stay in view too.
  const plan = (speaking: ReadonlySet<string>) => {
    const live = liveFor(speaking);
    const n = Math.min(MAX_PODS, live.length);
    let s = Math.max(0, Math.min(start.current, live.length - n));
    const at = live.findIndex((p) => p.id === focus);
    if (at >= 0) {
      if (at < s) s = at;
      else if (at > s + n - 1) s = at - n + 1;
    }
    const speaker = live.findIndex((p, i) => speaking.has(p.id) && (i < s || i > s + n - 1));
    if (speaker >= 0) {
      const to = speaker < s ? speaker : speaker - n + 1;
      if (at < 0 || (at >= to && at <= to + n - 1)) s = to;
    }
    return { live, n, s };
  };
  const now = new Set(Object.keys(talking));
  const { live, n, s } = plan(now);
  start.current = s;
  const visible = live.slice(s, s + n);
  const first = visible.length ? others.findIndex((p) => p.id === visible[0].id) : others.length;
  others.forEach((p, i) => {
    const k = visible.findIndex((v) => v.id === p.id);
    if (k >= 0) slots.set(p.id, { slot: k, away: false });
    // Out of view: to the left if they come before the ones showing, otherwise to the right.
    else slots.set(p.id, { slot: i < first ? -1 : n, away: true });
  });
  // Whether someone could be seen saying something: in the row already, or able to slide in without hiding the one in focus.
  const canShow = (id: string) => {
    const speaking = new Set([...now, id]);
    const p = plan(speaking);
    return p.live.slice(p.s, p.s + p.n).some((x) => x.id === id);
  };
  return { slots, n, hidden: others.length - n, canShow };
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

type Mood = 'win' | 'beat' | 'bust' | 'out' | 'sweat' | 'shove' | 'fold' | null;

/**
 * How a player's emoji reacts to the hand, from public moves only: a bounce when they win, a shake when an all-in
 * loses at showdown, a droop when they're knocked out, a pop when they shove, a sink when they fold, and a sweat
 * drop while they think over a big bet.
 */
export function moodOf(game: Game, player: Player, seat: Seat | undefined): Mood {
  const hand = game.hand;
  if (!hand) return null;
  if (player.stack === 0 && !seat) return 'out';
  if (!seat) return null;
  if (hand.result) {
    const won = hand.result.won[player.id] ?? 0;
    if (won > 0) return 'win';
    if (player.stack === 0) return 'bust';
    if (seat.allIn && !seat.folded && hand.result.showdown) return 'beat';
    return seat.folded ? 'fold' : null;
  }
  if (hand.toAct === player.id && !hand.runout) {
    // A big bet to face (half the pot or 40% of their stack, and at least three big blinds), or an all-in.
    const toCall = hand.currentBet - seat.bet;
    const shove = hand.seats.some((x) => x.allIn && !x.folded && x.playerId !== player.id && x.bet > 0 && x.bet >= hand.currentBet);
    const big = toCall >= game.settings.bigBlind * 3 && (toCall >= pot(hand) * 0.5 || toCall >= player.stack * 0.4);
    if (toCall > 0 && (big || shove)) return 'sweat';
  }
  if (seat.last?.move === 'allin' && seat.last.street === hand.street) return 'shove';
  if (seat.folded) return 'fold';
  return null;
}

/** A seat's emoji, reacting. Keyed on the hand and the mood, so each new reaction plays from the start. */
export function MoodFace({ game, player, seat, size }: { game: Game; player: Player; seat: Seat | undefined; size: number }) {
  const mood = moodOf(game, player, seat);
  return (
    <span key={`${game.hand?.number ?? 0}:${mood}`} className={`mood${mood ? ` mood-${mood}` : ''}`}>
      <Avatar emoji={player.emoji} size={size} />
      {mood === 'sweat' && (
        <span className="sweat" aria-hidden>
          💧
        </span>
      )}
    </span>
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
  reaction?: Talk;
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
      aria-label={`${player.name}${player.ai ? ', an AI twin' : ''}${player.legend ? ', a legend' : ''}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}${player.offline ? ', offline' : ''}`}
      onClick={() => {
        if (!host || self) return;
        // Once the hand is done, tapping a bot's face-down cards turns them over.
        if (canPeek) dispatch({ type: 'revealBots', hand: hand!.number, playerId: player.id });
        else openSheet({ name: 'player', playerId: player.id });
      }}
    >
      <span className="pod-pic">
        <MoodFace game={game} player={player} seat={seat} size={50} />
        {player.ai && <span className="ai-chip" aria-hidden>AI</span>}
        {player.legend && <span className="ai-chip legend-chip" aria-hidden>★</span>}
        <PositionChips pos={positionOf(hand, player.id)} />
        {reaction ? (
          <Thread talk={reaction} />
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
          <span className={`pod-cards${turn ? ' shimmer' : ''}`}>
            {seat.cards.length
              ? seat.cards.map((c) => <PlayingCard key={c} card={c} size="sm" dim={dimCard(c)} glow={glowCard(c)} flip />)
              : Array.from({ length: variantOf(game) === 'pineapple' && threeCardsLeft(game) ? 3 : 2 }, (_, i) => <PlayingCard key={i} back size="sm" />)}
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
  reaction?: Talk;
  quiet?: string;
}) {
  const hand = game.hand;
  const desktop = useDesktop();
  const [inBB, setInBB] = useState(loadBigBlinds);
  // On a computer my seat is on the table (bottom), so the bubble and position are shown there.
  const bubble = desktop ? null : reaction ? (
    <Thread talk={reaction} />
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

/** Crazy Pineapple: everyone still holds three cards (before the flop, and during the flop betting; bots throw theirs away as soon as it ends). */
const threeCardsLeft = (game: Game) => {
  const hand = game.hand;
  return !!hand && (hand.board.length < 3 || (hand.board.length === 3 && !hand.discarding && hand.nextStreetAt == null && !hand.result));
};
