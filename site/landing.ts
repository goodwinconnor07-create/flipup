// FlipUp's website: the landing page, the join page a game link lands on (/ACES42, /party/ACES42) when the app isn't
// installed, and the waitlist form. The game itself is only in the iPhone app.
import './landing.css';
// Every game's picture as SVG (written by store/scripts/game-art.ts): the 13 in the app and the 9 parked ones.
import ALL_GAMES from '../store/scripts/games-22.json';

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
  document.querySelector('.top-wrap')!.after(box);
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

/** The 13 games in the app. The rest of games-22.json is parked (parked/games/) and shows as "In the works". */
const LIVE = new Set(['holdem', 'pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'crucifix', 'circle', 'memory', 'beanstalk', 'bjholdem', 'power']);
/** A real table screenshot for each game that has one (public/shots, shot on a simulator for the app's old How to Play). */
const SHOT = new Set([...LIVE, 'imposter']);
/** Each game's hook and mood line (src/design/gameArt.ts, and parked/games/src/design/gameArt.ts for the parked). */
const WORDS: Record<string, [string, string]> = {
  holdem: ['The classic', 'No-limit Texas Hold’em. Your felt, your rules.'],
  pineapple: ['Throw one away', 'Three hole cards. After the flop you throw one away.'],
  deuces: ['Every 2 is wild', 'Wild cards, loud colours. Five of a kind beats everything.'],
  ghost: ['Beat the ghost', 'A ghost plays every hand and keeps what it wins. Beat it for the lot.'],
  pittsburgh: ['Three rivers', 'Three rivers come down at once. Your best one counts.'],
  dice: ['A die swaps a card', 'The river lands, a die rolls, and the board can change.'],
  redriver: ['Red keeps dealing', 'The river runs red. Keep dealing until it stops.'],
  crucifix: ['Read the cross', 'Nine cards in a cross. Your hand is one line of it.'],
  circle: ['Round the clock', 'Six cards round a clock. Use three in a row.'],
  memory: ['Remember the 20', 'Twenty cards flash up and leave the deck. Remember which.'],
  beanstalk: ['Your hand grows', 'Everyone still in gets another hole card each street.'],
  bjholdem: ['Hit, then bet', 'Hit or stand. Half the pot for the best hand, half for closest to 21.'],
  power: ['Secret powers', 'Everyone gets a secret power each hand. Pick your moment.'],
  imposter: ['Find the imposter', 'Everyone has the same two cards but one. Trust nobody.'],
  missions: ['Secret missions', 'Your mission, should you choose to accept it.'],
  slide: ['Slide a card left', 'Nothing stays yours for long. Pass it on.'],
  headband: ['A card on your head', 'Everyone knows your card. Except you.'],
  belt: ['The board moves', 'One card in, one card off. Keep up.'],
  onion: ['Peel a card a street', 'Peel it back, one layer at a time.'],
  chain: ['A linked board', 'Every card links to the last. Watch it snowball.'],
  elevator: ['The board climbs', 'Going up. Every card climbs a floor.'],
  plo: ['Two boards, five cards', 'Five cards, two boards, two halves of every pot.'],
};

interface GameArt { id: string; name: string; field: string; svg: string }
const GAMES_ART = ALL_GAMES as GameArt[];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

/** The tap-to-see card under the belt. */
function showGame(id: string): void {
  const g = GAMES_ART.find((x) => x.id === id);
  if (!g) return;
  const card = $('game-card');
  const live = LIVE.has(id);
  const [hook, mood] = WORDS[id] ?? ['', ''];
  const tile = $('game-tile');
  tile.style.background = g.field;
  tile.innerHTML = g.svg;
  $('game-name').textContent = g.name;
  const tag = $('game-tag');
  tag.textContent = id === 'holdem' ? 'Free in the app' : live ? 'In the app · Premium' : 'In the works';
  tag.className = `tag ${live ? 'live' : 'soon'}`;
  $('game-hook').textContent = hook;
  $('game-mood').textContent = mood;
  const shot = $('game-shot');
  const img = shot.querySelector('img')!;
  if (SHOT.has(id)) {
    img.src = `/shots/${id}.webp`;
    img.alt = `A ${g.name} table in FlipUp.`;
    shot.hidden = false;
  } else {
    shot.hidden = true;
  }
  card.classList.toggle('no-shot', !SHOT.has(id));
  card.classList.remove('in');
  void card.offsetWidth;
  card.classList.add('in');
  document.querySelectorAll<HTMLElement>('.belt .t').forEach((t) => t.classList.toggle('on', t.dataset.g === id));
}

/** Two rows of game pictures sliding in opposite directions. Drag (or swipe, or scroll sideways) to move them; they
 *  carry on with the flick's speed and ease back to their slow drift. A tap opens the game's card. Under Reduce
 *  Motion they stand still until moved. */
function gameBelt(): void {
  const belt = $('belt');
  const rows = [...belt.querySelectorAll<HTMLElement>('.belt-row')];
  const orders = [GAMES_ART, [...GAMES_ART.slice(11), ...GAMES_ART.slice(0, 11)].reverse()];
  const state = rows.map((row, i) => {
    const tiles = orders[i];
    const make = (g: GameArt, copy: number) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `t${LIVE.has(g.id) ? '' : ' soon'}`;
      b.dataset.g = g.id;
      b.style.background = g.field;
      b.innerHTML = g.svg + `<span>${g.name}</span>`;
      if (copy) {
        b.tabIndex = -1;
        b.setAttribute('aria-hidden', 'true');
      } else b.setAttribute('aria-label', `${g.name}${LIVE.has(g.id) ? '' : ', in the works'}`);
      return b;
    };
    row.replaceChildren(...[0, 1, 2].flatMap((c) => tiles.map((g) => make(g, c))));
    return { row, dir: Number(row.dataset.dir), x: 0, v: 0, span: 0 };
  });
  const measure = () => state.forEach((s) => {
    const first = s.row.children[0] as HTMLElement;
    const again = s.row.children[GAMES_ART.length] as HTMLElement;
    s.span = again.offsetLeft - first.offsetLeft;
    if (!s.x) s.x = s.dir > 0 ? s.span * 0.35 : s.span * 0.1;
  });
  measure();
  addEventListener('resize', measure);

  const DRIFT = 28; // px a second
  let hovering = false, dragging: { s: (typeof state)[number]; lastX: number; lastT: number; moved: number } | null = null;
  let visible = true, last = performance.now();
  const wrap = (s: (typeof state)[number]) => {
    if (s.span) s.x = ((s.x % s.span) + s.span) % s.span;
    s.row.style.transform = `translate3d(${-s.x}px,0,0)`;
  };
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const s of state) {
      if (dragging?.s === s) continue;
      const drift = reduceMotion.matches || hovering ? 0 : DRIFT * s.dir * -1;
      // A flick's speed eases back to the drift (about 0.6s), never past it.
      s.v += (drift - s.v) * Math.min(1, dt * 3.2);
      s.x += s.v * dt;
      wrap(s);
    }
    if (visible) requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting && !document.hidden;
    if (visible && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }).observe(belt);
  requestAnimationFrame(frame);

  belt.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
  belt.addEventListener('pointerleave', () => { hovering = false; });
  state.forEach((s) => {
    s.row.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = { s, lastX: e.clientX, lastT: performance.now(), moved: 0 };
      s.v = 0;
    });
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.lastX;
    const now = performance.now();
    dragging.moved += Math.abs(dx);
    if (dragging.moved > 6) {
      dragging.s.row.setPointerCapture?.(e.pointerId);
      belt.classList.add('grabbing');
    }
    dragging.s.x -= dx;
    const v = (-dx / Math.max(1, now - dragging.lastT)) * 1000;
    dragging.s.v = dragging.s.v * 0.6 + v * 0.4;
    dragging.lastX = e.clientX;
    dragging.lastT = now;
    wrap(dragging.s);
  });
  const end = () => {
    if (!dragging) return;
    const { s, moved } = dragging;
    if (moved > 6) {
      // Swallow the click that ends a drag.
      s.row.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, { capture: true, once: true });
    }
    s.v = Math.max(-3000, Math.min(3000, s.v));
    dragging = null;
    belt.classList.remove('grabbing');
  };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  belt.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    const s = state[(e.target as HTMLElement).closest('.belt-row') === rows[1] ? 1 : 0];
    s.x += e.deltaX;
    s.v = 0;
    wrap(s);
  }, { passive: false });
  belt.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.t');
    if (!t?.dataset.g) return;
    showGame(t.dataset.g);
    $('game-card').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
  });
  // Keyboard: a focused tile is brought into view by the browser; keep the row from drifting away from it.
  belt.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    const s = state.find((x) => x.row.contains(t));
    if (!s) return;
    s.x = t.offsetLeft - belt.clientWidth / 2 + t.offsetWidth / 2;
    s.v = 0;
    wrap(s);
    belt.scrollLeft = 0;
  });
  belt.addEventListener('focusin', () => { hovering = true; });
  belt.addEventListener('focusout', () => { hovering = false; });
  showGame('holdem');
}

/** The App Store screenshots: a row that snaps, with arrows and dots. */
function storeShots(): void {
  const track = $('slides');
  const slides = [...track.children] as HTMLElement[];
  const dots = $('dots');
  dots.replaceChildren(...slides.map(() => document.createElement('i')));
  const step = () => (slides[1]?.offsetLeft ?? 0) - (slides[0]?.offsetLeft ?? 0);
  const prev = $<HTMLButtonElement>('shots-prev');
  const next = $<HTMLButtonElement>('shots-next');
  const update = () => {
    const i = Math.round(track.scrollLeft / Math.max(1, step()));
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4;
  };
  const go = (dir: number) => track.scrollBy({ left: dir * step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}

const target = joinTarget(location.pathname);
if (target) void showJoin(target.code, target.party);
else {
  getTheApp($('get'));
  getTheApp($('get-2'));
  waitlistBanner();
  gameBelt();
  storeShots();
}

// The old web app registered a service worker; public/sw.js now removes itself, and this asks for the new one.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => void r.update()), () => {});
}
