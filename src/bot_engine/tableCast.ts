import { hashString, seededRng } from '../game/cards';
import { everydayProfile, EVERYDAY_FOCUSES, focusForName, type BotDifficulty, type EverydayFocus } from './everyday';
import type { BotProfile } from './identity';
export interface TableCast {
  version: 'table-cast-1';
  focuses: Record<string, EverydayFocus>;
}
/** Assign once, balance custom rosters too, and retain seated identities when someone joins. */
export function tableCast(tableId: string, players: { id: string; name: string }[], old?: TableCast): TableCast {
  const focuses: Record<string, EverydayFocus> = {};
  const counts = EVERYDAY_FOCUSES.map(() => 0);
  for (const p of players)
    if (old && Object.hasOwn(old.focuses, p.id) && EVERYDAY_FOCUSES.includes(old.focuses[p.id])) {
      Object.defineProperty(focuses, p.id, { value: old.focuses[p.id], enumerable: true });
      counts[EVERYDAY_FOCUSES.indexOf(old.focuses[p.id])]++;
    }
  const ordered = players
    .filter((p) => !Object.hasOwn(focuses, p.id))
    .sort((a, b) => hashString(`${tableId}:${a.id}`) - hashString(`${tableId}:${b.id}`));
  for (const p of ordered) {
    const minimum = Math.min(...counts),
      preferred = focusForName(p.name);
    const options = EVERYDAY_FOCUSES.filter((_, k) => counts[k] === minimum);
    const focus = options.includes(preferred) ? preferred : options[hashString(`${tableId}:${p.id}:focus`) % options.length];
    Object.defineProperty(focuses, p.id, { value: focus, enumerable: true });
    counts[EVERYDAY_FOCUSES.indexOf(focus)]++;
  }
  return { version: 'table-cast-1', focuses };
}
/** Own instance seed only: never derive an opponent's profile inside a policy. */
export function tableInstanceSeed(tableId: string, botId: string): number {
  return hashString(`table-identity-1:${tableId}:${botId}`);
}
export function tableProfile(base: BotProfile, name: string, difficulty: BotDifficulty, tableId: string, focus: EverydayFocus): BotProfile {
  const p = everydayProfile(base, name, difficulty, focus),
    seed = tableInstanceSeed(tableId, base.botId),
    rng = seededRng(seed);
  const micro = () => (rng() - 0.5) * 0.08;
  return {
    ...p,
    seed,
    everyday: { ...p.everyday!, tempo: 0.9 + rng() * 0.2 },
    traits: {
      aggression: 0.5 + (focus === 'patient' ? -0.06 : focus === 'pressure' ? 0.06 : 0) + micro(),
      curiosity: 0.5 + (focus === 'curious' ? 0.07 : focus === 'patient' ? -0.04 : 0) + micro(),
      riverCaution: 0.5 + (focus === 'patient' ? 0.06 : 0) + micro(),
      adaptation: 0.55 + micro(),
    },
  };
}
