// Bot Lab (Settings > Bot Lab): the bots you made, kept on this phone (`flipup.botlab`, at most `MAX_LAB_BOTS`).
// Each is a name, a face and its dials (src/game/botLab.ts); seating one sends `addBot` with `lab`, and the table
// plays its dials through the bots' brain. Nothing about them is on the server until you seat one.
import { DEFAULT_DIALS, LAB_FACES, MAX_LAB_BOTS, parseDials, type LabBotSpec, type LabDials } from '@/engine';

import { read, save, useStored } from './storage';

export interface LabBot {
  id: string;
  name: string;
  emoji: string;
  dials: LabDials;
  /** When it was made, so the list keeps its order. */
  made: number;
}

const KEY = 'flipup.botlab';

/** Only well-formed bots: a save from another version, or a broken one, never reaches the screens. */
const clean = (v: unknown): LabBot[] =>
  Array.isArray(v)
    ? v.flatMap((b) => {
        if (typeof b !== 'object' || b === null) return [];
        const r = b as Record<string, unknown>;
        const dials = parseDials(r.dials);
        if (typeof r.id !== 'string' || typeof r.name !== 'string' || typeof r.emoji !== 'string' || !dials) return [];
        return [{ id: r.id, name: r.name, emoji: r.emoji, dials, made: typeof r.made === 'number' ? r.made : 0 }];
      })
    : [];

export const labBots = (): LabBot[] => clean(read<unknown>(KEY, []));
export const useLabBots = (): LabBot[] => clean(useStored<unknown>(KEY, []));
export const labBot = (id: string | undefined): LabBot | undefined => (id ? labBots().find((b) => b.id === id) : undefined);

/** Adds a bot or updates one with the same id. False when the lab is full. */
export function saveLabBot(bot: LabBot): boolean {
  const have = labBots();
  const at = have.findIndex((b) => b.id === bot.id);
  if (at < 0 && have.length >= MAX_LAB_BOTS) return false;
  save(KEY, at < 0 ? [...have, bot] : have.map((b) => (b.id === bot.id ? bot : b)));
  return true;
}

export function deleteLabBot(id: string): void {
  save(KEY, labBots().filter((b) => b.id !== id));
}

/** Puts a deleted bot back where it was (Undo). */
export function restoreLabBot(bot: LabBot, at: number): void {
  const have = labBots().filter((b) => b.id !== bot.id);
  if (have.length >= MAX_LAB_BOTS) return;
  save(KEY, [...have.slice(0, at), bot, ...have.slice(at)]);
}

/** A fresh bot for the editor: the middle of every dial, and a face none of your bots wear yet. */
export function newLabBot(): LabBot {
  const worn = new Set(labBots().map((b) => b.emoji));
  const faces = LAB_FACES.filter((f) => !worn.has(f));
  const pool = faces.length ? faces : LAB_FACES;
  return { id: `lab${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, name: '', emoji: pool[Math.floor(Math.random() * pool.length)], dials: { ...DEFAULT_DIALS }, made: Date.now() };
}

/** What a table needs to seat it. */
export const labSpec = (b: LabBot): LabBotSpec => ({ name: b.name, emoji: b.emoji, dials: b.dials });
