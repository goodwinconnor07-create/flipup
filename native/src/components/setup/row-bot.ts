// The bots a host seats on Play with bots and Play with friends: a random one from `BOTS` nobody has picked yet.
import { addedLine, balancedBotPool, botFace, botsFor, type LabBotSpec } from '@/engine';
import { labSpec, type LabBot } from '@/state/bot-lab';
import { knownBots } from '@/state/table-feel';

/** A bot seated in a lobby. `greet` is its first word, said once a moment after it sits down. */
export interface RowBot {
  key: string;
  name: string;
  emoji: string;
  greet?: string;
  /** A bot you made in Bot Lab: seated with its dials (`addBot` with `lab`), not from the roster. */
  lab?: LabBotSpec;
}

/** A Bot Lab bot as a lobby row. */
export const labRowBot = (b: LabBot): RowBot => ({ key: `lab:${b.id}:${Date.now()}`, name: b.name, emoji: b.emoji, lab: labSpec(b) });

/**
 * A random bot for the lobby: one from `BOTS` nobody has picked yet, with a face nobody at the table has (always the
 * bot face, never a picker emoji), and the line it says on sitting down, to `you` by name.
 */
export function randomBot(have: { name: string; emoji: string }[], you: string | undefined, premium = true): RowBot | null {
  const names = new Set(have.map((b) => b.name.toLowerCase()));
  const faces = new Set(have.map((b) => b.emoji));
  const free = botsFor(premium).filter((b) => !names.has(b.name.toLowerCase()));
  const fresh = free.filter((b) => !faces.has(botFace(b.emoji)));
  const pool = balancedBotPool(fresh.length ? fresh : free, have);
  if (!pool.length) return null;
  // Now and then a bot you've played before sits down again, so the regulars become people you know.
  const known = new Set(knownBots());
  const old = pool.filter((b) => known.has(b.name.toLowerCase()));
  const pick = old.length && Math.random() < 0.35 ? old[Math.floor(Math.random() * old.length)] : pool[Math.floor(Math.random() * pool.length)];
  return { key: `${pick.name}:${Date.now()}`, name: pick.name, emoji: botFace(pick.emoji), greet: addedLine(pick.style, you, Math.random).text };
}
