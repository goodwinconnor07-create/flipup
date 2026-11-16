// "Delete my data" (docs/APP_STORE.md, 5.1.1(v)): FlipUp has no accounts, but the server ties a random device id to
// a Premium purchase and to any table or party the phone is in, so the person can end all of that and wipe the phone.
import { premiumForget } from './api';
import { resetEntitlement } from './entitlement';
import { leaveParty, loadPartyRef } from './party';
import { leaveTable, resetSessionIdentity } from './session';
import { wipeAll } from './storage';

/**
 * Leaves any party or table, has the server forget which purchase this phone is tied to, then wipes every `flipup.*`
 * value on the phone, the device ID included. Premium stays: Apple keeps that record and Restore brings it back.
 */
export async function deleteMyData(): Promise<void> {
  const party = loadPartyRef();
  if (party) await leaveParty(party.code);
  leaveTable();
  // The server forgets which purchase this phone is tied to. If it can't be reached, the phone still gets a new
  // device id below, so nothing stays linked to it.
  await premiumForget().catch(() => 0);
  resetEntitlement();
  wipeAll(['flipup.premium']);
  resetSessionIdentity();
}
