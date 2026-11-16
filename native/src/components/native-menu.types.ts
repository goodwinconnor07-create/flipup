import type { ReactNode } from 'react';

/** One row of a `NativeMenu`. Titles and values are plain strings; `symbol` is an SF Symbols name. */
export type MenuItem =
  /** Opens something: the title, a value and a chevron. */
  | { kind: 'link'; id: string; title: string; detail?: string; subtitle?: string; symbol?: string; onPress: () => void; trailingCrown?: boolean; chevron?: boolean; detailTint?: boolean }
  /** An action in the tint colour (red when `destructive`), no chevron. */
  | { kind: 'button'; id: string; title: string; symbol?: string; onPress?: () => void; destructive?: boolean; subtitle?: string; busy?: boolean }
  | { kind: 'toggle'; id: string; title: string; subtitle?: string; symbol?: string; value: boolean; onChange: (on: boolean) => void }
  /** The title at the start and a segmented control at the end (or under it when `stacked`). */
  | { kind: 'segmented'; id: string; title: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void; stacked?: boolean; note?: string }
  /** The title at the start and a pop-up menu of choices at the end. */
  | { kind: 'picker'; id: string; title: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void }
  /** The title, its current value and Apple's − / + stepper. */
  | { kind: 'stepper'; id: string; title: string; detail: string; value: number; min: number; max: number; onChange: (value: number) => void }
  /** A title and a grey value, nothing to tap. */
  | { kind: 'value'; id: string; title: string; detail: string }
  /** A glyph, a bold line and a grey paragraph (What's New). */
  | { kind: 'info'; id: string; title: string; text: string; symbol: string }
  /** A question that opens its answer under it (Help). */
  | { kind: 'faq'; id: string; title: string; text: string };

export type MenuGroup = { id: string; header?: string; footer?: string; items: readonly (MenuItem | false | null | undefined)[] };

export type NativeMenuProps = {
  groups: readonly MenuGroup[];
  /** Drawn above the list, outside its scrolling (a profile's face, a table preview). */
  top?: ReactNode;
  /** Let the page behind show through the list's background (the profile's blue glow). */
  transparent?: boolean;
};
