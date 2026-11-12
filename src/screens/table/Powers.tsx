// Power Cards at the table: your power for this hand (and the Play button on your turn), the choice a power needs,
// and the banner everyone sees when someone plays one.

import { useEffect, useState, type ReactNode } from 'react';
import { cardName, effectOf, options, powerInfo, powerLine, powerTargets, rankName, type Game, type Player, type PowerId, type Seat } from '../../game';
import { dispatch } from '../../state/store';
import { Avatar, CardText, PlayingCard, chips } from '../../ui/components';
import { haptic } from '../../ui/effects';

const RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const rankChar = (r: number) => (r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : r === 10 ? '10' : String(r));

/** Your power this hand: what it does, what it showed you once played, and the Play button when it's your turn. */
export function PowerStrip({ game, me, seat, myTurn, sending }: { game: Game; me: Player | null | undefined; seat: Seat | undefined; myTurn: boolean; sending: boolean }) {
  const hand = game.hand;
  const [choosing, setChoosing] = useState(false);
  const key = hand ? `${hand.number}-${hand.seq}` : '';
  useEffect(() => setChoosing(false), [key]);
  if (!hand || hand.variant !== 'power' || !me || !seat) return null;
  const mine = hand.powers?.[me.id];
  if (!mine) return null;
  const use = hand.powerUses?.find((u) => u.by === me.id);
  const can = myTurn && !use ? options(game, hand, seat).power ?? null : null;
  const silenced = hand.silenced?.[me.id] === hand.street && !hand.result && !seat.folded;
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? 'Someone';

  if (choosing && can) return <PowerChoice game={game} seat={seat} effect={can.effect} onCancel={() => setChoosing(false)} />;

  const shown = use ? effectOf(use) : mine;
  const info = powerInfo(shown);
  let note: ReactNode = info.short;
  if (use) {
    if (effectOf(use) === 'peek' && use.seen?.[0]) note = <CardText text={`Next card: [${use.seen[0]}]`} />;
    else if (effectOf(use) === 'xray' && use.seen?.[0] && use.target) note = <CardText text={`${name(use.target)} has [${use.seen[0]}]`} />;
    else if (effectOf(use) === 'bounty' && use.rank) note = use.paid ? `Bounty paid: +${chips(Object.values(use.paid).reduce((a, b) => a + b, 0))}` : `Bounty on ${rankName(use.rank, true)}`;
    else if (effectOf(use) === 'shield') note = use.refund ? `Shield gave back ${chips(use.refund)}` : 'Shield up';
    else note = 'Played';
  } else if (mine === 'copycat') {
    const last = [...(hand.powerUses ?? [])].reverse().find((u) => u.by !== me.id);
    note = last ? `Copies ${powerInfo(effectOf(last)).name}: ${powerInfo(effectOf(last)).short.charAt(0).toLowerCase()}${powerInfo(effectOf(last)).short.slice(1)}` : 'Copies the last power someone else plays. Nobody has yet.';
  }
  return (
    <div className={`power-strip${use ? ' used' : ''}${can ? ' ready' : ''}`} aria-label={`Your power: ${powerInfo(mine).name}`}>
      <span className="power-emoji" aria-hidden>
        {info.emoji}
      </span>
      <span className="power-text">
        <b>
          {powerInfo(mine).name}
          {mine === 'copycat' && use ? ` · ${info.name}` : ''}
        </b>
        <small>{note}</small>
        {silenced && <small className="power-silenced">🤐 Silenced: no betting or raising this street</small>}
      </span>
      {can && (
        <button
          type="button"
          className="power-play press"
          disabled={sending}
          onClick={() => {
            haptic('light');
            if (powerInfo(can.effect).needs) setChoosing(true);
            else dispatch({ type: 'power', hand: hand.number, seq: hand.seq });
          }}
        >
          Play
        </button>
      )}
    </div>
  );
}

/** The choice a power needs: who to aim it at, which card, or which rank. */
function PowerChoice({ game, seat, effect, onCancel }: { game: Game; seat: Seat; effect: PowerId; onCancel: () => void }) {
  const hand = game.hand!;
  const info = powerInfo(effect);
  const play = (more: { target?: string; card?: string; rank?: number }) => dispatch({ type: 'power', hand: hand.number, seq: hand.seq, ...more });
  let title = '';
  let body: ReactNode = null;
  if (info.needs === 'player') {
    title = effect === 'xray' ? 'Whose card do you want to see?' : 'Who do you want to silence?';
    const people = powerTargets(hand, seat, effect)
      .map((s) => game.players.find((p) => p.id === s.playerId))
      .filter((p): p is Player => !!p);
    body = (
      <div className="vote-grid">
        {people.map((p) => (
          <button key={p.id} type="button" className="vote-btn press" onClick={() => play({ target: p.id })}>
            <Avatar emoji={p.emoji} size={36} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    );
  } else if (info.needs === 'ownCard' || info.needs === 'boardCard') {
    title = info.needs === 'ownCard' ? 'Tap the card to swap' : 'Tap the board card to reroll';
    const cards = info.needs === 'ownCard' ? seat.cards : hand.board;
    body = (
      <div className="discard-cards">
        {cards.map((c) => (
          <button key={c} type="button" className="discard-card press" aria-label={`${info.name} the ${cardName(c)}`} onClick={() => play({ card: c })}>
            <PlayingCard card={c} size={cards.length > 3 ? 'md' : 'lg'} />
          </button>
        ))}
      </div>
    );
  } else if (info.needs === 'rank') {
    title = 'Call a rank for your bounty';
    body = (
      <div className="power-ranks">
        {RANKS.map((r) => (
          <button key={r} type="button" className="power-rank press" aria-label={rankName(r, true)} onClick={() => play({ rank: r })}>
            {rankChar(r)}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="power-choice discard">
      <p className="discard-title">
        {info.emoji} {title}
      </p>
      {body}
      <button type="button" className="btn-link-small" onClick={onCancel}>
        Not now
      </button>
    </div>
  );
}

/** A banner across the felt for a moment whenever anyone plays a power, so the whole table sees it. */
export function PowerToast({ game }: { game: Game }) {
  const hand = game.hand;
  const uses = hand?.variant === 'power' ? (hand.powerUses ?? []) : [];
  const last = uses[uses.length - 1];
  const key = last && hand ? `${hand.number}-${uses.length}` : '';
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!key) return;
    setShown(key);
    const t = setTimeout(() => setShown(''), 2600);
    return () => clearTimeout(t);
  }, [key]);
  if (!last || shown !== key) return null;
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? 'Someone';
  return (
    <p className="power-toast pop" role="status" key={key}>
      <CardText text={powerLine(last, name)} />
    </p>
  );
}
