import { describe, expect, it } from 'vitest';
import { allLines } from './botTalk';
import { BEFORE_MOVE, botSay, beatTimes, CHAT, ChatLane, holdMs, lineBeats, lineText, ONE_LINE, quickSay, readMs, sayAndReadMs, spokenMs, splitBeats, typeMs, worthSaying, type Say } from './chat';

const texts = (t: string) => splitBeats(t).map((b) => b.text);

describe('splitting a line into messages', () => {
  it('keeps a short line as one message', () => {
    expect(texts('Nice hand!')).toEqual(['Nice hand!']);
    expect(texts('Fine. Take it.')).toEqual(['Fine. Take it.']);
    expect(texts('…')).toEqual(['…']);
  });

  it('cuts a long line at its sentences', () => {
    expect(texts('Hey Sam. Ready to lose?')).toEqual(['Hey Sam.', 'Ready to lose?']);
    expect(texts('Hmm… so what now?')).toEqual(['Hmm…', 'so what now?']);
  });

  it('cuts at a comma when a sentence is still long', () => {
    expect(texts('Take it, you earned it.')).toEqual(['Take it,', 'you earned it.']);
  });

  it('cuts between words as a last resort, near the middle', () => {
    const parts = texts('Tell me you have it right now');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= ONE_LINE + 2)).toBe(true);
    expect(parts.join(' ')).toBe('Tell me you have it right now');
  });

  it('honours | as a new message and || as a second thought', () => {
    expect(splitBeats('Nice fold.|Scared money.')).toEqual([
      { text: 'Nice fold.', slow: false },
      { text: 'Scared money.', slow: false },
    ]);
    expect(splitBeats('Nice fold.||Scared money.')).toEqual([
      { text: 'Nice fold.', slow: false },
      { text: 'Scared money.', slow: true },
    ]);
  });

  it('never sends more than three messages, and loses no words', () => {
    const beats = splitBeats('One. Two. Three. Four. Five. Six.');
    expect(beats.length).toBe(CHAT.maxBeats);
    expect(beats.map((b) => b.text).join(' ')).toBe('One. Two. Three. Four. Five. Six.');
  });

  it('never loses a word of any line, and never makes an empty message', () => {
    for (const { text } of allLines()) {
      const beats = splitBeats(text);
      expect(beats.length).toBeGreaterThan(0);
      expect(beats.length).toBeLessThanOrEqual(CHAT.maxBeats);
      for (const b of beats) expect(b.text.trim()).not.toBe('');
      const squash = (s: string) => s.replace(/\|\|?/g, ' ').replace(/\s+/g, ' ').trim();
      expect(beats.map((b) => b.text).join(' ').replace(/\s+/g, ' ')).toBe(squash(text));
    }
  });

  it("fills in a name after cutting, so a name can't add a break or a bar", () => {
    const beats = lineBeats('Hey {you}. Ready?', 'A|B');
    expect(beats.map((b) => b.text)).toEqual(['Hey A|B.', 'Ready?']);
    expect(lineText('Hey {you}. Ready?', 'Sam')).toBe('Hey Sam. Ready?');
  });
});

