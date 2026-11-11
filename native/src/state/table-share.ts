import { variantInfo, type Game } from '@/engine';

import { joinLink } from './api';
import { tableShareMessage } from './invite-message';

/** What sharing a table's code sends: "Connor's table · Crazy Pineapple", the code and the link. */
export function tableShare(game: Game | null, code: string): { message: string; url: string } {
  const host = game?.players.find((p) => p.deviceId === game.hostDeviceId)?.name;
  const name = game ? variantInfo(game.settings.variant ?? 'holdem').name : null;
  return { message: tableShareMessage({ host, game: name, code }), url: joinLink(code) };
}
