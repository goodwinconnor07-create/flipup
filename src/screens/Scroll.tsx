// Scroll: one full-screen card at a time. Swipe up to move on once a card is done (never before), swipe down to look
// at earlier results (not in the middle of a hand). The card in play is a real table; the pages around it are its neighbours.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { dealCard } from '../scroll/deal';
import { finish } from '../scroll/play';
import { levelOf, loadScrollHands, type ScrollHand } from '../scroll/save';
import type { CardRef } from '../scroll/types';
import { ensureCard, exitScroll, nextCard, startCard, useApp } from '../state/store';
import { reducedMotion } from '../ui/effects';
import { CloseIcon, FlameIcon } from '../ui/Icons';
import { useDesktop } from '../ui/useDesktop';
import { useWakeLock } from '../ui/useWakeLock';
import { Felt } from './Table';
import { Intro, Result } from './scroll/Cards';

/** Matches the page slide in scroll.css. */
const SLIDE_MS = 360;
/** How far a drag has to go to count as a swipe. */
const SWIPE = 70;

const sameRef = (a: CardRef | null | undefined, b: CardRef | null | undefined) => !!a && !!b && a.id === b.id && a.seed === b.seed;
const keyOf = (r: CardRef) => `${r.id}:${r.seed}`;

type Page =
  { kind: 'past'; key: string; hand: ScrollHand } | { kind: 'live'; key: string; ref: CardRef } | { kind: 'up'; key: string; ref: CardRef };

