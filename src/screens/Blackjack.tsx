import { useEffect, useRef, useState } from 'react';
import { BJ, canMove, DEALER, handValue, rouletteLimit, totalLabel, type BjHand, type BjResult, type BjSeat, type BjTalk, type Blackjack as Table } from '../game';
import { bjAct, leaveBlackjack, mySeat, onBjError, openBlackjack, useBj } from '../state/blackjack';
import { useCampaign } from '../state/campaign';
import { back, confirm, openSheet, toast } from '../state/store';
import { Avatar, BackBar, PlayingCard, useNow } from '../ui/components';
import { confetti, haptic } from '../ui/effects';
import { UsersIcon } from '../ui/Icons';
import { playSound } from '../ui/sound';
import { short } from './HomeCampaign';
import { chipChoices } from './Roulette';

/** How long a line stays up over the person who said it. */
const TALK_MS = 4200;

const RESULT: Record<BjResult, string> = { blackjack: 'Blackjack!', win: 'Win', push: 'Push', lose: 'Lose', bust: 'Bust' };

/** The campaign's blackjack table: Vincent deals, you and one or two bots (and any friends you invite) play. */
export function Blackjack() {
  const game = useBj((s) => s.game);
  const mode = useBj((s) => s.mode);
  const conn = useBj((s) => s.conn);
  useEffect(() => {
    openBlackjack();
    onBjError((e) => toast(e, 'error'));
  }, []);

  const leave = () => {
    if (mode !== 'online') return back();
    const me = mySeat(game);
    const inPlay = !!me && me.hands.length > 0 && game?.phase !== 'done';
    confirm({
      title: 'Leave the table?',
      body: inPlay ? 'Your hand is still in play. Leave now and your bet stays on the felt.' : 'Your friends can carry on without you.',
      confirm: 'Leave',
      danger: inPlay,
      onConfirm: () => {
        leaveBlackjack();
        back();
      },
    });
  };

  return (
    <div className="screen bj-screen">
      <BackBar
        title="Blackjack"
        onBack={leave}
        right={
          <>
            <button type="button" className="icon-btn press" aria-label="Invite friends" onClick={() => openSheet({ name: 'bjInvite' })}>
              <UsersIcon />
            </button>
            <Bank />
          </>
        }
      />
      {mode === 'online' && conn !== 'open' && <p className="bj-conn">{conn === 'offline' ? 'Offline. Reconnecting…' : 'Connecting…'}</p>}
      {game ? <TableView game={game} /> : <div className="bj-felt bj-loading" aria-busy />}
    </div>
  );
}

/** The bankroll, less what's on the felt. */
function Bank() {
  const c = useCampaign();
  return <span className="rl-bank num">{short(c.chips)}</span>;
}

function TableView({ game }: { game: Table }) {
  const now = useNow(200);
  const me = mySeat(game);
  const others = game.seats.filter((s) => s !== me);
  useTableSounds(game, me);
  const dealer = game.dealer;
  const showTotal = dealer.cards.length > 0 && !dealer.hole;
  // The order the first cards came out: everyone's first card, the dealer's, then everyone's second.
  const dealt = game.seats.filter((s) => s.hands.length > 0);
  const delayOf = (seatIdx: number, cardIdx: number) => Math.max(0, game.dealtAt + (cardIdx * (dealt.length + 1) + seatIdx) * BJ.dealMs - now);
  const dealerDelay = (i: number) => (i < 2 ? Math.max(0, game.dealtAt + (i * (dealt.length + 1) + dealt.length) * BJ.dealMs - now) : 0);

  return (
    <>
      <div className="bj-felt">
        <section className="bj-dealer" aria-label="Dealer">
          <div className="bj-dealer-who">
            <span className="bj-dealer-face" aria-hidden>
              {DEALER.emoji}
            </span>
            <span className="bj-plate">{DEALER.name}</span>
            <Said talk={game.talk} who="dealer" now={now} className="bj-say-dealer" />
          </div>
          <div className="bj-cards bj-dealer-cards">
            {dealer.cards.map((c, i) => (
              <PlayingCard key={`${game.round}-d${i}`} card={c} size="md" flip delay={dealerDelay(i)} />
            ))}
            {dealer.hole && <PlayingCard key={`${game.round}-hole`} back size="md" className="bj-hole" />}
            {showTotal && <span className={`bj-total${handValue(dealer.cards).total > 21 ? ' bust' : ''}`}>{totalLabel({ cards: dealer.cards })}</span>}
          </div>
          <Shoe left={game.shoeLeft} />
        </section>

        <p className="bj-print" aria-hidden>
          <b>Blackjack pays 3 to 2</b>
          <span>Dealer stands on all 17s</span>
        </p>

        {others.length > 0 && (
          <div className="bj-others" role="list" aria-label="Players">
            {others.map((s) => (
              <OtherSeat key={s.id} seat={s} game={game} now={now} delay={(j) => delayOf(dealt.indexOf(s), j)} />
            ))}
          </div>
        )}

        {me && <MySpot me={me} game={game} now={now} delay={(j) => delayOf(dealt.indexOf(me), j)} />}
      </div>
      {me && <Bar me={me} game={game} now={now} />}
    </>
  );
}

