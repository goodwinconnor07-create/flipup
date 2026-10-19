import { CONFETTI_COLORS } from './theme';
// Instant feedback: haptics, tap ripples and confetti. All of it is skipped
// when the phone asks for reduced motion, and none of it blocks the game.

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

/** A tap on the phone: vibrate on Android browsers (iPhone browsers ignore it). */
export function haptic(kind: HapticKind = 'light'): void {
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    // Not supported.
  }
}

/** One listener for the whole app: every .btn gets a ripple from the touch point and a tiny buzz. */
export function installPressEffects(): void {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>('.btn, .press');
      if (!target || target.hasAttribute('disabled')) return;
      haptic('light');
      if (reducedMotion()) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      target.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
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

const WIPE_GROW_MS = 380;

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
    meta.setAttribute('content', colour ?? (dark ? '#0e0f14' : '#ffffff'));
  }
}
const WIPE_FADE_MS = 280;

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
