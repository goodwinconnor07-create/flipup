// The words a friend gets when you invite them from your contacts or share a link: their first name, your
// username if you have one, and your table's code and link when you're setting one up. Pure, tested in
// tests/invite-message.test.ts.
import { APP_INFO } from '../../appInfo';

/** The link a message carries: your table's join link, or the app's page. */
export const inviteLink = (code?: string | null) => (code ? `${APP_INFO.apiOrigin}/${code}` : APP_INFO.apiOrigin);

export function inviteMessage({
  first,
  username,
  code,
}: {
  first?: string | null;
  username?: string | null;
  code?: string | null;
}): string {
  const hi = first?.trim() ? `Hey ${first.trim()}!` : 'Hey!';
  const me = username ? ` I'm @${username}.` : '';
  if (code) return `${hi} I've got a poker table going on FlipUp. Jump in with code ${code}: ${inviteLink(code)}${me}`;
  return `${hi} Come play poker with me on FlipUp. It's free with friends.${me} ${inviteLink()}`;
}
