// Table sounds, made with the Web Audio API so there are no files to download.
// Browsers only allow sound after a tap, so the audio context wakes up on the first touch.

export type SoundName = 'deal' | 'flip' | 'chip' | 'chips' | 'allin' | 'check' | 'fold' | 'turn' | 'tick' | 'win' | 'collect' | 'pop';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;

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
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + dur);
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
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
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
  osc.frequency.value = freq;
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
    case 'chip':
      clink(c, t);
      clink(c, t + 0.07, 0.14);
      break;
    case 'chips':
      for (let i = 0; i < 4; i++) clink(c, t + i * 0.065 + Math.random() * 0.015, 0.2 - i * 0.025);
      break;
    case 'allin':
      for (let i = 0; i < 9; i++) clink(c, t + i * 0.055 + Math.random() * 0.025, 0.22);
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
    case 'pop':
      tone(c, t, 0.1, 520, 880, 0.18, 'triangle');
      break;
  }
}