describe('how long things take', () => {
  it('types a longer message for longer, within bounds', () => {
    expect(typeMs('Hi')).toBeGreaterThanOrEqual(CHAT.typeBase);
    expect(typeMs('a'.repeat(200))).toBe(CHAT.typeMax);
    expect(typeMs('Hello there friend')).toBeGreaterThan(typeMs('Hi'));
    expect(typeMs('Hello there friend', true)).toBeLessThan(typeMs('Hello there friend'));
  });

  it('holds a message long enough to read at a comfortable pace, within bounds', () => {
    expect(holdMs('Hi')).toBe(CHAT.holdMin);
    expect(holdMs('a'.repeat(200))).toBe(CHAT.holdMax);
    for (const len of [1, 5, 10, 15, 20]) {
      // 300 ms to notice it, then 20 letters a second (a relaxed pace: most people read faster).
      const need = 300 + (len / 20) * 1000;
      expect(holdMs('x'.repeat(len))).toBeGreaterThanOrEqual(Math.min(need, CHAT.holdMax));
    }
  });

  it('lands the messages of a line in order, each after its own typing', () => {
    const beats = splitBeats('Hey Sam. Ready to lose?');
    const t = beatTimes(beats);
    expect(t[0].from).toBe(0);
    expect(t[0].land).toBe(typeMs('Hey Sam.'));
    expect(t[1].from).toBe(t[0].land + CHAT.settle);
    expect(t[1].land).toBe(t[1].from + typeMs('Ready to lose?', true));
    expect(spokenMs(beats)).toBe(t[1].land);
    expect(sayAndReadMs(beats)).toBe(t[1].land + CHAT.readTime);
  });

  it('waits longer before a second thought, with the dots gone', () => {
    const quick = beatTimes(splitBeats('Nice fold.|Scared money.'));
    const slow = beatTimes(splitBeats('Nice fold.||Scared money.'));
    expect(slow[1].from - quick[1].from).toBe(CHAT.afterthought - CHAT.settle);
    expect(slow[1].from).toBeGreaterThan(slow[0].land);
  });

  it('says every line in the game quickly enough to feel like texting', () => {
    for (const { text } of allLines()) {
      const beats = splitBeats(text.replaceAll('{you}', 'Connor'));
      // Whole line out in under two seconds, so a bot never makes you wait for its words.
      expect(spokenMs(beats), text).toBeLessThanOrEqual(2000);
      expect(sayAndReadMs(beats), text).toBeLessThanOrEqual(2600);
    }
  });

  it('keeps nearly every message to one line in the narrowest seat', () => {
    let beats = 0;
    let long = 0;
    for (const { text } of allLines()) {
      for (const b of splitBeats(text.replaceAll('{you}', 'Sam'))) {
        beats++;
        if (b.text.length > ONE_LINE) long++;
        // Nothing wraps past two lines.
        expect(b.text.length, b.text).toBeLessThanOrEqual(ONE_LINE * 2);
      }
    }
    expect(long / beats).toBeLessThan(0.02);
  });
});

const say = (who: string, text: string, at = 0, extra: Partial<Say> = {}): Say => ({
  who,
  key: `${who}-${text}-${at}`,
  event: 'win',
  beats: splitBeats(text),
  notBefore: at,
  expires: at + 10_000,
  moment: '1-0-live',
  sig: '',
  ...extra,
});

/** Runs the lane forward to `until`, waking only when it says something is due. Returns every moment it changed. */
function run(lane: ChatLane, from: number, until: number): number[] {
  const at: number[] = [];
  let now = from;
  for (let guard = 0; guard < 10_000 && now <= until; guard++) {
    if (lane.advance(now)) at.push(now);
    const due = lane.nextDue(now);
    if (due === null) break;
    if (due <= now) {
      // Overdue work is only fine if advance just ran; it must have made progress.
      now += 1;
    } else now = due;
  }
  return at;
}

