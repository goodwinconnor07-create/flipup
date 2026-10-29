import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { bestHand, venueById, boardSize, cardName, CIRCLE_HOURS, CROSS_CELLS, equity, streetCards, holeCount, myPlayer, options, pendingDiscards, pendingVoters, pot, seatFor, showsOdds, variantInfo, variantOf, type Card, type Equity, type Game, type Hand, type Player, type Seat } from '../game';
import { closeTable, dispatch, navigate, openSheet, useApp } from '../state/store';
import { FAST, toTableTime } from '../state/clock';
import { Avatar, CardSlot, CardText, chips, Count, PlayingCard, Spinner, useNow } from '../ui/components';
import { confetti, CONFETTI, haptic } from '../ui/effects';
import { MenuIcon } from '../ui/Icons';
import { playSound } from '../ui/sound';
import { useTableSounds } from '../ui/useTableSounds';
import { Final } from './Final';
import { PartyPanel } from './Party';
import { CampaignResult } from './CampaignResult';
import { PrizeReel } from './table/PrizeReel';
import { forgetParty } from '../state/party';
import { SidePanel } from './SidePanel';
import { useDesktop } from '../ui/useDesktop';
import { Lobby } from './Lobby';
import { useWakeLock } from '../ui/useWakeLock';
import { ActionArea, type PreAction } from './table/Actions';
import { useReactions } from './table/Bubbles';
import { Versus } from './table/Versus';
import { TableCam } from './table/TableCam';
import { HiddenPlayers, MyBox, othersInOrder, Pod, usePodSlots } from './table/Pods';
import { soundMoodFor } from '../ui/gameThemes';
import { setSoundMood } from '../ui/sound';
import { useThemeMoments } from '../ui/useTableSounds';

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
  // Each game pitches the table's sounds its own way, and has a few sounds of its own.
  const pitch = game ? soundMoodFor(variantOf(game)) : 1;
  useEffect(() => {
    setSoundMood(pitch);
    return () => setSoundMood(1);
  }, [pitch]);
  useThemeMoments(game);

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
    <div
      className={`screen table-screen status-${game.status}${desktop ? ' desk' : ''}`}
    >
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
      <VersusGate game={game} />
      <PrizeReel game={game} />
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
      {game.status === 'ended' &&
        (game.party ? (
          <div className="screen-body">
            <PartyPanel
              code={game.party.code}
              embedded
              onGone={() => {
                forgetParty();
                closeTable();
              }}
            />
          </div>
        ) : game.campaign ? (
          <CampaignResult game={game} />
        ) : (
          <Final game={game} />
        ))}
    </div>
  );
}