/** The newest thing this person said, while it's fresh. */
function Said({ talk, who, now, className = '' }: { talk: BjTalk[]; who: string; now: number; className?: string }) {
  const line = [...talk].reverse().find((t) => t.who === who && t.at <= now && now < t.at + TALK_MS);
  if (!line) return null;
  return (
    <span key={line.key} className={`bj-say pop ${className}`} role="status">
      {line.text}
    </span>
  );
}

/** The shoe beside the dealer, emptying as the cards go. */
function Shoe({ left }: { left: number }) {
  const full = BJ.decks * 52;
  return (
    <span className="bj-shoe" aria-label={`${left} cards left in the shoe`}>
      <i style={{ height: `${Math.max(8, (left / full) * 100)}%` }} />
    </span>
  );
}

function OtherSeat({ seat, game, now, delay }: { seat: BjSeat; game: Table; now: number; delay: (card: number) => number }) {
  const onClock = game.turn?.seat === seat.id;
  return (
    <div className={`bj-seat${onClock ? ' on' : ''}${seat.hands.length === 0 && game.phase !== 'betting' ? ' out' : ''}`} role="listitem" aria-label={seat.name}>
      <div className="bj-seat-who">
        <Avatar emoji={seat.emoji} size={36} />
        <Said talk={game.talk} who={seat.id} now={now} className="bj-say-seat" />
      </div>
      <span className="bj-seat-name">
        {seat.name}
        {seat.bot && <i className="bj-bot">BOT</i>}
        {seat.offline && <i className="bj-off">Offline</i>}
      </span>
      <div className="bj-seat-hands">
        {seat.hands.map((h, i) => (
          <div key={i} className={`bj-mini${onClock && game.turn?.hand === i ? ' on' : ''}`}>
            <div className="bj-cards">
              {h.cards.map((c, j) => (
                <PlayingCard key={`${game.round}-${i}-${j}`} card={c} size="sm" flip delay={i === 0 && j < 2 ? delay(j) : 0} />
              ))}
            </div>
            <HandTag hand={h} />
          </div>
        ))}
        {seat.hands.length === 0 && <span className="bj-seat-bet">{game.phase === 'betting' ? (seat.ready ? `Bet ${short(seat.bet)}` : seat.bot ? '' : 'Betting…') : 'Sitting out'}</span>}
      </div>
    </div>
  );
}

/** A hand's total while it plays, and its result once the round is paid. */
function HandTag({ hand, big = false }: { hand: BjHand; big?: boolean }) {
  if (hand.result) {
    const net = (hand.back ?? 0) - hand.bet;
    return (
      <span className={`bj-tag res-${hand.result}${big ? ' big' : ''}`}>
        {RESULT[hand.result]}
        {big && net !== 0 && <b>{net > 0 ? `+${short(net)}` : `−${short(-net)}`}</b>}
      </span>
    );
  }
  return <span className={`bj-tag${isBustCards(hand) ? ' res-bust' : ''}${big ? ' big' : ''}`}>{totalLabel(hand)}</span>;
}

const isBustCards = (h: BjHand) => handValue(h.cards).total > 21;

