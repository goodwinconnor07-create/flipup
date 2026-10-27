import { CONFETTI_COLORS } from './theme';
// Instant feedback: haptics and confetti. Motion is skipped when Animations is switched off,
// and none of it blocks the game.

type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 24,
  success: [14, 50, 22],
  error: [32, 40, 32],
};

/** True only if the player switched Animations off in the menu (the computer's own setting isn't used). */
export function reducedMotion(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('calm');
}

/** The menu's Animations switch, or the phone's own Reduce Motion setting. New motion checks this one. */
export function motionOff(): boolean {
  return reducedMotion() || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export interface SpringState {
  value: number;
  /** Units per second. */
  velocity: number;
}

/** One small step of a weight on a spring pulling towards `to` (semi-implicit Euler). Critically damped at the defaults (about 0.2s to settle): it never overshoots. */
export function stepSpring({ value, velocity }: SpringState, to: number, dt: number, stiffness = 1000, damping = 64): SpringState {
  const v = velocity + (-stiffness * (value - to) - damping * velocity) * dt;
  return { value: value + v * dt, velocity: v };
}

export interface SpringHandle {
  /** Stops where it is and says where that is and how fast it was going, so a touch can take over from there. */
  stop: () => SpringState;
}

/**
 * Moves a number to `to` like a spring, from where it is and at the speed it already has. Nothing here is a
 * fixed-length animation, so stopping it and starting a new one (a finger grabbing a sheet that's still settling)
 * carries the speed through instead of restarting. Jumps straight there when motion is off.
 */
export function springTo(from: number, velocity: number, to: number, onFrame: (value: number) => void): SpringHandle {
  let state: SpringState = { value: from, velocity };
  if (motionOff() || typeof requestAnimationFrame !== 'function') {
    onFrame(to);
    return { stop: () => ({ value: to, velocity: 0 }) };
  }
  let raf = 0;
  let live = true;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    // Small fixed steps keep a stiff spring stable on a slow frame.
    for (let i = 0; i < 8; i++) state = stepSpring(state, to, dt / 8);
    if (Math.abs(state.value - to) < 0.3 && Math.abs(state.velocity) < 8) {
      state = { value: to, velocity: 0 };
      live = false;
    }
    onFrame(state.value);
    if (live) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    stop: () => {
      live = false;
      cancelAnimationFrame(raf);
      return state;
    },
  };
}

// iPhone browsers ignore navigator.vibrate, but Safari 18 and later tick the Taptic Engine when a
// switch-style checkbox flips. A hidden one, flipped through its label, gives the app its haptics there.
let tick: HTMLLabelElement | null = null;

function iosTick(): boolean {
  if (typeof document === 'undefined' || !/iP(hone|ad|od)/.test(navigator.userAgent)) return false;
  if (!tick) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    tick = document.createElement('label');
    tick.setAttribute('aria-hidden', 'true');
    Object.assign(tick.style, { position: 'fixed', left: '-100px', top: '0', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
    tick.appendChild(input);
    // Its clicks stay here, so nothing else on the page thinks it was tapped.
    tick.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(tick);
  }
  tick.click();
  return true;
}

/** A tap on the phone: the Taptic Engine on iPhone, a short buzz on Android. */
export function haptic(kind: HapticKind = 'light'): void {
  try {
    if (iosTick()) return;
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    // Not supported.
  }
}

/** One listener for the whole app: a tiny buzz on Android when a button goes down. The press itself is
 *  shown by CSS (a slight shrink and dim), the way iPhone buttons do it. iPhone haptics are kept for the
 *  moments that matter (switches, choices, your turn), as Apple's own apps do. */
export function installPressEffects(): void {
  if (/iP(hone|ad|od)/.test(navigator.userAgent)) return;
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>('.btn, .press');
      if (!target || target.hasAttribute('disabled')) return;
      navigator.vibrate?.(PATTERNS.light);
    },
    { passive: true },
  );
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  spin: number;
  angle: number;
  shape: 0 | 1;
}

export const CONFETTI = {
  ...CONFETTI_COLORS,
};

