import { variantInfo, type Game } from '@/engine';

import { joinLink } from './api';

/** The words a host shares: "Connor's table · Crazy Pineapple", then the code and the link. */
export function tableShareMessage({ host, game, code }: { host?: string | null; game?: string | null; code: string }): string {
  const who = host?.trim() ? `${host.trim()}'s table` : 'A poker table';
  const title = [who, game?.trim()].filter(Boolean).join(' · ');
  return `${title}\nJoin on FlipUp with code ${code}: ${joinLink(code)}`;
}

/** What sharing a table's code sends: "Connor's table · Crazy Pineapple", the code and the link. */
export function tableShare(game: Game | null, code: string): { message: string; url: string } {
  const host = game?.players.find((p) => p.deviceId === game.hostDeviceId)?.name;
  const name = game ? variantInfo(game.settings.variant ?? 'holdem').name : null;
  return { message: tableShareMessage({ host, game: name, code }), url: joinLink(code) };
}