export function Scroll() {
  const run = useApp((s) => s.session?.scroll);
  const game = useApp((s) => s.game);
  const save = useApp((s) => s.scroll);
  const desktop = useDesktop();
  useWakeLock(true);
  // The table for the card is set up the moment the screen opens (or comes back after a normal game replaced it).
  useEffect(() => {
    if (!run) ensureCard();
  }, [run]);

  const [past, setPast] = useState<ScrollHand[]>(() =>
    loadScrollHands()
      .filter((h) => !sameRef(h.ref, run?.ref ?? save.current))
      .slice(-5),
  );
  const [index, setIndex] = useState(past.length);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const busy = useRef(false);

  const pages = useMemo<Page[]>(() => {
    const out: Page[] = past.map((hand) => ({ kind: 'past', key: `past:${keyOf(hand.ref)}`, hand }));
    if (run) out.push({ kind: 'live', key: keyOf(run.ref), ref: run.ref });
    if (run?.over && save.upcoming) out.push({ kind: 'up', key: keyOf(save.upcoming), ref: save.upcoming });
    return out;
  }, [past, run?.ref.id, run?.ref.seed, run?.over, save.upcoming?.id, save.upcoming?.seed]);

  const liveAt = past.length;
  const at = Math.min(index, Math.max(0, pages.length - 1));
  // In the middle of a hand nothing moves; before Start you can still look back; once it's done you can go either way.
  const playing = at === liveAt && !!run?.started && !run.over;
  const canUp = !busy.current && !(at === liveAt && !run?.over) && at < pages.length - 1;
  const canDown = !busy.current && !playing && at > 0;

  /** From the finished card to the next one: slide up, then make the next card the live one in place. */
  const advance = useCallback(() => {
    if (busy.current || !run?.over) return;
    busy.current = true;
    setIndex(liveAt + 1);
    setTimeout(
      () => {
        const done = loadScrollHands().find((h) => sameRef(h.ref, run.ref));
        const t = dealCard(run.ref).template;
        const fallback: ScrollHand = {
          key: keyOf(run.ref),
          ref: run.ref,
          theme: t.theme,
          title: t.title,
          at: Date.now(),
          outcome: run.over ?? finish(t, run.decisions, { net: 0, showdown: false, weak: false }),
          decisions: run.decisions,
          heroId: '',
          record: null,
        };
        // The finished card becomes a page behind; the next one takes its place on screen without moving.
        setPast((p) => [...p, done ?? fallback].slice(-12));
        nextCard();
        busy.current = false;
      },
      reducedMotion() ? 0 : SLIDE_MS,
    );
  }, [run, liveAt]);

  const step = useCallback(
    (delta: 1 | -1) => {
      if (busy.current) return;
      if (delta === 1) {
        if (at === liveAt && run?.over && save.upcoming) advance();
        else if (at < liveAt) setIndex(at + 1);
      } else if (!playing && at > 0) setIndex(at - 1);
    },
    [at, liveAt, run?.over, save.upcoming, advance, playing],
  );

  // Swiping with a finger or a mouse, scrolling the wheel and the arrow keys.
  const start = useRef<{ y: number; id: number; moved: boolean; body: HTMLElement | null; top: number } | null>(null);
  const dragged = useRef(false);
  const swipeable = canUp || canDown;
  const onDown = (e: PointerEvent) => {
    if (!swipeable) return;
    // A panel with more in it than fits scrolls with the finger; the page only moves when the drag starts elsewhere.
    const body = (e.target as Element).closest<HTMLElement>('.result-body');
    start.current = {
      y: e.clientY,
      id: e.pointerId,
      moved: false,
      body: body && body.scrollHeight > body.clientHeight + 1 ? body : null,
      top: body?.scrollTop ?? 0,
    };
  };
  const onMove = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const d = e.clientY - s.y;
    if (!s.moved && Math.abs(d) > 10) {
      s.moved = true;
      if (!s.body) {
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(s.id);
      }
    }
    if (!s.moved) return;
    if (s.body) s.body.scrollTop = s.top - d;
    else setDy(Math.max(canUp ? -220 : 0, Math.min(canDown ? 220 : 0, d)));
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    if (!s?.moved) return;
    dragged.current = true;
    setTimeout(() => (dragged.current = false), 0);
    if (s.body) return;
    setDragging(false);
    const d = dy;
    setDy(0);
    if (d <= -SWIPE) step(1);
    else if (d >= SWIPE) step(-1);
  };
  const wheelAt = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') step(1);
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const level = levelOf(save.stars);
  const view = (i: number): CSSProperties => ({
    transform: `translateY(calc(${(i - at) * 100}% + ${dy}px))`,
    transition: dragging ? 'none' : undefined,
  });

  return (
    <div className={`scroll-screen${desktop ? ' desk' : ''}`}>
      <header className="scroll-head">
        <button type="button" className="icon-btn press" aria-label="Close Scroll" onClick={exitScroll}>
          <CloseIcon />
        </button>
        <div className="scroll-level" aria-label={`Level ${level.level}, ${level.name}`}>
          <span>
            <b>Level {level.level}</b>
            <small>{level.name}</small>
          </span>
          <i className="scroll-bar" aria-hidden>
            <span style={{ width: `${level.span ? Math.round((level.into / level.span) * 100) : 100}%` }} />
          </i>
        </div>
        <span className={`scroll-combo${save.combo >= 2 ? ' lit' : ''}`} aria-label={`${save.combo} in a row`}>
          <FlameIcon width={20} height={20} />
          <b>{save.combo}</b>
        </span>
      </header>

      <div
        className="scroll-pager"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) < 30 || Date.now() - wheelAt.current < 700) return;
          wheelAt.current = Date.now();
          step(e.deltaY > 0 ? 1 : -1);
        }}
        onClickCapture={(e) => {
          if (dragged.current) e.stopPropagation();
        }}
      >
        {pages.map((p, i) =>
          Math.abs(i - at) > 1 ? null : (
            <section
              key={p.key}
              className={`scroll-page ${p.kind}${i === at && swipeable ? ' swipeable' : ''}`}
              style={view(i)}
              aria-hidden={i !== at}
              inert={i !== at}
              {...(i === at ? { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp } : {})}
            >
              {p.kind === 'past' ? (
                <Result card={p.hand.ref} decisions={p.hand.decisions} outcome={p.hand.outcome} past />
              ) : (
                <>
                  <div className="scroll-table">{p.kind === 'live' && run && game && <Felt game={game} bare />}</div>
                  {(p.kind === 'up' || (run && !run.started)) && (
                    <Intro
                      key={i === at ? 'here' : 'away'}
                      card={p.kind === 'up' ? p.ref : run!.ref}
                      number={save.cards + 1}
                      live={p.kind === 'live' && i === at}
                      onStart={startCard}
                    />
                  )}
                  {p.kind === 'live' && run?.over && (
                    <Result card={run.ref} decisions={run.decisions} outcome={run.over} onNext={save.upcoming ? advance : undefined} />
                  )}
                </>
              )}
            </section>
          ),
        )}
      </div>
    </div>
  );
}
