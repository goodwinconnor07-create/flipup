// The words a friend gets when you invite them from your contacts or share a link: their first name, your
// and your table's code and link when you're setting one up. Pure, tested in
// tests/invite-message.test.ts.
import { APP_INFO } from '../../appInfo';

/** The link a message carries: your table's join link, or the app's page. */
export const inviteLink = (code?: string | null) => (code ? `${APP_INFO.apiOrigin}/${code}` : APP_INFO.apiOrigin);

export function inviteMessage({
  first,
  code,
}: {
  first?: string | null;
  code?: string | null;
}): string {
  const hi = first?.trim() ? `Hey ${first.trim()}!` : 'Hey!';
  if (code) return `${hi} I've got a poker table going on FlipUp. Jump in with code ${code}: ${inviteLink(code)}`;
  return `${hi} Come play poker with me on FlipUp. It's free with friends. ${inviteLink()}`;
}

/**
 * The message for sharing a table's code from the table itself: who's hosting and what's being played, so a group
 * chat can see at a glance ("Connor's table · Crazy Pineapple"), then the code and the link.
 */
export function tableShareMessage({ host, game, code }: { host?: string | null; game?: string | null; code: string }): string {
  const who = host?.trim() ? `${host.trim()}'s table` : 'A poker table';
  const title = [who, game?.trim()].filter(Boolean).join(' · ');
  return `${title}\nJoin on FlipUp with code ${code}: ${inviteLink(code)}`;
}
