import type { ReactElement } from 'react';
import type { SFSymbol } from 'sf-symbols-typescript';

export interface MenuItem {
  title: string;
  /** An SF Symbol beside the title (iPhone only; the web list shows titles). */
  symbol?: SFSymbol;
  destructive?: boolean;
  onPress: () => void;
}

export type MenuProps = {
  /** Groups of items, with a line between groups, top to bottom. */
  sections: MenuItem[][];
  /** A title over the items (a friend's name). */
  title?: string;
  /** What you tap: drawn as is. Keep it free of its own buttons; the menu takes the tap. */
  children: ReactElement;
  /** Read by VoiceOver for the trigger. */
  label: string;
  /** Stretch the trigger to the width it's given (a list row) instead of fitting its content. */
  fill?: boolean;
};
