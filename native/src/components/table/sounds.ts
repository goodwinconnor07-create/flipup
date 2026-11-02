// The table's sounds: the web's own. The four recordings come from public/sounds; the rest are the web's
// synthesised sounds rendered to files by scripts/renderSounds.mjs, so both apps sound the same.
// Sounds mix with the person's music and stay quiet when the phone's silent switch is on.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { isMuted } from '@/state/prefs';

export type SoundName = 'deal' | 'flip' | 'shuffle' | 'place' | 'chip' | 'chips' | 'allin' | 'check' | 'fold' | 'turn' | 'tick' | 'win' | 'collect' | 'pop' | 'spook' | 'dice' | 'sting' | 'splash';

const FILES = {
  allin: require('../../../assets/sounds/all-in.mp3'),
  chip: require('../../../assets/sounds/betting-calling.mp3'),
  place: require('../../../assets/sounds/card-placed.mp3'),
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

/** Plays a table sound, `offsetMs` from now. Nothing plays while muted. */
export function playSound(name: SoundName, offsetMs = 0): void {
  if (isMuted()) return;
  const go = () => {
    if (name === 'chips') {
      // A bigger bet: the chips go down twice.
      play('chip');
      setTimeout(() => play('chip', 0.7, 1.06), 180);
    } else play(name, name === 'allin' ? 0.95 : name === 'chip' ? 0.85 : 0.8);
  };
  if (offsetMs > 0) setTimeout(go, offsetMs);
  else go();
}
