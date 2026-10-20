import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type CSSProperties, type ReactNode } from 'react';
import {
  cardName,
  EMOJIS,
  firstEmoji,
  isNameBlocked,
  LIMITS,
  NAME_BLOCKED,
  rankLabel,
  SUIT_SYMBOL,
  suitOf,
  type Card,
  type Position,
} from '../game';
import { back, closeSheet, useApp } from '../state/store';
import { haptic, reducedMotion } from './effects';
import { BackIcon, CloseIcon, PencilIcon } from './Icons';

/** 1,240 */
export function chips(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// ── Players ─────────────────────────────────────────────────────────────────

/** A player's picture: just their emoji, big, like a sticker. */
/** One emoji, in whatever design the device draws. */
export function Emoji({ emoji }: { emoji: string; size?: number }) {
  return <>{emoji}</>;
}

export function Avatar({ emoji, size = 48, className = '' }: { emoji: string; size?: number; className?: string }) {
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: size * 0.82 }} aria-hidden>
      <Emoji emoji={emoji} size={Math.round(size * 0.82)} />
    </span>
  );
}

/** The name step: a big emoji that opens the picker, and a name box under it. */
export function NameAndPicture({
  name,
  emoji,
  onName,
  onPicture,
  onDone,
}: {
  name: string;
  emoji: string;
  onName: (name: string) => void;
  onPicture: () => void;
  onDone?: () => void;
}) {
  return (
    <div className="hero-pic">
      <button type="button" className="avatar-button" aria-label="Change your emoji" onClick={onPicture}>
        <span key={emoji} className="hero-pop">
          <span className="hero-float">
            <Avatar emoji={emoji} size={132} />
            <span className="hero-edit-badge" aria-hidden>
              <PencilIcon width={20} height={20} />
            </span>
          </span>
        </span>
      </button>
      <div className="name-box">
        <input
          className="field name-field"
          value={name}
          placeholder="Your name"
          aria-label="Your name"
          maxLength={LIMITS.maxNameLength}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="done"
          autoFocus={!name.trim()}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.currentTarget.blur();
            onDone?.();
          }}
        />
        {isNameBlocked(name) && (
          <p className="field-error" role="alert">
            {NAME_BLOCKED}
          </p>
        )}
      </div>
    </div>
  );
}

/** A grid of emojis to pick from, plus a box to type any emoji at all. */
export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [typed, setTyped] = useState('');
  const custom = !(EMOJIS as readonly string[]).includes(value);
  return (
    <div className="emoji-picker">
      <div className="emoji-grid" role="radiogroup" aria-label="Emoji">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={value === e}
            aria-label={e}
            className={`emoji-option press${value === e ? ' on' : ''}`}
            onClick={() => {
              haptic('light');
              onChange(e);
            }}
          >
            <Emoji emoji={e} size={30} />
          </button>
        ))}
      </div>
      <label className="emoji-custom">
        <span className={`emoji-custom-pic${custom ? ' on' : ''}`} aria-hidden>
          {custom ? <Emoji emoji={value} size={30} /> : '＋'}
        </span>
        <input
          className="field"
          value={typed}
          placeholder="Or type any emoji"
          aria-label="Type any emoji"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            const found = firstEmoji(e.target.value);
            setTyped(found ?? '');
            if (found) {
              haptic('light');
              onChange(found);
            }
          }}
        />
      </label>
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────

export type CardSize = 'xl' | 'lg' | 'md' | 'sm';

/**
 * A playing card: big rank in the corner, suit under it, like the cards in a real deck's index.
 * `back` shows the back (a card we can't see). `dim` greys a card that isn't part of the best hand.
 */
export function PlayingCard({
  card,
  size = 'lg',
  dim = false,
  glow = false,
  back: showBack = false,
  flip = false,
  delay = 0,
  className = '',
  style,
}: {
  style?: CSSProperties;
  card?: Card;
  size?: CardSize;
  dim?: boolean;
  /** Part of the winning hand at showdown: lifts and gets a gold edge. */
  glow?: boolean;
  back?: boolean;
  /** Flip over as it appears. */
  flip?: boolean;
  delay?: number;
  className?: string;
}) {
  if (showBack || !card) {
    return <span className={`pcard pcard-${size} pcard-back ${className}`} style={style} aria-label="Face-down card" role="img" />;
  }
  // A four-colour deck: spades black, hearts red, diamonds blue, clubs green.
  const suit = suitOf(card);
  return (
    <span
      className={`pcard pcard-${size} suit-${suit}${dim ? ' dim' : ''}${glow ? ' glow' : ''}${flip ? ' flip-in' : ''} ${className}`}
      style={flip ? { ...style, animationDelay: `${delay}ms` } : style}
      role="img"
      aria-label={cardName(card)}
    >
      <span className="pcard-rank">{rankLabel(card)}</span>
      <span className="pcard-suit">{SUIT_SYMBOL[suitOf(card)]}</span>
    </span>
  );
}

