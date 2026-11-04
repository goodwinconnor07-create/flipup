// "Delete my data" (docs/APP_STORE.md, 5.1.1(v)): FlipUp has no accounts, but a friend code is a record on the
// server that others can look up, so the person can delete it and everything this phone keeps.
import { deleteFriendCard, premiumForget } from './api';
import { deviceId } from './device';
import { resetEntitlement } from './entitlement';
import { myPalCode } from './pals';
import { leaveParty, loadPartyRef } from './party';
import { leaveTable, resetSessionIdentity } from './session';
import { wipeAll } from './storage';

/**
 * Deletes the friend code on the server (only this phone may), leaves any party or table, then wipes every
 * `flipup.*` value on the phone, the device ID and friends list included. Premium stays: Apple keeps that record and
 * Restore brings it back anyway. Throws, and deletes nothing on the phone, if the server can't be reached while
 * there's a friend code to delete.
 */
export async function deleteMyData(): Promise<void> {
  const code = myPalCode();
  if (code) await deleteFriendCard(code, deviceId());
  const party = loadPartyRef();
  if (party) await leaveParty(party.code);
  leaveTable();
  // The server forgets this phone's Premium pass. If it can't be reached the pass just runs out in a week, and the
  // phone gets a new device id below, so nothing stays linked to it.
  await premiumForget().catch(() => 0);
  resetEntitlement();
  wipeAll(['flipup.premium']);
  resetSessionIdentity();
}
