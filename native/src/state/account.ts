// "Delete my data" (docs/APP_STORE.md, 5.1.1(v)): FlipUp has no accounts, but a friend code is a record on the
// server that others can look up, so the person can delete it and everything this phone keeps.
import { deleteFriendCard } from './api';
import { deviceId } from './device';
import { myPalCode } from './pals';
import { leaveParty, loadPartyRef } from './party';
import { leaveTable } from './session';
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
  wipeAll(['flipup.premium']);
}