/** The VS intro, while a heads-up game waits for its first deal. */
function VersusGate({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const me = myPlayer(game, deviceId);
  if (game.status !== 'playing' || game.hand || game.nextHandAt === null || game.card || game.players.length !== 2 || !me) return null;
  const foe = game.players.find((p) => p.id !== me.id);
  if (!foe) return null;
  return <Versus key={game.id} game={game} me={me} foe={foe} />;
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

/** A campaign table says where it is, and a tournament how many are still in: "🎱 The Back Room · 4 left · ". */
function CampaignWhere({ game }: { game: Game }) {
  const tag = game.campaign;
  if (tag?.kind === 'cash') return <>🃏 Cash game · </>;
  const v = venueById(tag?.venue);
  if (!v) return null;
  const left = game.players.filter((p) => p.stack > 0).length;
  // The bounty stays out of the way: a small target by its name while that bot is still in.
  const mark = game.players.find((p) => p.id === tag?.bounty?.playerId && p.stack > 0);
  return (
    <>
      {/* Once it's going, the venue is just its emoji, so the line fits. */}
      {v.emoji} {game.status === 'playing' ? `${left} left · ` : `${v.name} · `}
      {mark && game.status === 'playing' ? `🎯 ${mark.name} · ` : ''}
    </>
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
              {game.campaign && <CampaignWhere game={game} />}
              {game.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : online ? 'Online table' : 'You vs the bots'}
              {game.status === 'playing' && !!game.settings.blindMinutes && <BlindClock game={game} />}
            </small>
          </>
        )}
      </div>
      {game?.party && (
        <button type="button" className="code-chip party-pill press" aria-label="Party standings" onClick={() => navigate({ name: 'party' })}>
          {variantInfo(game.settings.variant).emoji} {game.party.round + 1}/{game.party.total}
        </button>
      )}
      {online && game?.code && !game?.party && (
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
function useOdds(hand: Hand | null, oddsOk: boolean): Map<string, { win: number; tie: number }> | null {
  // Only plain Hold'em: the variants score hands differently.
  const live = hand?.runout && oddsOk ? hand.seats.filter((s) => !s.folded && s.cards.length === 2) : [];
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
  const variant = variantOf(game);
  const odds = useOdds(hand, showsOdds(variant));
  const themed = variant !== 'holdem';
  // Imposter: you only learn it's you; everyone else in the hand is innocent.
  const role = hand?.variant === 'imposter' && mySeat ? (hand.imposter === me?.id ? 'imposter' : 'innocent') : null;
  // Pittsburgh always has room for three rivers, the cross for nine and the circle for six; Red River grows as the
  // red cards come.
  const boardSlots = Math.max(boardSize(variant), hand?.board.length ?? 0);
  // The cross and the circle lay their cards out in a shape instead of a row.
  const shape = variant === 'crucifix' ? 'cross' : variant === 'circle' ? 'circle' : null;
  const place = (i: number): CSSProperties | undefined => {
    if (shape === 'cross') return { gridRow: CROSS_CELLS[i][0], gridColumn: CROSS_CELLS[i][1] };
    if (shape !== 'circle') return undefined;
    const a = (CIRCLE_HOURS[i] / 12) * 2 * Math.PI;
    return { '--x': Math.sin(a).toFixed(3), '--y': (-Math.cos(a)).toFixed(3) } as CSSProperties;
  };
  const desktop = useDesktop();
  const speakerOk = useRef<(id: string) => boolean>(() => true);
  const { say: reactions, quiet } = useReactions(game, speakerOk);
  // On a phone the row of four slides; on a computer everyone sits round the table.
  // Someone who folded stays in view while they're still saying something.
  const podSlots = usePodSlots(game, others, !desktop, reactions);
  speakerOk.current = podSlots.canShow;
  const myTurn = !!hand && !hand.result && !!me && hand.toAct === me.id;
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
    const base = 'FlipUp';
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

  // Pre-actions: tap Check/Fold, Call current or Call any before your turn and it plays itself when it comes round.
  // They're cleared on each new street, because the situation has changed. Call current is also cleared the
  // moment someone raises, so it never calls more than you saw.
  const [pre, setPre] = useState<PreAction>(null);
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
    // In Imposter the cards don't decide anything, so no hand is singled out.
    if (!hand || hand.board.length < 3 || hand.variant === 'imposter') return null;
    if (hand.result?.showdown) {
      const winner = hand.result.pots[0]?.winners[0];
      const seat = seatFor(hand, winner);
      if (seat?.cards.length) return bestHand(variant, seat.cards, hand.board);
    }
    if (mySeat && !mySeat.folded && mySeat.cards.length) return bestHand(variant, mySeat.cards, hand.board);
    return null;
  }, [hand?.number, hand?.board.length, hand?.result, mySeat?.folded, mySeat?.cards.length]);
  const lit = new Set(highlight?.best ?? []);
  // At showdown the winning five cards lift and glow and the rest grey out. Never while the hand is being played.
  const showdown = !!hand?.result?.showdown && !!highlight;
  const dim = (c: Card) => showdown && !lit.has(c);
  const glow = (c: Card) => showdown && lit.has(c);
  const myValue = mySeat && !mySeat.folded && mySeat.cards.length && hand?.variant !== 'imposter' ? bestHand(variant, mySeat.cards, hand?.board ?? []) : null;
  // Before the flop, "High card" says nothing; a pocket pair is worth pointing out.
  // "Pair of kings" says more than "Pair"; the longer ones ("Two pair, kings and fives") would crowd the pill.
  const short = (v: { name: string; detail?: string }) => (v.detail && v.detail.length <= 16 ? v.detail : v.name);
  const myHandName = myValue && (hand!.board.length >= 3 || myValue.category > 0) ? short(myValue) : null;
  const pillName = hand?.result?.showdown ? highlight?.name : myHandName;
  // The pot counts down to nothing as it's pushed to the winner.
  const potNow = hand && !hand.result ? pot(hand) : 0;
  // Your cards stayed hidden (you folded, won without a showdown, or mucked): you can turn them over.
  const canShow = !bare && !!hand?.result && !!mySeat && !mySeat.shown && mySeat.cards.length === 2;

  return (
    <div className={`felt${themed ? ` theme-${variant}` : ''}`}>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <div className="stage">
        {(others.length > 0 || desktop) && (
          // On a phone everyone else sits in 3D; where that can't be drawn, the row of seats.
          <TableCam
            game={game}
            others={others}
            meId={me?.id}
            say={reactions}
            quiet={quiet}
            odds={odds ?? undefined}
            fallback={
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
            }
          />
        )}

        {/* Each game has its own table; plain Hold'em uses the player's own felt and rail. */}
        <div className={`table-oval${themed ? ` themed theme-${variant}` : ` rail-${look.rail}`}`} style={themed ? undefined : { ['--felt' as string]: look.felt }}>
          <TableTimer game={game} mine={myTurn} />
          <TurnTicks game={game} myTurn={myTurn} />
          <div className="table-felt" data-motif={themed ? variantInfo(variant).emoji : undefined}>
            <div className="table-top">
              {variant !== 'holdem' && (
                // In an Imposter hand the badge tells you your role instead of the game's name.
                <button
                  type="button"
                  className={`variant-pill press${role === 'imposter' ? ' imposter' : ''}`}
                  onClick={() => openSheet({ name: 'rules', variant })}
                  aria-label={`${variantInfo(variant).name}: how it plays`}
                >
                  {role === 'imposter' ? '🕵️ Imposter: you' : role === 'innocent' ? '😇 Innocent' : `${variantInfo(variant).emoji} ${variantInfo(variant).name}`}
                </button>
              )}
              {hand && (
                <span className="pot-pill" aria-label={`Pot ${chips(pot(hand))}`}>
                  <i className="pot-chip" aria-hidden />
                  <small>Pot</small> <Count value={potNow} />
                </span>
              )}
            </div>
            {me?.cardPack && (
              // The deck in your own card pack, so you see it all hand long, not just as a card turns over.
              <span className="felt-deck" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <PlayingCard key={i} back size="sm" pack={me.cardPack} />
                ))}
              </span>
            )}
            <Ghost game={game} />
            {hand?.dice && (
              <p className="dice-note pop" key={`dice-${hand.number}`}>
                🎲 {hand.dice.out ? <CardText text={`Rolled ${hand.dice.roll}: [${hand.dice.out}] → [${hand.dice.in}]`} /> : `Rolled ${hand.dice.roll}: the board stays`}
              </p>
            )}
            <div
              className={`board${shape ? ` board-${shape}` : boardSlots > 5 ? ' board-wide' : ''}${variant === 'pittsburgh' ? ' board-rivers' : ''}`}
              aria-label="Board"
            >
              {Array.from({ length: boardSlots }, (_, i) => i).map((i) => {
                const c = hand?.board[i];
                const size = boardSlots > 5 || shape ? 'md' : 'lg';
                return c ? (
                  <PlayingCard
                    key={`${hand!.number}-${c}`}
                    card={c}
                    size={size}
                    dim={dim(c)}
                    glow={glow(c)}
                    flip
                    pack={me?.cardPack}
                    delay={i < streetCards(variant, 'flop') ? i * 160 : 0}
                    style={place(i)}
                  />
                ) : (
                  <CardSlot key={`slot-${i}`} size={size} style={place(i)} />
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
        {hand?.voting && mySeat && me ? (
          <Vote game={game} me={me} />
        ) : hand?.discarding && mySeat && !mySeat.folded ? (
          <Discard game={game} seat={mySeat} />
        ) : bare && (!hand || hand.result) ? null : <ActionArea game={game} me={me} seat={mySeat} myTurn={myTurn} sending={!!sending} pre={pre} setPre={setPre} />}
      </div>

      <div className={`me-area${canShow ? ' has-show' : ''}`}>
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
                pack={me?.cardPack}
                delay={i * 180}
                className={`my-card my-card-${i}`}
              />
            ))
          ) : (
            Array.from({ length: holeCount(variant) }, (_, i) => <CardSlot key={i} size="xl" />)
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
      </div>
    </div>
  );
}

/** Crazy Pineapple: after the flop betting, tap the card you're throwing away. */
function Discard({ game, seat }: { game: Game; seat: Seat }) {
  const hand = game.hand!;
  if (seat.cards.length < 3) {
    const waiting = pendingDiscards(game).length;
    return <p className="discard-wait">{waiting ? `Waiting for ${waiting === 1 ? 'one player' : `${waiting} players`} to throw a card away…` : 'Here comes the turn…'}</p>;
  }
  return (
    <div className="discard">
      <p className="discard-title">Tap the card to throw away</p>
      <div className="discard-cards">
        {seat.cards.map((c) => (
          <button key={c} type="button" className="discard-card press" aria-label={`Throw away the ${cardName(c)}`} onClick={() => dispatch({ type: 'discard', hand: hand.number, card: c })}>
            <PlayingCard card={c} size="lg" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Imposter: after the river, everyone dealt in votes for who they think the imposter is. */
function Vote({ game, me }: { game: Game; me: Player }) {
  const hand = game.hand!;
  if (hand.votes?.[me.id]) {
    const waiting = pendingVoters(game).length;
    return <p className="discard-wait">{waiting ? `Waiting for ${waiting === 1 ? 'one more vote' : `${waiting} more votes`}…` : 'Counting the votes…'}</p>;
  }
  const suspects = hand.seats.map((s) => game.players.find((p) => p.id === s.playerId)).filter((p): p is Player => !!p && p.id !== me.id);
  return (
    <div className="vote">
      <p className="discard-title">Who's the imposter?</p>
      <div className="vote-grid">
        {suspects.map((p) => (
          <button key={p.id} type="button" className="vote-btn press" onClick={() => dispatch({ type: 'vote', hand: hand.number, playerId: p.id })}>
            <Avatar emoji={p.emoji} size={36} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Ghost Hold'em: the ghost's two cards (face down until a showdown) and what it's holding for the next hand. */
function Ghost({ game }: { game: Game }) {
  const mine = useApp((s) => myPlayer(game, s.deviceId))?.cardPack;
  const hand = game.hand;
  const ghost = hand?.result?.ghost;
  const holding = hand && !hand.result ? (hand.carry ?? 0) : (game.ghostPot ?? 0);
  if (variantOf(game) !== 'ghost' && !holding) return null;
  return (
    <div className={`ghost${ghost?.kept ? ' won' : ''}`} aria-label="The ghost">
      <span className="ghost-face" aria-hidden>
        👻
      </span>
      {hand && variantOf(game) === 'ghost' && (
        <span className="ghost-cards">
          {(ghost?.cards ?? hand.ghost ?? [null, null]).map((c, i) => (c ? <PlayingCard key={c} card={c} size="sm" flip pack={mine} /> : <PlayingCard key={i} back size="sm" pack={mine} />))}
        </span>
      )}
      <small>{ghost ? (ghost.kept ? `Keeps ${chips(ghost.kept)} · ${ghost.name}` : ghost.name) : holding ? `Holding ${chips(holding)}` : 'Ghost'}</small>
    </div>
  );
}

/**
 * The turn timer, wrapped round the table: a bright line along the rail that shrinks back
 * towards the top as time runs out (blue on your turn, gold for anyone else, red at the end).
 */
/** A tick for each of your last five seconds. Has its own clock so the rest of the table isn't redrawn with it. */
function TurnTicks({ game, myTurn }: { game: Game; myTurn: boolean }) {
  const deadline = game.hand?.deadline;
  const active = myTurn && !!deadline;
  const real = useNow(active ? 250 : 60_000);
  const secsLeft = active ? Math.max(0, Math.ceil((deadline! - toTableTime(real, game.fast)) / 1000)) : null;
  useEffect(() => {
    if (secsLeft !== null && secsLeft > 0 && secsLeft <= 5) playSound('tick');
  }, [secsLeft]);
  return null;
}

function TableTimer({ game, mine }: { game: Game; mine: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const run = useRef<SVGPathElement>(null);
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
  const deadline = hand?.deadline ?? 0;
  const total = game.settings.turnSeconds * 1000;
  const speed = game.fast ? FAST : 1;
  const [low, setLow] = useState(false);
  const { w, h } = size;
  const drawn = w > 0 && live;

  // The line drains in one animation that the browser runs, instead of this component redrawing it five times a
  // second. It starts from however much time is left, so a phone that joins mid-turn shows the right amount.
  useEffect(() => {
    setLow(false);
    if (!drawn) return;
    const remaining = Math.max(0, deadline - toTableTime(Date.now(), game.fast));
    const from = Math.max(0, Math.min(1, remaining / total)) * 100;
    const ms = remaining / speed;
    const drain = run.current?.animate([{ strokeDasharray: `${from} 100` }, { strokeDasharray: '0 100' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    // The last five seconds turn red.
    const lowAt = ms - 5000 / speed;
    if (lowAt <= 0) {
      setLow(true);
      return () => drain?.cancel();
    }
    const t = setTimeout(() => setLow(true), lowAt);
    return () => {
      clearTimeout(t);
      drain?.cancel();
    };
  }, [drawn, deadline, total, speed, game.fast]);

  // A stadium along the middle of the rail, starting at the top middle and running clockwise.
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
      aria-label={live ? `${game.settings.turnSeconds} seconds a turn` : undefined}
    >
      {drawn && (
        <>
          <path d={d} className="timer-track" pathLength={100} />
          <path ref={run} d={d} className="timer-run" pathLength={100} strokeDasharray="100 100" />
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
  // Imposter: who it was and whether the table found them.
  if (result.imposter) {
    const imp = game.players.find((p) => p.id === result.imposter!.id);
    const tally = Object.values(result.imposter.votes).filter((v) => v === result.imposter!.id).length;
    const total = Object.keys(result.imposter.votes).length;
    const pot = Object.values(result.won).reduce((a, b) => a + b, 0);
    const title = result.imposter.caught
      ? `Caught! Innocents split ${chips(pot)}`
      : winners.length === 1 && winners[0].id === result.imposter.id
        ? `${imp?.name ?? 'Imposter'} got away: ${chips(pot)}`
        : `Innocents split ${chips(pot)}`;
    return (
      <div key={hand.number} className="win-banner pop" role="status">
        <Avatar emoji="🕵️" size={34} />
        <span className="win-text">
          <b>{title}</b>
          <small>{`Imposter: ${imp?.name ?? '?'} · ${tally} of ${total} votes`}</small>
        </span>
      </div>
    );
  }
  if (!winners.length) {
    // Ghost Hold'em: nobody beat the ghost, so it keeps the pot for the next hand.
    if (!result.ghost?.kept) return null;
    return (
      <div key={hand.number} className="win-banner pop" role="status">
        <Avatar emoji="👻" size={34} />
        <span className="win-text">
          <b>The ghost keeps {chips(result.ghost.kept)}</b>
          <small>{result.ghost.name} · it goes to the next hand</small>
        </span>
      </div>
    );
  }
  const top = winners[0];
  const split = winners.length > 1;
  const you = top.p!.deviceId === deviceId;
  const title = split
    ? `Split pot · ${winners.map((w) => w.p!.name).join(' & ')}`
    : `${you ? 'You win' : `${top.p!.name} wins`} ${chips(top.amount)}`;
  const how = result.showdown ? result.names[top.id] : 'Everyone else folded';
  return (
    <div key={hand.number} className={`win-banner pop${split ? ' split' : ''}`} role="status">
      <Avatar emoji={top.p!.emoji} size={34} />
      <span className="win-text">
        <b>{title}</b>
        {how && <small>{how}</small>}
      </span>
    </div>
  );
}