describe('the conversation', () => {
  it('shows typing dots, then the message, then takes it away', () => {
    const lane = new ChatLane();
    lane.push(say('a', 'Nice hand!'));
    lane.advance(0);
    expect(lane.talk('a', 0)).toEqual({ shown: [], typing: true });
    const land = typeMs('Nice hand!');
    lane.advance(land - 1);
    expect(lane.talk('a', land - 1)?.shown).toEqual([]);
    lane.advance(land);
    const talk = lane.talk('a', land)!;
    expect(talk.shown.map((m) => m.text)).toEqual(['Nice hand!']);
    expect(talk.typing).toBe(false);
    const gone = land + holdMs('Nice hand!');
    lane.advance(gone - 1);
    expect(lane.talk('a', gone - 1)).toBeDefined();
    lane.advance(gone);
    expect(lane.talk('a', gone)).toBeUndefined();
    expect(lane.takeRetired()).toEqual(['a']);
    expect(lane.takeRetired()).toEqual([]);
    expect(lane.idle).toBe(true);
  });

  it('sends a burst one message after another, the older one staying up beside the newer', () => {
    const lane = new ChatLane();
    lane.push(say('a', 'Hey Sam. Ready to lose?'));
    lane.advance(0);
    const [one, two] = beatTimes(splitBeats('Hey Sam. Ready to lose?'));
    lane.advance(one.land);
    expect(lane.talk('a', one.land)?.shown.map((m) => m.text)).toEqual(['Hey Sam.']);
    // The dots come back for the second one after a short settle.
    expect(lane.talk('a', one.land)?.typing).toBe(false);
    lane.advance(two.from);
    expect(lane.talk('a', two.from)?.typing).toBe(true);
    lane.advance(two.land);
    expect(lane.talk('a', two.land)?.shown.map((m) => m.text)).toEqual(['Hey Sam.', 'Ready to lose?']);
  });

  it('shows at most two messages at a seat: a third pushes the oldest out', () => {
    const lane = new ChatLane();
    lane.push(say('a', 'One. Two. Three.'));
    run(lane, 0, 300);
    const end = spokenMs(splitBeats('One. Two. Three.'));
    lane.advance(end);
    expect(lane.talk('a', end)?.shown.map((m) => m.text)).toEqual(['Two.', 'Three.']);
  });

  it('lets the next speaker type only after the first has landed their last message', () => {
    const lane = new ChatLane();
    lane.push(say('a', 'Nice hand! Really.'));
    lane.push(say('b', 'Lucky.'));
    lane.advance(0);
    expect(lane.talk('b', 0)).toBeUndefined();
    const first = spokenMs(splitBeats('Nice hand! Really.'));
    lane.advance(first + CHAT.replyGap - 1);
    expect(lane.talk('b', first + CHAT.replyGap - 1)).toBeUndefined();
    lane.advance(first + CHAT.replyGap);
    expect(lane.talk('b', first + CHAT.replyGap)?.typing).toBe(true);
    // And a's last message is still up while b types: it's a conversation, not a relay.
    expect(lane.talk('a', first + CHAT.replyGap)?.shown.length).toBeGreaterThan(0);
  });

  it('puts a person\'s quick message up at once, past the queue and the typing', () => {
    const lane = new ChatLane();
    lane.push(say('a', 'Long line. With two parts.'));
    lane.advance(0);
    lane.push(quickSay({ who: 'me', lineId: 'nice', n: 1, text: 'Nice hand!', at: 50, moment: '1-0-live' }));
    lane.advance(50);
    expect(lane.talk('me', 50)?.shown.map((m) => m.text)).toEqual(['Nice hand!']);
    expect(lane.talk('me', 50)?.typing).toBe(false);
  });

  it("doesn't start a line before its time", () => {
    const lane = new ChatLane();
    lane.push(say('a', 'Hello.', 500));
    lane.advance(499);
    expect(lane.talk('a', 499)).toBeUndefined();
    expect(lane.nextDue(499)).toBe(500);
    lane.advance(500);
    expect(lane.talk('a', 500)?.typing).toBe(true);
  });

  it('drops a line that waited too long', () => {
    const lane = new ChatLane();
    lane.push(say('a', 'First.', 0));
    lane.push(say('b', 'Second.', 0, { expires: 300 }));
    lane.advance(0);
    lane.advance(400);
    run(lane, 400, 5000);
    expect(lane.talk('b', 5000)).toBeUndefined();
    expect(lane.idle).toBe(true);
  });

  it('keeps only a bot\'s newest waiting line, and a short queue', () => {
    const lane = new ChatLane();
    lane.push(say('a', 'A1.'));
    lane.push(say('b', 'B1.'));
    lane.push(say('b', 'B2.'));
    lane.push(say('c', 'C1.'));
    lane.push(say('d', 'D1.'));
    const spoken: string[] = [];
    let now = 0;
    for (let i = 0; i < 400; i++) {
      lane.advance(now);
      for (const id of ['a', 'b', 'c', 'd']) for (const m of lane.talk(id, now)?.shown ?? []) if (!spoken.includes(m.text)) spoken.push(m.text);
      const due = lane.nextDue(now);
      if (due === null) break;
      now = Math.max(now + 1, due);
    }
    expect(spoken).not.toContain('B1.');
    expect(spoken.length).toBeLessThanOrEqual(CHAT.maxQueued + 1);
  });

  it("clears a seat when it moves, and drops the lines that were about that move", () => {
    const lane = new ChatLane();
    lane.push(say('a', 'Pay up.', 0, { event: 'raise' }));
    lane.push(say('a', 'Later line.', 0, { event: 'win' }));
    lane.advance(1000);
    lane.clear('a', (q) => BEFORE_MOVE.has(q.event));
    expect(lane.talk('a', 1000)).toBeUndefined();
  });

  it("drops a pre-outcome line when the moment passes, and any line once its hand is over", () => {
    const lane = new ChatLane();
    lane.push(say('a', 'C’mon!', 0, { event: 'sweat', moment: '3-3-live' }));
    lane.push(say('b', 'Thanks.', 0, { event: 'win', moment: '3-5-over' }));
    run(lane, 0, 3000);
    // The river came: the "c'mon" is about a moment that's over.
    lane.retain(worthSaying('3-4-live'));
    expect(lane.talk('a', 3000)).toBeUndefined();
    expect(lane.talk('b', 3000)?.shown.length ?? 0).toBeGreaterThanOrEqual(0);
    lane.retain(worthSaying('4-0-live'));
    expect(lane.talk('b', 3000)).toBeUndefined();
  });

  it('turns a bot line into a waiting line that reacts after the hand with a beat, other lines at once', () => {
    const base = { who: 'a', n: 1, beats: splitBeats('Ship it!'), at: 1000, moment: '2-5-over', sig: '' };
    const reaction = botSay({ ...base, lineId: 'b:shark:bigWin:1', luck: 0.5 });
    expect(reaction.notBefore).toBeGreaterThanOrEqual(1000 + 350);
    expect(reaction.notBefore).toBeLessThanOrEqual(1000 + 800);
    expect(reaction.expires).toBe(reaction.notBefore + CHAT.staleAfterOwed);
    const aside = botSay({ ...base, lineId: 'b:shark:thinkEasy:1', luck: 0.5 });
    expect(aside.notBefore).toBe(1000);
    expect(aside.expires).toBe(1000 + CHAT.staleAfter);
  });
});