/** Log text with cards written like [Ah]: the cards come out as small coloured "A♥". */
export function CardText({ text }: { text: string }) {
  const parts = text.split(/(\[[2-9TJQKA][shdc]\])/);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[2-9TJQKA][shdc]\]$/.test(p) ? (
          <span key={i} className={`card-chip suit-${p[2]}`} aria-label={cardName(p.slice(1, 3))}>
            {rankLabel(p.slice(1, 3))}
            {SUIT_SYMBOL[p[2] as 's']}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** An empty place on the board where a card will go. */
export function CardSlot({ size = 'lg' }: { size?: CardSize }) {
  return <span className={`pcard pcard-${size} pcard-slot`} aria-hidden />;
}

// ── Bits ────────────────────────────────────────────────────────────────────

/** Simple top bar with a back button. */
export function BackBar({ title, right, onBack = back }: { title?: ReactNode; right?: ReactNode; onBack?: () => void }) {
  return (
    <div className="topbar">
      <button type="button" className="icon-btn press" aria-label="Back" onClick={onBack}>
        <BackIcon />
      </button>
      <div className="topbar-title h3">{title}</div>
      {right}
    </div>
  );
}

export function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="toggle-row"
      onClick={() => {
        haptic('light');
        onChange(!on);
      }}
    >
      <span className="toggle-text">
        <b>{label}</b>
        {hint && <small className="muted">{hint}</small>}
      </span>
      <span className={`toggle${on ? ' on' : ''}`} aria-hidden />
    </button>
  );
}

/** A row of choices, one picked. */
export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  format = String,
  columns,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  format?: (value: T) => string;
  /** Wrap the options into this many columns instead of one row. */
  columns?: number;
}) {
  return (
    <div className="choice">
      <p className="section-title">{label}</p>
      <div
        className={`choice-row${columns ? ' wrap' : ''}`}
        style={columns ? { ['--cols' as string]: columns } : undefined}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={o === value}
            className={`choice-option press${o === value ? ' on' : ''}`}
            onClick={() => {
              haptic('light');
              onChange(o);
            }}
          >
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Sheet({ title, children, onClose = closeSheet }: { title?: ReactNode; children: ReactNode; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const leaving = useApp((s) => s.sheetLeaving);
  const drag = useRef<{ startY: number; dy: number } | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  // Swipe down on the grip or title to close. Past 90px it closes; otherwise it springs back.
  const onDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { startY: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ref.current?.classList.add('dragging');
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    const el = ref.current;
    if (!d || !el) return;
    el.classList.remove('dragging');
    if (d.dy > 90) {
      el.style.setProperty('--drag', `${d.dy}px`);
      onClose();
    }
    el.style.transform = '';
  };
  const dragProps = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };

  return (
    <div className={`sheet-backdrop${leaving ? ' leaving' : ''}`} onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip-zone" {...dragProps}>
          <div className="sheet-grip" />
        </div>
        {title && (
          <div className="sheet-head" {...dragProps}>
            <h2 className="h2" style={{ flex: 1 }}>
              {title}
            </h2>
            <button type="button" className="icon-btn press" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="center" style={{ gap: 12, padding: 24 }} role="status">
      <span className="spinner" aria-hidden />
      {label && <span className="muted">{label}</span>}
    </div>
  );
}

/**
 * A number that counts to its new value instead of jumping: chips going into the pot, or a stack
 * growing after a win. Fast (about half a second), and skipped with Reduce Motion.
 */
export function useCountUp(target: number, ms = 600): { value: number; dir: 'up' | 'down' | null } {
  const [value, setValue] = useState(target);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const shown = useRef(target);
  useEffect(() => {
    if (shown.current === target) return;
    if (reducedMotion()) {
      shown.current = target;
      setValue(target);
      return;
    }
    const from = shown.current;
    const start = performance.now();
    setDir(target > from ? 'up' : 'down');
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      shown.current = t >= 1 ? target : Math.round(from + (target - from) * eased);
      setValue(shown.current);
      if (t < 1) raf = requestAnimationFrame(frame);
      else setDir(null);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return { value, dir };
}

/** Chips as text that counts up or down (green while rising, red while falling). */
export function Count({ value, className = '' }: { value: number; className?: string }) {
  const { value: v, dir } = useCountUp(value);
  return <span className={`count num ${dir ?? ''} ${className}`}>{chips(v)}</span>;
}

/** Dealer button and blinds, beside a player's picture. */
export function PositionChips({ pos }: { pos: Position | null }) {
  if (!pos) return null;
  return (
    <span className="pos-chips">
      <span className={`pos-chip pos-${pos.kind}`} title={`Position: ${pos.label}`} aria-label={`Position ${pos.label}`}>
        {pos.label}
      </span>
    </span>
  );
}

/** Ticks once a second (or faster) while mounted, for countdowns. */
export function useNow(every = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}
