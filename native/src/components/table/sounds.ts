// The table's sounds: the web's own. The four recordings come from public/sounds; the rest are the web's
// synthesised sounds rendered to files by scripts/renderSounds.mjs, so both apps sound the same.
// Sounds mix with the person's music and stay quiet when the phone's silent switch is on.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { isMuted } from '@/state/prefs';

export type SoundName = 'deal' | 'flip' | 'shuffle' | 'place' | 'chip' | 'chips' | 'allin' | 'check' | 'fold' | 'turn' | 'tick' | 'win' | 'collect' | 'pop' | 'spook' | 'dice' | 'sting' | 'splash';

const FILES = {
  allin: require('../../../assets/sounds/all-in.mp3'),
  bet: require('../../../assets/sounds/betting-calling.mp3'),
  'chip-1': require('../../../assets/sounds/chip-1.wav'),
  'chip-2': require('../../../assets/sounds/chip-2.wav'),
  'chip-3': require('../../../assets/sounds/chip-3.wav'),
  'place-1': require('../../../assets/sounds/place-1.wav'),
  'place-2': require('../../../assets/sounds/place-2.wav'),
  'place-3': require('../../../assets/sounds/place-3.wav'),
  shuffle: require('../../../assets/sounds/cards-shuffled.mp3'),
  deal: require('../../../assets/sounds/deal.wav'),
  flip: require('../../../assets/sounds/flip.wav'),
  check: require('../../../assets/sounds/check.wav'),
  fold: require('../../../assets/sounds/fold.wav'),
  turn: require('../../../assets/sounds/turn.wav'),
  tick: require('../../../assets/sounds/tick.wav'),
  win: require('../../../assets/sounds/win.wav'),
  collect: require('../../../assets/sounds/collect.wav'),
  pop: require('../../../assets/sounds/pop.wav'),
  spook: require('../../../assets/sounds/spook.wav'),
  dice: require('../../../assets/sounds/dice.wav'),
  sting: require('../../../assets/sounds/sting.wav'),
  splash: require('../../../assets/sounds/splash.wav'),
} as const satisfies Record<string, number>;
type File = keyof typeof FILES;

/** Two players per sound, so a sound can start again before the last one has finished. */
const pools = new Map<File, { players: AudioPlayer[]; next: number }>();
let ready = false;
/** Each game pitches the table's sounds (gameArt.ts `pitch`). */
let pitch = 1;

export function setSoundMood(value: number): void {
  pitch = value;
}

function player(file: File): AudioPlayer | null {
  if (!ready) {
    ready = true;
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
  }
  let pool = pools.get(file);
  if (!pool) {
    try {
      pool = { players: [createAudioPlayer(FILES[file]), createAudioPlayer(FILES[file])], next: 0 };
    } catch {
      return null;
    }
    pools.set(file, pool);
  }
  const p = pool.players[pool.next];
  pool.next = (pool.next + 1) % pool.players.length;
  return p;
}

function play(file: File, volume = 1, rate = 1): void {
  const p = player(file);
  if (!p) return;
  try {
    p.volume = volume;
    p.shouldCorrectPitch = false;
    // A touch different each time, so repeats don't sound like a loop.
    p.setPlaybackRate(rate * pitch * (0.97 + Math.random() * 0.06));
    void p.seekTo(0);
    p.play();
  } catch {
    // A sound that fails to play is skipped.
  }
}

/** One of a sound's three recorded takes, never the same one twice running. */
const lastTake: Record<string, number> = {};
function take(kind: 'chip' | 'place'): File {
  let n = 1 + Math.floor(Math.random() * 3);
  if (n === lastTake[kind]) n = (n % 3) + 1;
  lastTake[kind] = n;
  return `${kind}-${n}` as File;
}

/** Plays a table sound, `offsetMs` from now. Nothing plays while muted. */
export function playSound(name: SoundName, offsetMs = 0): void {
  if (isMuted()) return;
  const go = () => {
    if (name === 'chip') play(take('chip'), 0.85);
    else if (name === 'place') play(take('place'), 0.8);
    else if (name === 'chips') {
      // A bigger bet: a handful of chips, then one more lands on top.
      play('bet', 0.8);
      setTimeout(() => play(take('chip'), 0.7, 1.06), 180);
    } else play(name, name === 'allin' ? 0.95 : 0.8);
  };
  if (offsetMs > 0) setTimeout(go, offsetMs);
  else go();
}

/** A speaker's own pitch: the same bot always sounds the same, from a hash of its id (0.9 to 1.5). */
function voicePitch(who: string): number {
  let h = 0;
  for (let i = 0; i < who.length; i++) h = (h * 31 + who.charCodeAt(i)) >>> 0;
  return 0.9 + (h % 7) * 0.1;
}

/** A tiny, quiet tick as a word of a bot's line comes through its bubble, pitched per bot (the Animalese trick). Nothing while muted. */
export function playBlip(who: string): void {
  if (isMuted()) return;
  play('tick', 0.09, voicePitch(who) * 1.5);
}
