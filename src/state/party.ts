// The party this phone is in: which one, and the calls that change it. The screens poll `fetchParty`.

import { cleanName, type PartySettings, type PartyView } from '../game';
import { createPartyOnServer, fetchParty, partyAct } from './api';
import { myPalCode } from './pals';
import { loadDeviceId, loadProfile, read, write } from './persist';

const KEY = 'flipup.party';

export interface PartyRef {
  code: string;
  at: number;
}

export function loadPartyRef(): PartyRef | null {
  const r = read<PartyRef>(KEY);
  return r && typeof r.code === 'string' ? r : null;
}

export const forgetParty = (): void => write(KEY, null);
const remember = (code: string): void => write(KEY, { code, at: Date.now() });

const who = () => {
  const { name, emoji } = loadProfile();
  return { deviceId: loadDeviceId(), name: cleanName(name), emoji, ...(myPalCode() ? { friendCode: myPalCode() } : {}), };
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

export const readParty = (code: string): Promise<PartyView | null> => fetchParty(code, loadDeviceId());
export const startParty = (code: string): Promise<PartyView> => partyAct(code, 'start', { deviceId: loadDeviceId() });
export const skipBreak = (code: string): Promise<PartyView> => partyAct(code, 'skip', { deviceId: loadDeviceId() });

export async function leaveParty(code: string): Promise<void> {
  forgetParty();
  try {
    await partyAct(code, 'leave', { deviceId: loadDeviceId() });
  } catch {
    // Already gone, or offline: either way this phone is out.
  }
}
