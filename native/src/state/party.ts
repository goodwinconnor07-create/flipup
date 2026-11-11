// The party this phone is in, as on the web (src/state/party.ts): which one, and the calls that change it. The
// party screens poll `readParty`. The party itself lives on the server (a PartyRoom per code).
import { cleanName, type PartySettings, type PartyView } from '@/engine';

import { createPartyOnServer, fetchParty, partyAct } from './api';
import { deviceId } from './device';
import { myPalCode } from './pals';
import { read, save, useStored } from './storage';

const KEY = 'flipup.party';

export interface PartyRef {
  code: string;
  at: number;
}

const valid = (r: PartyRef | null): PartyRef | null => (r && typeof r.code === 'string' ? r : null);
export const loadPartyRef = (): PartyRef | null => valid(read<PartyRef | null>(KEY, null));
export const usePartyRef = (): PartyRef | null => valid(useStored<PartyRef | null>(KEY, null));

export const forgetParty = (): void => save(KEY, null);
const remember = (code: string): void => save(KEY, { code, at: Date.now() });

const who = () => {
  const p = read<{ name?: string; emoji?: string } | null>('flipup.profile', null) ?? {};
  const friendCode = myPalCode();
  return { deviceId: deviceId(), name: cleanName(p.name ?? ''), emoji: p.emoji ?? '', ...(friendCode ? { friendCode } : {}) };
};

export async function createParty(settings: PartySettings): Promise<string> {
  const code = await createPartyOnServer({ ...who(), settings });
  remember(code);
  return code;
}

export async function joinParty(code: string): Promise<PartyView> {
  const view = await partyAct(code, 'join', who());
  remember(code);
  return view;
}

/** The host changes the playlist and rules while the party is still a lobby. */
export const configureParty = (code: string, settings: PartySettings): Promise<PartyView> => partyAct(code, 'settings', { deviceId: deviceId(), settings });

export const readParty = (code: string): Promise<PartyView | null> => fetchParty(code, deviceId());
export const startParty = (code: string): Promise<PartyView> => partyAct(code, 'start', { deviceId: deviceId() });
export const skipBreak = (code: string): Promise<PartyView> => partyAct(code, 'skip', { deviceId: deviceId() });

export async function leaveParty(code: string): Promise<void> {
  forgetParty();
  try {
    await partyAct(code, 'leave', { deviceId: deviceId() });
  } catch {
    // Already gone, or offline: either way this phone is out.
  }
}
