// Where things are on the table, for the Demo's coach: the parts of the table that a step can light up or ask you to
// tap register here under a name (a spot), and the coach reads their place on the screen. Outside a demo a spot only
// keeps a reference to its view: nothing is measured.
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * The names a step can use. `seat:<name>` is a player's seat along the top, `discard:<card>` a card in Crazy
 * Pineapple's throw-away row.
 */
export type SpotId =
  | 'seats'
  | 'felt'
  | 'board'
  | 'mine'
  | 'act'
  | 'act.fold'
  | 'act.check'
  | 'act.call'
  | 'act.raise'
  | 'act.hit'
  | 'raise.panel'
  | 'raise.size'
  | 'raise.go'
  | 'power.card'
  | 'power.panel'
  | 'power.go'
  | 'ghost'
  | 'discard'
  | `seat:${string}`
  | `discard:${string}`;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A view's handle, as far as a spot needs it. */
type Measurable = { measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => void };
const nodes = new Map<string, Measurable>();
let rects: ReadonlyMap<string, Rect> = new Map();
let active = false;
/** What the coach reads: the places measured and the spots on screen, replaced whenever either changes. */
export interface SpotsView {
  rects: ReadonlyMap<string, Rect>;
  open: ReadonlySet<string>;
}
let view: SpotsView = { rects, open: new Set() };
const listeners = new Set<() => void>();
const emit = () => {
  view = { rects, open: new Set(nodes.keys()) };
  listeners.forEach((fn) => fn());
};

function measure(id: string, node: Measurable): void {
  if (!active) return;
  node.measureInWindow((x, y, width, height) => {
    if (!active || nodes.get(id) !== node) return;
    const old = rects.get(id);
    if (old && old.x === x && old.y === y && old.width === width && old.height === height) return;
    const next = new Map(rects);
    if (width > 0 && height > 0) next.set(id, { x, y, width, height });
    else next.delete(id);
    rects = next;
    emit();
  });
}

/** Measures every spot on screen again (after a step changes, or once things have slid into place). */
export function measureSpots(): void {
  for (const [id, node] of nodes) measure(id, node);
}

/** The coach is up: spots measure themselves from now on. Off again forgets every place. */
export function setSpotsActive(on: boolean): void {
  active = on;
  if (on) measureSpots();
  else {
    rects = new Map();
    emit();
  }
}

/** Every spot on screen and its place (window coordinates, while the coach is up). */
export function useSpots(): SpotsView {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => view,
  );
}

/**
 * Marks a part of the table as a spot. It wraps its children in a plain view, so give it the layout the children
 * had (`style`). Without an id it draws the children as they are.
 */
export function Spot({ id, style, children }: { id: SpotId | undefined; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const node = useRef<Measurable | null>(null);
  useEffect(() => {
    if (!id) return;
    const n = node.current;
    if (n) {
      nodes.set(id, n);
      measure(id, n);
      emit();
    }
    return () => {
      if (nodes.get(id) !== n) return;
      nodes.delete(id);
      if (rects.has(id)) {
        const next = new Map(rects);
        next.delete(id);
        rects = next;
      }
      emit();
    };
  }, [id]);
  if (!id) return <>{children}</>;
  return (
    <View
      ref={node as never}
      collapsable={false}
      style={style}
      onLayout={() => {
        if (node.current) measure(id, node.current);
      }}
    >
      {children}
    </View>
  );
}