function MySpot({ me, game, now, delay }: { me: BjSeat; game: Table; now: number; delay: (card: number) => number }) {
  const onClock = game.turn?.seat === me.id;
  return (
    <section className={`bj-me${onClock ? ' on' : ''}`} aria-label="Your hand">
      <Said talk={game.talk} who={me.id} now={now} className="bj-say-seat" />
      {me.hands.length > 0 ? (
        <div className="bj-my-hands">
          {me.hands.map((h, i) => (
            <div key={i} className={`bj-hand${onClock && game.turn?.hand === i ? ' on' : ''}${me.hands.length > 1 ? ' two' : ''}`}>
              <div className="bj-cards bj-fan">
                {h.cards.map((c, j) => (
                  <PlayingCard key={`${game.round}-${i}-${j}`} card={c} size={me.hands.length > 1 ? 'md' : 'lg'} flip delay={i === 0 && j < 2 ? delay(j) : 0} glow={h.result === 'blackjack'} />
                ))}
              </div>
              <HandTag hand={h} big />
              <Stack amount={h.bet} doubled={h.doubled} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bj-spot">
          <span className="bj-circle">{game.phase === 'betting' ? 'Place your bet' : 'Sitting out this round'}</span>
        </div>
      )}
    </section>
  );
}

/** The chips on a hand's spot. */
function Stack({ amount, doubled }: { amount: number; doubled?: boolean }) {
  return (
    <span className={`bj-stack${doubled ? ' doubled' : ''}`}>
      <i className="bj-chip" aria-hidden />
      {doubled && <i className="bj-chip" aria-hidden />}
      <b>{short(amount)}</b>
    </span>
  );
}

/** The bottom bar: chips to bet with and the deal button, then your moves when it's your turn. */
function Bar({ me, game, now }: { me: BjSeat; game: Table; now: number }) {
  const c = useCampaign();
  const limit = Math.min(c.chips, rouletteLimit(c));
  const choices = chipChoices(c.chips);
  const [bet, setBet] = useState(() => Math.min(me.bet || choices.find((v) => v >= c.chips / 40) || BJ.minBet, Math.max(BJ.minBet, limit)));
  const shown = Math.min(bet, limit);

  if (game.phase === 'betting') {
    if (me.ready) {
      const waiting = game.seats.filter((s) => !s.bot && !s.ready && !s.offline).map((s) => s.name);
      const secs = game.wakeAt ? Math.max(0, Math.ceil((game.wakeAt - now) / 1000)) : 0;
      return (
        <div className="rl-bar bj-bar glass">
          <p className="bj-status">
            Bet {short(me.bet)} · {waiting.length ? `Waiting for ${waiting.join(', ')}${secs ? ` · ${secs}s` : ''}` : 'Dealing…'}
          </p>
          <button type="button" className="rl-small press" onClick={() => bjAct({ type: 'bet', amount: 0 })}>
            Change bet
          </button>
        </div>
      );
    }
    const add = (v: number) => {
      const next = shown + v;
      if (next > limit) {
        toast(c.chips < next ? 'Not enough chips left.' : `That’s the table limit: ${short(rouletteLimit(c))} a hand.`, 'error');
        haptic('error');
        return;
      }
      setBet(next);
      haptic('light');
      playSound('chip');
    };
    const deal = () => {
      if (shown < BJ.minBet) return toast(c.chips < BJ.minBet ? 'You’re out of chips until tomorrow’s salary.' : `Bets start at ${BJ.minBet}.`, 'error');
      const error = bjAct({ type: 'bet', amount: shown });
      if (error) toast(error, 'error');
      else {
        haptic('medium');
        playSound('chips');
      }
    };
    return (
      <div className="rl-bar bj-bar glass">
        <div className="rl-chips" role="group" aria-label="Add chips">
          {choices.map((v, i) => (
            <button key={v} type="button" className={`rl-pick tone-${i} press`} aria-label={`Add ${v}`} onClick={() => add(v)}>
              {short(v)}
            </button>
          ))}
        </div>
        <div className="rl-actions">
          <button type="button" className="rl-small press" onClick={() => setBet(0)} disabled={shown === 0}>
            Clear
          </button>
          <button type="button" className="rl-small press" onClick={() => setBet(Math.min(limit, Math.max(BJ.minBet, shown * 2)))} disabled={shown === 0 || shown * 2 > limit}>
            ×2
          </button>
          <button type="button" className="rl-spin press" onClick={deal} disabled={shown < BJ.minBet}>
            {game.online ? 'Bet' : 'Deal'} · {short(shown)}
          </button>
        </div>
      </div>
    );
  }

  const mine = game.turn?.seat === me.id;
  if (game.phase === 'playing' && mine) {
    const hand = me.hands[game.turn!.hand];
    const can = canMove(game);
    const afford = c.chips >= hand.bet;
    const go = (type: 'hit' | 'stand' | 'double' | 'split') => {
      const error = bjAct({ type });
      if (error) toast(error, 'error');
      else haptic(type === 'stand' ? 'light' : 'medium');
    };
    const secs = game.turnEndsAt ? Math.max(0, Math.ceil((game.turnEndsAt - now) / 1000)) : 0;
    return (
      <div className="rl-bar bj-bar glass">
        <p className="bj-status">
          {me.hands.length > 1 ? `Hand ${game.turn!.hand + 1} · ` : ''}
          {totalLabel(hand)} against {DEALER.name}’s {totalLabel({ cards: game.dealer.cards.slice(0, 1) })}
          {secs ? ` · ${secs}s` : ''}
        </p>
        <div className="bj-moves">
          <button type="button" className="bj-move hit press" onClick={() => go('hit')}>
            Hit
          </button>
          <button type="button" className="bj-move stand press" onClick={() => go('stand')}>
            Stand
          </button>
          <button type="button" className="bj-move double press" onClick={() => go('double')} disabled={!can.double || !afford}>
            Double
          </button>
          <button type="button" className="bj-move split press" onClick={() => go('split')} disabled={!can.split || !afford}>
            Split
          </button>
        </div>
      </div>
    );
  }

  const who = game.seats.find((s) => s.id === game.turn?.seat);
  const mineBack = me.hands.reduce((sum, h) => sum + (h.back ?? 0), 0);
  const mineStaked = me.hands.reduce((sum, h) => sum + h.bet, 0);
  const status =
    game.phase === 'dealer'
      ? `${DEALER.name}’s turn`
      : game.phase === 'done'
        ? me.hands.length === 0
          ? 'Next round coming up'
          : mineBack > mineStaked
            ? `You won ${short(mineBack - mineStaked)}`
            : mineBack === mineStaked
              ? 'Your bet comes back'
              : `You lost ${short(mineStaked - mineBack)}`
        : who
          ? `${who.name} is thinking…`
          : '';
  return (
    <div className="rl-bar bj-bar glass">
      <p className={`bj-status big${game.phase === 'done' && mineBack > mineStaked ? ' win' : ''}`}>{status}</p>
    </div>
  );
}

/** Cards sliding out, chips going down, and a cheer for a win. */
function useTableSounds(game: Table, me: BjSeat | undefined): void {
  const seen = useRef({ cards: 0, round: game.round, phase: game.phase });
  useEffect(() => {
    const cards = game.dealer.cards.length + (game.dealer.hole ? 1 : 0) + game.seats.reduce((n, s) => n + s.hands.reduce((m, h) => m + h.cards.length, 0), 0);
    const was = seen.current;
    if (game.round !== was.round) {
      // A fresh deal: one sound per card as it lands.
      for (let i = 0; i < cards; i++) playSound('deal', i * BJ.dealMs);
    } else if (cards > was.cards) playSound(game.phase === 'dealer' ? 'flip' : 'deal');
    if (game.phase === 'done' && was.phase !== 'done' && me && me.hands.length > 0) {
      const back = me.hands.reduce((sum, h) => sum + (h.back ?? 0), 0);
      const staked = me.hands.reduce((sum, h) => sum + h.bet, 0);
      const delay = Math.max(0, game.dealtAt + (game.seats.length + 1) * 2 * BJ.dealMs - Date.now());
      setTimeout(() => {
        if (back > staked) {
          haptic('success');
          playSound(me.hands.some((h) => h.result === 'blackjack') ? 'victory' : 'win');
          if (me.hands.some((h) => h.result === 'blackjack') || back >= staked * 2) confetti(undefined, undefined, 70);
        } else if (back < staked) playSound('fold');
      }, delay);
    }
    seen.current = { cards, round: game.round, phase: game.phase };
  }, [game]);
}
