import { seededRng } from '../game/cards';
import { isPersonality, type PersonalityId } from './personalities';

export interface BotProfile {
  version: 1;
  generatorVersion: 'latent-1';
  botId: string;
  personality?: PersonalityId;
  seed: number;
  createdAt: string;
  latent: { discipline: number; pressure: number };
  traits: { aggression: number; curiosity: number; riverCaution: number; adaptation: number };
}

export function validateProfile(p: BotProfile): void {
  if (
    p.version !== 1 ||
    p.generatorVersion !== 'latent-1' ||
    typeof p.botId !== 'string' ||
    !p.botId ||
    (p.personality !== undefined && !isPersonality(p.personality)) ||
    !Number.isSafeInteger(p.seed) ||
    !Number.isFinite(Date.parse(p.createdAt)) ||
    [p.latent?.discipline, p.latent?.pressure].some((x) => !Number.isFinite(x) || Math.abs(x) > 1) ||
    [p.traits?.aggression, p.traits?.curiosity, p.traits?.riverCaution, p.traits?.adaptation].some(
      (x) => !Number.isFinite(x) || x < 0 || x > 1,
    )
  )
    throw new Error('Invalid profile');
}

/** Correlated factors; numeric diversity is not a claim of human calibration. */
export class BotFactory {
  generate(botId: string, seed: number, createdAt = '2026-11-09T00:00:00.000Z'): BotProfile {
    const r = seededRng(seed);
    const discipline = r() * 2 - 1,
      pressure = r() * 2 - 1;
    const p: BotProfile = {
      version: 1,
      generatorVersion: 'latent-1',
      botId,
      seed,
      createdAt,
      latent: { discipline, pressure },
      traits: {
        aggression: 0.5 + pressure * 0.25,
        curiosity: 0.5 - discipline * 0.2 + pressure * 0.1,
        riverCaution: 0.5 + discipline * 0.25,
        adaptation: 0.5 + discipline * 0.2,
      },
    };
    validateProfile(p);
    return p;
  }
}

export const BOT_001 = new BotFactory().generate('BOT_001', 1001);
