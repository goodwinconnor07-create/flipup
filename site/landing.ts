// FlipUp's website: the landing page, the join page a game link lands on (/ACES42, /party/ACES42) when the app isn't
// installed, and the waitlist form. The game itself is only in the iPhone app.
import './landing.css';

/** The App Store page. Set LAUNCHED to true once FlipUp is live there: the badge then takes the waitlist's place. */
const LAUNCHED = false;
const APP_STORE_URL = 'https://apps.apple.com/app/id6829639428';

/** Game names by id (src/game/variants.ts), for the join page's "Connor's table · Crazy Deuces". */
const GAMES: Record<string, string> = {
  holdem: "Texas Hold'em",
  pineapple: 'Crazy Pineapple',
  deuces: 'Crazy Deuces',
  ghost: 'Haunted Pot',
  pittsburgh: 'Pittsburgh',
  dice: 'Die on the River',
  redriver: 'Red River',
  crucifix: 'Crucifix',
  circle: 'Round the Clock',
  memory: 'Memory Poker',
  beanstalk: 'Bean Stalk',
  bjholdem: 'Hit Me',
  power: 'Power Cards',
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** A table code is six letters or numbers, or one of the older five consonants (src/game/ids.ts). */
const CODE = /^([A-Z0-9]{6}|[BCDFGHJKLMNPQRSTVWXZ]{5})$/;

function joinTarget(path: string): { code: string; party: boolean } | null {
  const m = /^\/(party\/)?([A-Za-z0-9]{5,6})\/?$/.exec(path);
  if (!m) return null;
  const code = m[2].toUpperCase();
  return CODE.test(code) ? { code, party: !!m[1] } : null;
}

/** The waitlist form, or the App Store badge once FlipUp is out. */
function getTheApp(slot: HTMLElement): void {
  if (LAUNCHED) {
    const a = document.createElement('a');
    a.className = 'button light';
    a.href = APP_STORE_URL;
    a.textContent = 'Get it on the App Store';
    slot.replaceChildren(a);
    return;
  }
  const tpl = $<HTMLTemplateElement>('waitlist');
  const form = (tpl.content.firstElementChild as HTMLFormElement).cloneNode(true) as HTMLFormElement;
  const input = form.querySelector<HTMLInputElement>('input[type=email]')!;
  const trap = form.querySelector<HTMLInputElement>('input[name=company]')!;
  const button = form.querySelector<HTMLButtonElement>('button')!;
  const note = form.querySelector<HTMLParagraphElement>('.note')!;
  const id = `email-${slot.id}`;
  input.id = id;
  form.querySelector('label')!.htmlFor = id;
  const say = (text: string, tone: '' | 'ok' | 'bad') => {
    note.textContent = text;
    note.className = `note ${tone}`;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      say('That email doesn’t look right.', 'bad');
      input.focus();
      return;
    }
    button.disabled = true;
    say('Sending…', '');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, company: trap.value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
      form.classList.add('done');
      say(`Check ${email} and tap the link to confirm.`, 'ok');
    } catch (err) {
      say(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'No connection. Try again.', 'bad');
      button.disabled = false;
    }
  });
  slot.replaceChildren(form);
}

/** After the confirm or leave link in an email: a short note at the top, and the address bar tidied. */
function waitlistBanner(): void {
  const params = new URLSearchParams(location.search);
  const said: Record<string, string> = {
    confirmed: "You're on the list. We'll email you once, the day FlipUp is on the App Store.",
    expired: 'That link has expired. Sign up again below and we’ll send a fresh one.',
    left: "You're off the list, and we've deleted your address.",
  };
  const text = said[params.get('waitlist') ?? ''];
  if (!text) return;
  const box = document.createElement('div');
  box.className = 'banner';
  box.setAttribute('role', 'status');
  const p = document.createElement('p');
  p.textContent = text;
  box.append(p);
  document.querySelector('.top')!.after(box);
  history.replaceState(null, '', location.pathname);
}

async function showJoin(code: string, party: boolean): Promise<void> {
  $('home').hidden = true;
  $('join').hidden = false;
  document.title = `Join ${code} · FlipUp`;
  $('join-kind').textContent = party ? "You're invited to a party" : "You're invited to a table";
  $('join-code').replaceChildren(
    ...code.split('').map((ch) => {
      const s = document.createElement('span');
      s.textContent = ch;
      return s;
    }),
  );
  $('join-code').setAttribute('aria-label', `Game code ${code.split('').join(' ')}`);
  $<HTMLAnchorElement>('join-open').href = party ? `flipup://party/${code}` : `flipup://${code}`;

  const get = $('join-get');
  const h = document.createElement('h2');
  h.textContent = LAUNCHED ? 'No app yet?' : 'FlipUp is coming soon to iPhone';
  const p = document.createElement('p');
  p.textContent = LAUNCHED ? 'Get FlipUp, then open this link again.' : 'Leave your email and we’ll tell you the day it’s out.';
  const slot = document.createElement('div');
  slot.id = 'get-join';
  get.replaceChildren(h, p, slot);
  getTheApp(slot);

  if (party) return;
  const who = $('join-who');
  try {
    const res = await fetch(`/api/tables/${code}`);
    if (!res.ok) {
      who.textContent = res.status === 404 ? 'This table has closed, or the code is wrong.' : '';
      return;
    }
    const info = (await res.json()) as { hostName?: string; settings?: { variant?: string }; players?: unknown[] };
    const game = GAMES[info.settings?.variant ?? 'holdem'] ?? "Texas Hold'em";
    const b = document.createElement('b');
    b.textContent = info.hostName ? `${info.hostName}'s table` : 'A table';
    const count = info.players?.length ?? 0;
    who.replaceChildren(b, ` · ${game}${count ? ` · ${count} seated` : ''}`);
  } catch {
    // No signal: the code and the buttons are enough.
  }
}

const target = joinTarget(location.pathname);
if (target) void showJoin(target.code, target.party);
else {
  getTheApp($('get'));
  getTheApp($('get-2'));
  waitlistBanner();
}

// The old web app registered a service worker; public/sw.js now removes itself, and this asks for the new one.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => void r.update()), () => {});
}
