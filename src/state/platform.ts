// Where the server is. On the website the page and the server share one address, so paths stay
// relative. A build that runs somewhere else (a future iPhone app) sets VITE_SERVER_URL.

const SERVER = (import.meta.env.VITE_SERVER_URL ?? '').replace(/\/$/, '');

/** A server path ("/api/...") as a URL fetch can use. */
export function apiUrl(path: string): string {
  return `${SERVER}${path}`;
}

/** A server path as a WebSocket URL. */
export function socketUrl(path: string): string {
  if (SERVER) return SERVER.replace(/^http/, 'ws') + path;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}${path}`;
}

/** The public web address, for links people share. */
export function publicOrigin(): string {
  return SERVER || location.origin;
}

/** The join link for a table: flipup.example/ABCDE. */
export function joinLink(code: string): string {
  return `${publicOrigin()}/${code}`;
}

/** The same link without https://, for showing on screen. */
export function joinLinkLabel(code: string): string {
  return joinLink(code).replace(/^https?:\/\//, '');
}
