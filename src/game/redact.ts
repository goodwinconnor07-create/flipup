import { publicId } from './ids';
// What each phone is allowed to see. The deck never leaves the server, and other players'
// hole cards stay hidden until they're turned face up.

import type { Game, HandLog } from './types';

const mineFor = (game: Game, deviceId: string) => new Set(game.players.filter((p) => p.deviceId === deviceId).map((p) => p.id));

/** The table as one phone may see it. The hand log is left out (it's sent on request, see redactLogs). */
export function redactForDevice(game: Game, deviceId: string): Game {
  const hand = game.hand;
  const mine = mineFor(game, deviceId);
  // With the host's setting on, someone who has gone broke sees every hole card (no one still in a hand does).
  const peek =
    !!game.settings.showToBusted &&
    !game.campaign &&
    !!hand &&
    mine.size > 0 &&
    game.players.filter((p) => mine.has(p.id)).every((p) => p.stack === 0) &&
    hand.seats.filter((s) => mine.has(s.playerId)).every((s) => s.folded);
  // Other phones' device ids are secrets (they prove who owns a seat): each phone sees only its own.
  const shown = (id: string): string => (id === deviceId ? id : publicId(id));
  return {
    ...game,
    hostDeviceId: shown(game.hostDeviceId),
    // Bots' styles and identities and their notes on players stay on the server.
    players: game.players.map(({ style: _style, labStyle: _labStyle, botProfile: _profile, botKind: _kind, dull: _dull, ...p }) =>
      p.deviceId ? { ...p, deviceId: shown(p.deviceId) } : p,
    ),
    humanPoker: undefined,
    botTable: undefined,
    legacyBotSimulation: undefined,
    reads: undefined,
    botPlan: undefined,
    pendingTalk: undefined,
    talkAt: undefined,
    talkDone: undefined,
    sweating: undefined,
    streaks: undefined,
    minds: undefined,
    dialogue: undefined,
    card: undefined,
    // Secret Missions: everyone's progress is public; only your own mission is sent to you.
    missions: game.missions && { ...game.missions, players: Object.fromEntries(Object.entries(game.missions.players).map(([id, p]) => [id, mine.has(id) ? p : { ...p, mission: null }])) },
    logs: [],
    hand: hand && {
      ...hand,
      deck: [],
      // Haunted Pot: the ghost's cards stay face down until a showdown.
      ghost: hand.result?.showdown ? hand.ghost : undefined,
      // Memory Poker: the cards taken out were shown before the deal; during the hand players have to remember them.
      removed: hand.result ? hand.removed : undefined,
      // Imposter: nobody is told who it is, not even the imposter, until the hand is over; votes stay secret until then too.
      // Before then it's '?': phones still know it's an Imposter hand (no Fold button), just not whose.
      imposter: hand.result ? hand.imposter : hand.imposter ? '?' : undefined,
      votes: hand.votes && (hand.result || hand.tally ? hand.votes : Object.fromEntries(Object.keys(hand.votes).map((k) => [k, mine.has(k) ? hand.votes![k] : '']))),
      // Crazy Pineapple: the cards thrown away are turned up together, once everyone has chosen.
      discards: hand.discards && (hand.discarding ? Object.fromEntries(Object.entries(hand.discards).filter(([k]) => mine.has(k))) : hand.discards),
      // Slide Switch: the card someone has picked stays theirs until the cards move, and a slide's card is only known
      // to the two players it passed between.
      slides: hand.slides && Object.fromEntries(Object.entries(hand.slides).filter(([k]) => mine.has(k))),
      slid: hand.slid?.map((x) => (peek || mine.has(x.from) || mine.has(x.to) ? x : { ...x, card: '' as const })),
      // Power Cards: other players' powers stay secret until they're played (or the hand is over), and what a Peek or
      // an X-ray showed is only for the player who played it.
      powers: hand.powers && (hand.result ? hand.powers : Object.fromEntries(Object.entries(hand.powers).filter(([k]) => mine.has(k) || hand.powerUses?.some((u) => u.by === k)))),
      powerUses: hand.powerUses?.map((u) => (mine.has(u.by) || !u.seen ? u : { ...u, seen: undefined })),
      seats: hand.seats.map((s) => (peek || mine.has(s.playerId) || s.shown ? s : { ...s, cards: [] })),
    },
  };
}

/** The hand log as one phone may see it: its own hole cards and any that were shown. */
export function redactLogs(game: Game, deviceId: string): HandLog[] {
  const mine = mineFor(game, deviceId);
  const visible = (holes: Record<string, string[]>, shown: string[]) =>
    Object.fromEntries(Object.entries(holes).filter(([id]) => mine.has(id) || shown.includes(id)));
  return (game.logs ?? []).map((l) => ({
    ...l,
    holes: visible(l.holes, l.shown),
    record: l.record && { ...l.record, holes: visible(l.record.holes, l.shown) },
  }));
}
