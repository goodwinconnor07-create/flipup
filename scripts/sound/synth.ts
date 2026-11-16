// Table sounds, made with the Web Audio API so there are no files to download.
// Browsers only allow sound after a tap, so the audio context wakes up on the first touch.

export type SoundName =
  | 'deal'
  | 'flip'
  | 'shuffle'
  | 'place'
  | 'chip'
  | 'chips'
  | 'allin'
  | 'check'
  | 'fold'
  | 'turn'
  | 'tick'
  | 'win'
  | 'collect'
  | 'pop'
  | 'build0'
  | 'build1'
  | 'build2'
  | 'victory'
  /** The mini games' own moments (see gameThemes.ts). */
  | 'spook'
  | 'dice'
  | 'sting'
  | 'splash'
  /** The roulette wheel and the prize reel spinning, each slowing to a stop. */
  | 'wheel'
  | 'reel';

/** Recorded sounds. Anything not listed here is made in code. */
const SAMPLES: Partial<Record<SoundName, string>> = {
  allin: '/sounds/all-in.mp3',
  chip: '/sounds/betting-calling.mp3',
  place: '/sounds/card-placed.mp3',
  shuffle: '/sounds/cards-shuffled.mp3',
};
const buffers = new Map<string, AudioBuffer>();
let loading = false;

/** Fetches and decodes the recorded sounds once (they're tiny). Until they arrive, nothing plays for them. */
function loadSamples(c: AudioContext): void {
  if (loading) return;
  loading = true;
  for (const url of new Set(Object.values(SAMPLES))) {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => new Promise<AudioBuffer>((ok, fail) => c.decodeAudioData(data, ok, fail)))
      .then((buf) => buffers.set(url, buf))
      .catch(() => undefined);
  }
}

