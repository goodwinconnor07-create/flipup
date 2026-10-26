// How a line is said at the table: cut into short messages, each sent after a moment of "typing",
// the way people text. The cutting, every duration and the sequencer that lines bots up into one
// conversation live here, so the phone, the bots' own timing and the tests all agree. Pure: no DOM
// and no clock of its own (time is always passed in).

export interface Beat {
  text: string;
  /** A second thought: a longer pause, with the typing dots gone, before it comes. */
  slow: boolean;
}

export const CHAT = {
  /** A line is never more than this many messages. */
  maxBeats: 3,
  /** A piece longer than this is cut at its sentences, then at a comma or a dash, then between words. */
  cutAt: 15,
  /** Typing dots before a message lands: a base plus a little per letter, never longer than the cap. */
  typeBase: 220,
  typePerChar: 13,
  typeMax: 520,
  /** Follow-up messages in a burst are typed quicker than the first. */
  burst: 0.7,
  /** The gap between one message landing and the next one's dots. */
  settle: 80,
  /** The pause before a `||` second thought. */
  afterthought: 650,
  /** How long a message stays up: a base plus a little per letter, within a floor and a ceiling. */
  holdBase: 700,
  holdPerChar: 30,
  holdMin: 1200,
  holdMax: 2400,
  /** A person's quick message stays up this long. */
  quickHold: 2600,
  /** Another bot may start typing this long after the last message of whoever's talking lands. */
  replyGap: 260,
  /** A seat shows this many messages at once; a third pushes the oldest out. */
  maxShown: 2,
  /** How long a bot waits after its last message before it moves (so the table can read it). */
  readTime: 600,
  /** A line that waited this long to start is stale and dropped. */
  staleAfter: 2600,
  /** Lines the table is waiting on (a reaction to how a hand ended) wait longer. */
  staleAfterOwed: 4500,
  /** At most this many lines wait their turn. */
  maxQueued: 3,
} as const;

/** The longest a message may be and still sit on one line in a seat's bubble (the narrowest seat on a phone). */
export const ONE_LINE = CHAT.cutAt;

/** "Hey {you}.|Ready to lose?" → two messages. `|` is a quick new message, `||` a slow one (a second thought). */
export function splitBeats(template: string): Beat[] {
  const out: Beat[] = [];
  let slow = false;
  for (const part of template.split(/(\|\|?)/)) {
    if (part === '|') {
      slow = false;
      continue;
    }
    if (part === '||') {
      slow = true;
      continue;
    }
    const text = part.trim();
    if (!text) continue;
    cut(text).forEach((piece, i) => out.push({ text: piece, slow: i === 0 && slow }));
    slow = false;
  }
  if (out.length > CHAT.maxBeats) {
    const rest = out.splice(CHAT.maxBeats - 1);
    out.push({ text: rest.map((b) => b.text).join(' '), slow: rest[0].slow });
  }
  return out.length ? out : [{ text: template.replaceAll('|', ' ').trim(), slow: false }];
}