/** Short confetti burst from a point (defaults to the middle of the screen). */
export function confetti(colors: string[] = CONFETTI.party, origin?: { x: number; y: number }, amount = 90): void {
  if (reducedMotion() || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const ox = origin?.x ?? innerWidth / 2;
  const oy = origin?.y ?? innerHeight * 0.4;
  const pieces: Piece[] = Array.from({ length: amount }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 10;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 7,
      size: 7 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      spin: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI,
      shape: Math.random() < 0.5 ? 0 : 1,
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.vy += 0.38;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 1600);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (t < 1600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

const WIPE_GROW_MS = 240;

/** The button's main colour: its background colour, or the first colour of its gradient. */
function solidColour(look: CSSStyleDeclaration): string {
  const first = look.backgroundImage.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i)?.[0];
  return first ?? look.backgroundColor;
}

/**
 * Safari colours its bars by sampling the page, and only notices a full-screen fill late.
 * Telling it the colour straight away through theme-color starts its change with the fill.
 * (Not the page background: screens are see-through, so that would flash the whole page.)
 * null puts the normal white back.
 */
function tintBrowser(colour: string | null): void {
  const dark = document.documentElement.dataset.theme === 'dark';
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.setAttribute('content', colour ?? (dark ? '#000000' : '#ffffff'));
  }
}
const WIPE_FADE_MS = 200;

/**
 * Big-decision transition: the tapped button's colour grows from the touch point to fill
 * the screen, the next page swaps in underneath, then the colour fades away.
 * It never blocks taps (pointer-events: none) and is skipped with reduced motion.
 */
export function colourWipe(event: { currentTarget: Element; clientX: number; clientY: number }, then: () => void): void {
  const button = event.currentTarget as HTMLElement;
  if (reducedMotion() || typeof button.animate !== 'function') {
    then();
    return;
  }
  const box = button.getBoundingClientRect();
  // Keyboard "clicks" report 0,0: start from the button's middle instead.
  const x = event.clientX || box.left + box.width / 2;
  const y = event.clientY || box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
  const look = getComputedStyle(button);

  // A plain circle grown with transform runs on the graphics chip, so it stays smooth
  // on phones (animating clip-path repaints the whole screen every frame).
  const start = Math.min(box.width, box.height) / 2 / radius;
  const wipe = document.createElement('div');
  wipe.setAttribute('aria-hidden', 'true');
  Object.assign(wipe.style, {
    position: 'fixed',
    left: `${x - radius}px`,
    top: `${y - radius}px`,
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    borderRadius: '50%',
    zIndex: '90',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
    transform: `scale(${start})`,
    backgroundColor: look.backgroundColor,
    backgroundImage: look.backgroundImage,
  });
  document.body.appendChild(wipe);
  haptic('medium');
  tintBrowser(solidColour(look));

  const grow = wipe.animate([{ transform: `scale(${start})` }, { transform: 'scale(1)' }], {
    duration: WIPE_GROW_MS,
    easing: 'cubic-bezier(0.5, 0, 0.25, 1)',
    fill: 'forwards',
  });
  let done = false;
  const swap = () => {
    if (done) return;
    done = true;
    then();
    // Let the new page paint under the colour before fading, so the two don't compete.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        tintBrowser(null);
        void wipe
          .animate([{ opacity: 1 }, { opacity: 0 }], { duration: WIPE_FADE_MS, easing: 'ease-out', fill: 'forwards' })
          .finished.catch(() => undefined)
          .finally(() => wipe.remove());
      }),
    );
  };
  grow.finished.then(swap, swap);
  // Safety net in case the animation never reports back.
  setTimeout(swap, WIPE_GROW_MS + 200);
}

/**
 * Stops a scroll or a swipe from pressing a button. A click is dropped when the finger moved more than a few pixels
 * between touching down and lifting, when the page scrolled while it was down, or when it touched down on a page
 * that was still moving (a tap to stop a fling is not a press). Clicks from the keyboard have no touch and pass.
 */
export function installTapGuard(): void {
  let down: { x: number; y: number; touch: boolean; moving: boolean; scrolls: number } | null = null;
  // When the last few scroll events came: a fling keeps firing them, a single jump into view fires one or two.
  let recent: number[] = [];
  addEventListener('scroll', () => {
    const now = performance.now();
    recent = [...recent.filter((t) => now - t < 120), now];
    if (down) down.scrolls += 1;
  }, { capture: true, passive: true });
  addEventListener(
    'pointerdown',
    (e) => {
      const now = performance.now();
      const live = recent.filter((t) => now - t < 120).length;
      down = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', moving: live >= 3, scrolls: 0 };
    },
    { capture: true, passive: true },
  );
  addEventListener(
    'click',
    (e) => {
      const d = down;
      down = null;
      if (!d || e.detail === 0) return;
      const drag = Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10;
      // Only a finger can scroll the page and press at once; a mouse or a script can't.
      if (drag || (d.touch && (d.moving || d.scrolls >= 2))) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true,
  );
}