/** Plays a recorded sound, a touch different each time (pitch) so repeats don't sound like a loop. */
function sample(c: AudioContext, url: string, at: number, gain = 0.85, rate = 1): void {
  const buf = buffers.get(url);
  if (!buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate * pitch * (0.97 + Math.random() * 0.06);
  const env = c.createGain();
  env.gain.value = gain;
  src.connect(env).connect(master!);
  src.start(at);
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
/** Each game pitches the table's sounds: low and heavy for the ghost, bright for the pineapple. */
let pitch = 1;

export function setSoundMood(value: number): void {
  pitch = value;
}

export function setMuted(value: boolean): void {
  muted = value;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      loadSamples(ctx);
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Call once: the first tap or key press unlocks sound (iPhones need this). */
export function installSoundUnlock(): void {
  const unlock = () => {
    const c = audio();
    if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
  };
  for (const type of ['pointerdown', 'touchend', 'keydown'] as const) document.addEventListener(type, unlock, { passive: true });
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** A short burst of filtered noise: card flicks, swishes. */
function hiss(c: AudioContext, at: number, dur: number, from: number, to: number, gain: number, q = 1): void {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from * pitch, at);
  filter.frequency.exponentialRampToValueAtTime(to * pitch, at + dur);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.012, dur / 3));
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(env).connect(master!);
  src.start(at, Math.random() * 0.5, dur + 0.05);
}

/** A short pitched blip: knocks, dings, chip clicks. */
function tone(c: AudioContext, at: number, dur: number, from: number, to: number, gain: number, type: OscillatorType = 'sine'): void {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from * pitch, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to * pitch, at + dur);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(env).connect(master!);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** A tone that dies away almost at once: the ring of something hard being tapped. */
function ring(c: AudioContext, at: number, freq: number, decay: number, gain: number): void {
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq * pitch;
  const env = c.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(env).connect(master!);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/**
 * One poker chip landing on another. A clay chip is a quick "clack": a few ringing partials that
 * aren't in tune with each other (that's what makes it sound like a solid object, not a beep) and
 * a soft low knock under them. No noise in it, so nothing scratchy.
 */
function clink(c: AudioContext, at: number, gain = 0.2): void {
  const base = 1500 + Math.random() * 500;
  ring(c, at, base, 0.055, gain);
  ring(c, at, base * 2.41, 0.04, gain * 0.7);
  ring(c, at, base * 3.97, 0.026, gain * 0.4);
  // The body of the chip: a short low thud.
  const thud = c.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(420 + Math.random() * 80, at);
  thud.frequency.exponentialRampToValueAtTime(180, at + 0.03);
  const env = c.createGain();
  env.gain.setValueAtTime(gain * 1.3, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
  thud.connect(env).connect(master!);
  thud.start(at);
  thud.stop(at + 0.06);
}

export function playSound(name: SoundName, offsetMs = 0): void {
  if (muted) return;
  const c = audio();
  if (!c || !master) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  const t = c.currentTime + 0.01 + offsetMs / 1000;
  switch (name) {
    case 'deal':
      hiss(c, t, 0.09, 3800, 1500, 0.34, 0.9);
      tone(c, t, 0.05, 220, 140, 0.08);
      break;
    case 'flip':
      hiss(c, t, 0.12, 2600, 1100, 0.26, 0.8);
      break;
    case 'shuffle':
      sample(c, SAMPLES.shuffle!, t, 0.8);
      break;
    case 'place':
      sample(c, SAMPLES.place!, t, 0.8);
      break;
    case 'chip':
      sample(c, SAMPLES.chip!, t);
      break;
    case 'chips':
      // A bigger bet: the chips go down twice.
      sample(c, SAMPLES.chip!, t);
      sample(c, SAMPLES.chip!, t + 0.18, 0.7, 1.06);
      break;
    case 'allin':
      sample(c, SAMPLES.allin!, t, 0.95);
      break;
    case 'check':
      tone(c, t, 0.09, 190, 90, 0.4);
      tone(c, t + 0.11, 0.09, 190, 90, 0.34);
      break;
    case 'fold':
      hiss(c, t, 0.26, 2200, 380, 0.3, 0.7);
      break;
    case 'turn':
      tone(c, t, 0.16, 880, 880, 0.2, 'triangle');
      tone(c, t + 0.1, 0.3, 1318, 1318, 0.18, 'triangle');
      break;
    case 'tick':
      tone(c, t, 0.05, 1100, 1000, 0.14);
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(c, t + i * 0.09, 0.32, f, f, 0.18, 'triangle'));
      for (let i = 0; i < 6; i++) clink(c, t + 0.1 + i * 0.06, 0.16);
      break;
    case 'collect':
      for (let i = 0; i < 5; i++) clink(c, t + i * 0.05, 0.14);
      break;
    case 'build0':
    case 'build1':
    case 'build2': {
      // Each reveal on the winners' page is a drum roll that climbs a little higher than the last.
      const level = name === 'build0' ? 0 : name === 'build1' ? 1 : 2;
      const len = 0.55 + level * 0.15;
      const hits = 9 + level * 4;
      for (let i = 0; i < hits; i++) {
        const k = i / (hits - 1);
        hiss(c, t + k * len, 0.07, 3200, 1800, 0.12 + k * 0.2 + level * 0.04, 0.8);
        tone(c, t + k * len, 0.06, 150, 90, 0.1 + k * 0.1);
      }
      const from = 220 * Math.pow(1.26, level * 2);
      tone(c, t, len + 0.1, from, from * 1.9, 0.08 + level * 0.02, 'triangle');
      // The last hit of the roll: a cymbal tap.
      hiss(c, t + len, 0.35, 7000, 5000, 0.14 + level * 0.04, 1.2);
      break;
    }
    case 'victory': {
      // A short fanfare: a rising run into a held major chord, with a cymbal wash and chips pouring.
      hiss(c, t, 1.4, 8000, 4500, 0.22, 0.6);
      [392, 494, 587, 784].forEach((f, i) => {
        tone(c, t + i * 0.11, 0.22, f, f, 0.16, 'sawtooth');
        tone(c, t + i * 0.11, 0.22, f * 2, f * 2, 0.07, 'triangle');
      });
      [523, 659, 784, 1046].forEach((f) => {
        tone(c, t + 0.5, 1.5, f, f, 0.12, 'sawtooth');
        tone(c, t + 0.5, 1.5, f / 2, f / 2, 0.08, 'triangle');
      });
      for (let i = 0; i < 14; i++) sample(c, SAMPLES.chip!, t + 0.55 + i * 0.07 + Math.random() * 0.03, 0.4, 1 + Math.random() * 0.15);
      break;
    }
    case 'pop':
      tone(c, t, 0.1, 520, 880, 0.18, 'triangle');
      break;
    case 'spook':
      // A low wobbling moan under a cold breath.
      hiss(c, t, 0.9, 900, 300, 0.2, 0.6);
      tone(c, t, 0.9, 150, 95, 0.16, 'sawtooth');
      tone(c, t + 0.05, 0.9, 158, 90, 0.1, 'triangle');
      break;
    case 'dice':
      // A handful of knocks as the die tumbles, then it settles.
      for (let i = 0; i < 6; i++) {
        const k = i / 5;
        tone(c, t + k * k * 0.55, 0.05, 260 + Math.random() * 120, 120, 0.2 * (1 - k * 0.5));
        hiss(c, t + k * k * 0.55, 0.04, 3000, 1600, 0.1, 1);
      }
      break;
    case 'sting':
      // Two low notes, a half step apart: something isn't right.
      tone(c, t, 0.5, 196, 196, 0.16, 'sawtooth');
      tone(c, t, 0.5, 208, 208, 0.12, 'sawtooth');
      tone(c, t + 0.02, 0.5, 98, 98, 0.12, 'triangle');
      break;
    case 'splash':
      hiss(c, t, 0.5, 1800, 500, 0.3, 0.5);
      tone(c, t, 0.25, 330, 120, 0.14);
      break;
    case 'wheel': {
      // The wheel whirring, and the ball knocking over the pockets less often until it drops in.
      const len = 4.1;
      hiss(c, t, len, 1400, 300, 0.1, 0.5);
      const hits = 38;
      for (let i = 0; i < hits; i++) {
        const at = t + len * (1 - Math.pow(1 - i / hits, 2.2));
        const soft = 1 - (i / hits) * 0.4;
        ring(c, at, 2200 + Math.random() * 500, 0.04, 0.12 * soft);
        tone(c, at, 0.03, 700, 300, 0.1 * soft);
      }
      // Into the pocket: a last clack and a short rattle.
      const end = t + len + 0.05;
      ring(c, end, 1800, 0.08, 0.2);
      tone(c, end, 0.05, 520, 220, 0.18);
      ring(c, end + 0.09, 2300, 0.05, 0.1);
      break;
    }
    case 'reel': {
      // Slot-style ticks that stretch out as the reel slows, then a bright stop.
      const len = 1.7;
      const hits = 18;
      for (let i = 0; i < hits; i++) {
        const at = t + len * (1 - Math.pow(1 - i / hits, 2));
        tone(c, at, 0.04, 1500 - i * 25, 1100 - i * 20, 0.12);
      }
      tone(c, t + len + 0.05, 0.08, 880, 880, 0.14, 'triangle');
      break;
    }
  }
}