/** "Bold, {you}." with nobody to address → "Bold.": the name and its comma go, and a message that was only the name goes. */
function withoutName(text: string): string {
  return text
    .replace(/,?\s*\{you\}(?=[.!?,…])/g, '')
    .replace(/\{you\}[.,!?]?\s*/g, '')
    .replace(/^[.,!?]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * A line with its name filled in, cut into messages. The cutting is done on the template, so a name can never
 * add a break. With no name (a bot talking to the whole table) the name is left out of the line.
 */
export function lineBeats(template: string, you?: string): Beat[] {
  const beats = splitBeats(template)
    .map((b) => ({ ...b, text: you === undefined ? withoutName(b.text) : b.text.replaceAll('{you}', you) }))
    .filter((b) => b.text !== '');
  return beats.length ? beats : [{ text: '…', slow: false }];
}

/** A line as one piece of plain text (for anywhere that wants the words, not the timing). */
export const lineText = (template: string, you?: string): string => lineBeats(template, you).map((b) => b.text).join(' ');

/** A piece of a line cut at its sentences, and any piece still too long cut at its best comma or dash. */
function cut(text: string): string[] {
  if (text.length <= CHAT.cutAt) return [text];
  const sentences = text
    .replace(/([.!?…]+)\s+/g, '$1\u0001')
    .split('\u0001')
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.flatMap((s) => (s.length > CHAT.cutAt ? cutClause(s).flatMap((c) => (c.length > CHAT.cutAt ? cutWords(c) : [c])) : [s]));
}

/** A piece with no sentence or comma to cut at: cut between two words, as close to the middle as it gets. */
function cutWords(s: string): string[] {
  const mid = s.length / 2;
  let best = -1;
  for (let i = 3; i < s.length - 3; i++) if (s[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  if (best < 0) return [s];
  return [s.slice(0, best), s.slice(best + 1)].flatMap((c) => (c.length > CHAT.cutAt ? cutWords(c) : [c]));
}

function cutClause(s: string): string[] {
  const mid = s.length / 2;
  let best = -1;
  for (const m of s.matchAll(/[,;:—–]\s|\s[-—–]\s/g)) {
    const i = m.index! + 1;
    const rest = s.length - i;
    // Both halves must be worth a message of their own.
    if (i < 5 || rest < 5) continue;
    if (best < 0 || Math.abs(i - mid) < Math.abs(best - mid)) best = i;
  }
  if (best < 0) return [s];
  return [s.slice(0, best).trim(), s.slice(best).trim()].filter(Boolean);
}

/** Letters that count toward typing and reading (emoji count as two, they take a moment to find). */
const size = (text: string) => [...text].length;

/** How long the typing dots show before a message lands. */
export const typeMs = (text: string, followUp = false): number =>
  Math.round(Math.min(CHAT.typeMax, CHAT.typeBase + CHAT.typePerChar * size(text)) * (followUp ? CHAT.burst : 1));

/** How long a message stays up once it has landed. */
export const holdMs = (text: string): number => Math.round(Math.min(CHAT.holdMax, Math.max(CHAT.holdMin, CHAT.holdBase + CHAT.holdPerChar * size(text))));

/** The least a message of this size needs on screen to be read: a moment to notice it, then fast reading. */
export const readMs = (text: string): number => Math.round(300 + (size(text) / 25) * 1000);

/**
 * When each message of a line lands, counted from the moment its speaker starts typing: the dots start at
 * `from`. A seat shows two messages at once, so a third waits until the first has had time to be read.
 */
export function beatTimes(beats: Beat[]): { from: number; land: number }[] {
  const times: { from: number; land: number }[] = [];
  let cursor = 0;
  beats.forEach((b, i) => {
    let from = cursor + (i === 0 ? 0 : b.slow ? CHAT.afterthought : CHAT.settle);
    const type = typeMs(b.text, i > 0);
    let land = from + type;
    if (i >= 2) {
      land = Math.max(land, times[i - 2].land + readMs(beats[i - 2].text));
      from = land - type;
    }
    times.push({ from, land });
    cursor = land;
  });
  return times;
}

/** From the first dots to the last message landing. */
export const spokenMs = (beats: Beat[]): number => beatTimes(beats).at(-1)?.land ?? 0;

/** How long a bot should wait before it moves after saying this: the line, then a moment to read it. */
export const sayAndReadMs = (beats: Beat[]): number => spokenMs(beats) + CHAT.readTime;

// ── What is still worth saying ──────────────────────────────────────────────────────────────

/** Thinking-out-loud lines belong before the move they're about: once it's made, they're stale. */
export const BEFORE_MOVE: ReadonlySet<string> = new Set(['thinkHard', 'thinkEasy', 'raise', 'foldBig', 'callLight', 'yourBigBet', 'allin', 'tank']);

/** Lines said before a hand's outcome is known ("c'mon!"). They're dropped when the next card lands or the pot goes. */
export const PRE_OUTCOME: ReadonlySet<string> = new Set(['allin', 'sweat', 'sweatWatch']);

/** Lines that react to how a hand ended: they come a beat after the cards turn, and may wait a little longer for a turn. */
export const POST_OUTCOME: ReadonlySet<string> = new Set([
  'sweatWin',
  'sweatLose',
  'watched',
  'badBeat',
  'bigWin',
  'win',
  'lostToYou',
  'bluffWon',
  'bluffCaught',
  'revenge',
  'tiltJab',
  'showBluff',
  'showStrong',
  'showFold',
]);

/** How long after the hand ends a reaction comes: a beat, as if the bot had just seen the cards turn. */
export const REACT_DELAY = { min: 350, spread: 450 } as const;

/** "b:friendly:sweat:2" → "sweat" (a person's quick message has none). */
export const talkEvent = (lineId: string): string => (lineId.startsWith('b:') ? lineId.split(':')[2] : '');

/**
 * Whether a line is still about where the table is now. `moment` is "hand-cards-live|over": a line said before
 * the outcome only holds for that exact moment, any other until its hand is over.
 */
export const worthSaying = (moment: string) => (m: { event: string; moment: string }): boolean =>
  PRE_OUTCOME.has(m.event) ? m.moment === moment : m.moment.split('-')[0] === moment.split('-')[0];

/** A bot's line, ready for the lane. `luck` is a number from 0 to 1 that spreads out the reaction delay. */
export function botSay(a: { who: string; lineId: string; n: number; beats: Beat[]; at: number; moment: string; sig: string; luck: number }): Say {
  const event = talkEvent(a.lineId);
  const post = POST_OUTCOME.has(event);
  const delay = post ? REACT_DELAY.min + a.luck * REACT_DELAY.spread : 0;
  return {
    who: a.who,
    key: `${a.who}|${a.lineId}|${a.n}`,
    event,
    beats: a.beats,
    notBefore: a.at + delay,
    expires: a.at + delay + (post ? CHAT.staleAfterOwed : CHAT.staleAfter),
    moment: a.moment,
    sig: a.sig,
  };
}

/** A person's quick message: up at once and out of the queue. */
export function quickSay(a: { who: string; lineId: string; n: number; text: string; at: number; moment: string }): Say {
  return { who: a.who, key: `${a.who}|${a.lineId}|${a.n}`, event: '', beats: [{ text: a.text, slow: false }], notBefore: a.at, expires: a.at + CHAT.staleAfter, moment: a.moment, sig: '', instant: true };
}

// ── The conversation: who is talking, who is typing, what is on screen ───────────────────────

/** A line waiting for its turn to be said. */
export interface Say {
  /** Who is talking (a player id). */
  who: string;
  /** Unique for this line, so its messages keep their place across redraws. */
  key: string;
  /** The kind of moment it's about (a TalkEvent), for dropping lines that went stale. */
  event: string;
  beats: Beat[];
  /** Not before this time. */
  notBefore: number;
  /** Dropped if it still hasn't started by then. */
  expires: number;
  /** The table moment it belongs to, and the speaker's last move when it was queued. The screen's to use. */
  moment: string;
  sig: string;
  /** A person's quick message: it's up at once, no typing, whatever else is being said. */
  instant?: boolean;
}

/** One message on screen. */
export interface Message {
  key: string;
  text: string;
  /** When it landed and when it goes. */
  at: number;
  until: number;
  event: string;
  moment: string;
}

/** What one seat shows: its messages, oldest first, and whether its dots are on. */
export interface Talk {
  shown: Message[];
  typing: boolean;
}

interface Script {
  say: Say;
  steps: { from: number; land: number }[];
  landed: number;
}

/**
 * The table's conversation. Lines wait in a queue; the next one starts when the one before has landed its
 * last message (plus a small gap), so bots answer each other instead of talking over each other, but a
 * message that's still up while the next speaker types is fine, like a group chat. Everything takes the
 * time as an argument: call `advance(now)`, then draw from `talk()`, and wake up again at `nextDue()`.
 */
export class ChatLane {
  private queue: Say[] = [];
  private scripts = new Map<string, Script>();
  private seats = new Map<string, Message[]>();
  private freeAt = 0;
  /** Seats whose messages all ran out since the last `takeRetired()`. */
  private retired: string[] = [];

  /** Adds a line. A bot has one line waiting at a time (its newest); a person's message goes up at once. */
  push(say: Say): void {
    if (!say.instant) {
      this.queue = this.queue.filter((q) => q.who !== say.who);
      this.queue.push(say);
      while (this.queue.length > CHAT.maxQueued) this.queue.shift();
    } else this.queue.push(say);
  }

  /** The seat made its move: what it was saying is over. `stale` picks the waiting lines that were about the move. */
  clear(who: string, stale: (say: Say) => boolean): void {
    this.seats.delete(who);
    this.scripts.delete(who);
    this.queue = this.queue.filter((q) => q.who !== who || !stale(q));
  }

  /** Keeps only what `keep` says is still worth saying: waiting lines, lines being typed and messages up. */
  retain(keep: (m: { event: string; moment: string }) => boolean): void {
    this.queue = this.queue.filter((q) => keep(q));
    for (const [who, s] of this.scripts) if (!keep(s.say)) this.scripts.delete(who);
    for (const [who, msgs] of this.seats) {
      const kept = msgs.filter(keep);
      if (kept.length === msgs.length) continue;
      if (kept.length) this.seats.set(who, kept);
      else {
        this.seats.delete(who);
        this.retired.push(who);
      }
    }
  }

  /** Moves everything due by `now`. True if anything on screen changed. */
  advance(now: number): boolean {
    let changed = false;
    for (let guard = 0; guard < 64; guard++) {
      let moved = false;
      // Messages whose time is up go.
      for (const [who, msgs] of this.seats) {
        const kept = msgs.filter((m) => m.until > now);
        if (kept.length === msgs.length) continue;
        moved = true;
        if (kept.length) this.seats.set(who, kept);
        else {
          this.seats.delete(who);
          this.retired.push(who);
        }
      }
      // Messages whose dots have run their course land.
      for (const [who, s] of this.scripts) {
        while (s.landed < s.steps.length && s.steps[s.landed].land <= now) {
          const step = s.steps[s.landed];
          this.show(who, { key: `${s.say.key}#${s.landed}`, text: s.say.beats[s.landed].text, at: step.land, until: step.land + holdMs(s.say.beats[s.landed].text), event: s.say.event, moment: s.say.moment });
          s.landed++;
          moved = true;
        }
        if (s.landed >= s.steps.length) this.scripts.delete(who);
      }
      // The next line starts.
      const next = this.nextToStart(now);
      if (next) {
        this.queue.splice(this.queue.indexOf(next), 1);
        this.start(next, now);
        moved = true;
      }
      // Lines that waited too long are dropped.
      const before = this.queue.length;
      this.queue = this.queue.filter((q) => q.expires > now);
      if (this.queue.length !== before) moved = true;
      if (!moved) break;
      changed = true;
    }
    return changed;
  }

  /** The next time something changes (it may be at or before `now`: call `advance` again). Null when idle. */
  nextDue(now: number): number | null {
    let due = Infinity;
    for (const msgs of this.seats.values()) for (const m of msgs) due = Math.min(due, m.until);
    for (const s of this.scripts.values()) {
      const step = s.steps[s.landed];
      if (step) due = Math.min(due, step.from > now ? step.from : step.land);
    }
    for (const q of this.queue) {
      const busy = this.scripts.has(q.who);
      if (!busy) due = Math.min(due, q.instant ? q.notBefore : Math.max(q.notBefore, this.freeAt));
      due = Math.min(due, q.expires);
    }
    return Number.isFinite(due) ? due : null;
  }

  /** What a seat shows now. */
  talk(who: string, now: number): Talk | undefined {
    const shown = this.seats.get(who) ?? [];
    const s = this.scripts.get(who);
    const step = s?.steps[s.landed];
    const typing = !!step && now >= step.from;
    return shown.length || typing ? { shown, typing } : undefined;
  }

  /** The seats that just ran out of messages, once. */
  takeRetired(): string[] {
    const out = this.retired;
    this.retired = [];
    return out;
  }

  /** True when nobody is talking and nothing waits. */
  get idle(): boolean {
    return !this.queue.length && !this.scripts.size && !this.seats.size;
  }

  private nextToStart(now: number): Say | undefined {
    // A person's message never waits for the bots.
    const instant = this.queue.find((q) => q.instant && q.notBefore <= now);
    if (instant) return instant;
    if (now < this.freeAt) return undefined;
    return this.queue.find((q) => !q.instant && q.notBefore <= now && !this.scripts.has(q.who));
  }

  private start(say: Say, now: number): void {
    if (say.instant) {
      this.show(say.who, { key: `${say.key}#0`, text: say.beats[0].text, at: now, until: now + CHAT.quickHold, event: say.event, moment: say.moment });
      return;
    }
    const steps = beatTimes(say.beats).map((s) => ({ from: now + s.from, land: now + s.land }));
    this.scripts.set(say.who, { say, steps, landed: 0 });
    this.freeAt = steps[steps.length - 1].land + CHAT.replyGap;
  }

  private show(who: string, m: Message): void {
    const msgs = [...(this.seats.get(who) ?? []), m];
    // A third message pushes the oldest out at once.
    while (msgs.length > CHAT.maxShown) msgs.shift();
    this.seats.set(who, msgs);
  }
}
