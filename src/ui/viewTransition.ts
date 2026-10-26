import { flushSync } from 'react-dom';
import { motionOff } from './effects';

type WithTransitions = Document & { startViewTransition?: (update: () => void | Promise<void>) => { finished: Promise<unknown> } };

/** The browser can cross-fade between two states of the page (Chromium and Safari 18). Not with Reduce Motion. */
export function canTransition(): boolean {
  return typeof document !== 'undefined' && typeof (document as WithTransitions).startViewTransition === 'function' && !motionOff();
}

/**
 * Runs a change to the screen inside a view transition: the browser keeps a picture of the page as it was, applies
 * `update`, and fades or slides between the two (about 200ms, see global.css). `html.vt` is on for the duration, which
 * is when the shared names in the CSS apply. The live page stays tappable throughout. Without the feature, or with
 * Reduce Motion, the change simply happens.
 */
export function transition(update: () => void): void {
  if (!canTransition()) return update();
  const root = document.documentElement;
  root.classList.add('vt');
  const run = (document as WithTransitions).startViewTransition!(() => flushSync(update));
  run.finished.catch(() => undefined).finally(() => root.classList.remove('vt'));
}