/** A small deterministic random source, so a failing run can be replayed. */
function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('the conversation under load (a few hundred random tables)', () => {
  const lines = allLines().map((l) => l.text.replaceAll('{you}', 'Connor'));
  const seats = ['a', 'b', 'c', 'd', 'e'];

  it('never breaks its own rules, never busy-waits, and always empties', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rnd = mulberry(seed);
      const lane = new ChatLane();
      // A random burst of lines over twenty seconds.
      const pushes = Array.from({ length: 6 + Math.floor(rnd() * 20) }, () => ({
        at: Math.floor(rnd() * 20_000),
        who: seats[Math.floor(rnd() * seats.length)],
        text: lines[Math.floor(rnd() * lines.length)],
      })).sort((x, y) => x.at - y.at);
      let now = 0;
      let next = 0;
      let steps = 0;
      const typingSeats = new Set<string>();
      let maxTyping = 0;
      while ((next < pushes.length || !lane.idle) && now < 120_000) {
        while (next < pushes.length && pushes[next].at <= now) {
          const p = pushes[next++];
          lane.push(say(p.who, p.text, now, { key: `${seed}-${next}`, expires: now + CHAT.staleAfter }));
        }
        lane.advance(now);
        typingSeats.clear();
        for (const id of seats) {
          const talk = lane.talk(id, now);
          if (!talk) continue;
          expect(talk.shown.length, `seed ${seed}: too many messages at ${id}`).toBeLessThanOrEqual(CHAT.maxShown);
          for (const m of talk.shown) {
            expect(m.until, `seed ${seed}: an expired message is still up`).toBeGreaterThan(now);
            expect(m.at).toBeLessThanOrEqual(now);
          }
          if (talk.typing) typingSeats.add(id);
        }
        maxTyping = Math.max(maxTyping, typingSeats.size);
        // Only one bot is ever typing at a time.
        expect(typingSeats.size, `seed ${seed}: two bots typing at once`).toBeLessThanOrEqual(1);
        const due = lane.nextDue(now);
        const wake = Math.min(due ?? Infinity, next < pushes.length ? pushes[next].at : Infinity);
        expect(Number.isFinite(wake) || lane.idle, `seed ${seed}: stuck with work and no wake-up`).toBe(true);
        now = Math.max(now + 1, wake);
        expect(++steps, `seed ${seed}: busy loop`).toBeLessThan(20_000);
      }
      expect(lane.idle, `seed ${seed}: never emptied`).toBe(true);
    }
  });

  it('keeps every message of every line up long enough to read', () => {
    let worst = Infinity;
    let worstText = '';
    for (const text of lines) {
      const beats = splitBeats(text);
      const t = beatTimes(beats);
      beats.forEach((b, i) => {
        // Up from landing until its own time is up, or until a third message pushes it out.
        const own = t[i].land + holdMs(b.text);
        const pushed = i + 2 < beats.length ? t[i + 2].land : Infinity;
        const seen = Math.min(own, pushed) - t[i].land;
        // A moment to notice it, then fast reading (25 letters a second).
        const need = readMs(b.text);
        if (seen - need < worst) {
          worst = seen - need;
          worstText = text;
        }
      });
    }
    expect(worst, `the tightest message to read is in: ${worstText}`).toBeGreaterThanOrEqual(0);
  });
});
