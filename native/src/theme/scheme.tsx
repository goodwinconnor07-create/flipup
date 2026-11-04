// Light or dark for a part of the screen. Most screens follow the phone's appearance; a page drawn on a dark
// background of its own (the grain pages: Play with friends) wraps itself in <ForceScheme scheme="dark"> so its
// cells, text, shadows and SwiftUI controls come out dark even when the phone is in light mode.
import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export type Scheme = 'light' | 'dark';

const Forced = createContext<Scheme | null>(null);

export function ForceScheme({ scheme, children }: { scheme: Scheme; children: ReactNode }) {
  return <Forced.Provider value={scheme}>{children}</Forced.Provider>;
}

/** The scheme a page has forced, or null when it follows the phone. */
export const useForcedScheme = (): Scheme | null => useContext(Forced);

/** The scheme to draw in here: a forced one, or the phone's. */
export function useScheme(): Scheme {
  const forced = useContext(Forced);
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  return forced ?? system;
}
