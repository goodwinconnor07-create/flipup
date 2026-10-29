import { useRef, useState } from 'react';
import { lastStanding, options, pot, type Game, type Hand, type Player, type Seat } from '../../game';
import { campaignRebuy, closeTable, dispatch, useApp } from '../../state/store';
import { cashBuyIn, stakeById } from '../../game';
import { useCampaign } from '../../state/campaign';
import { toTableTime } from '../../state/clock';
import { chips, useNow } from '../../ui/components';
import { CloseIcon, MinusIcon, PlusIcon } from '../../ui/Icons';

/** Set before your turn. `current` only plays while the bet is still the `bet` it was set against. */
export type PreAction = { kind: 'checkfold' | 'callany' | 'current'; bet: number } | null;

export function ActionArea({
  game,
  me,
  seat,
  myTurn,
  sending,
  pre,
  setPre,
}: {
  game: Game;
  me?: Player;
  seat?: Seat;
  myTurn: boolean;
  sending: boolean;
  pre: PreAction;
  setPre: (p: PreAction) => void;
}) {
  const hand = game.hand;
  const deviceId = useApp((s) => s.deviceId);
  const host = game.hostDeviceId === deviceId;
  // Only the between-hands countdowns need a clock, and it lives here so the rest of the table isn't redrawn with it.
  const waiting = game.nextHandAt !== null && (!hand || !!hand.result);
  const now = toTableTime(useNow(waiting ? 200 : 60_000), game.fast);

  if (!me) return <p className="table-note">You're watching this table.</p>;

  if (hand && !hand.result) {
    if (myTurn && seat) return <MyTurn game={game} hand={hand} seat={seat} sending={sending} />;
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
            {o.canFold && preBtn('checkfold', 'Check / Fold')}
            {o.canCheck
              ? preBtn('current', 'Check', 'Check, unless someone bets')
              : preBtn('current', `Call ${chips(o.toCall)}`, `Call ${chips(o.toCall)}, unless someone raises`)}
            {preBtn('callany', 'Call any')}
          </div>
        )}
      </div>
    );
  }

  // A campaign cash table: buying back in comes out of the bankroll.
  if (me.stack === 0 && game.campaign?.kind === 'cash') return <CampaignRebuy game={game} />;

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
    // Heads-up opens with the VS screen and a hello, so there's no countdown.
    if (game.players.length === 2) return <div className="stack" />;
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
    </div>
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

function MyTurn({ game, hand, seat, sending }: { game: Game; hand: Hand; seat: Seat; sending: boolean }) {
  const o = options(game, hand, seat);
  const [raising, setRaising] = useState(false);
  const act = (move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number) => {
    setRaising(false);
    dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move, ...(to !== undefined ? { to } : {}) });
  };
  // While the sizer is open the real row stays in place, unseen, so the table doesn't change size under it.
  return (
    <div className="stack">
      {raising && (
        <RaisePanel
          game={game}
          hand={hand}
          seat={seat}
          onCancel={() => setRaising(false)}
          onFold={() => act('fold')}
          onCall={() => act(o.canCheck ? 'check' : 'call')}
          onRaise={(to) => act(to >= o.maxTo ? 'allin' : o.word === 'Bet' ? 'bet' : 'raise', to)}
        />
      )}
      <p className={`table-note your-turn${raising ? ' raise-hidden' : ''}`} aria-hidden={raising || undefined}>
        Your turn
      </p>
      <div className={`action-buttons${raising ? ' raise-hidden' : ''}`} aria-hidden={raising || undefined}>
        {o.canFold && (
          <button type="button" className="btn btn-fold" disabled={sending} onClick={() => act('fold')}>
            Fold
          </button>
        )}
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
  onFold,
  onCall,
  onRaise,
}: {
  game: Game;
  hand: Hand;
  seat: Seat;
  onCancel: () => void;
  onFold: () => void;
  onCall: () => void;
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
  // Two sizes that come to the same amount (a small pot next to the minimum) show once.
  const presets = [
    { label: 'Min', to: o.minTo },
    { label: '½ pot', to: clamp(potRaise(0.5)) },
    { label: '¾ pot', to: clamp(potRaise(0.75)) },
    { label: 'Pot', to: clamp(potRaise(1)) },
    { label: 'All in', to: o.maxTo },
  ].filter((p, i, all) => all.findIndex((q) => q.to === p.to) === i);
  const step = Math.max(1, Math.min(bb, Math.floor((o.maxTo - o.minTo) / 50) || 1));

  const nudge = (dir: 1 | -1) => setTo((t) => clamp(t + dir * step));

  // A panel pinned to the bottom of the screen, over your cards, so every option is in view without scrolling.
  return (
    <div className="raise-layer">
      <div className="raise-scrim" onClick={onCancel} />
      <div className="raise-panel" role="dialog" aria-label={`${o.word} amount`}>
        <div className="raise-head">
          <span className="muted">{o.word} to</span>
          <b className="raise-amount num">{chips(to)}</b>
          <span className="muted raise-of">of {chips(o.maxTo)}</span>
          <button type="button" className="icon-btn press raise-close" aria-label="Back" onClick={onCancel}>
            <CloseIcon />
          </button>
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
        {/* The same three slots as the action row, so Fold and Call stay in reach while you size. */}
        <div className="action-buttons raise-actions">
          <button type="button" className="btn btn-fold" onClick={onFold}>
            Fold
          </button>
          <button type="button" className="btn btn-green" onClick={onCall}>
            {o.canCheck ? 'Check' : o.callIsAllIn ? 'All in' : 'Call'}
            {!o.canCheck && !o.callIsAllIn && <span className="num">{chips(o.toCall)}</span>}
          </button>
          <button type="button" className="btn btn-blue" onClick={() => onRaise(to)}>
            {to >= o.maxTo ? 'All in' : o.word}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Out of chips at a campaign cash table: buy back in from the bankroll, or go. */
function CampaignRebuy({ game }: { game: Game }) {
  const c = useCampaign();
  const stake = stakeById(game.campaign?.venue);
  // Online the table hands out its fixed stack; on this phone you buy as much as you can, up to 100 big blinds.
  const amount = !stake ? 0 : game.code ? (c.chips >= game.settings.startingStack ? game.settings.startingStack : 0) : cashBuyIn(c, stake);
  return (
    <div className="stack">
      {amount > 0 ? (
        <button type="button" className="btn btn-green" onClick={campaignRebuy}>
          Buy in again with {chips(amount)}
        </button>
      ) : (
        <p className="table-note">You're out of chips, and your bankroll can't cover another buy-in here.</p>
      )}
      <button type="button" className="btn btn-ghost" onClick={closeTable}>
        Leave the table
      </button>
    </div>
  );
}
