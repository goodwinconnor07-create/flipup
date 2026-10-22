// Picking the next card. It stays in your level, leans towards the kinds of card you've been missing, brings back
// one you missed a while ago in a fresh deal, and doesn't deal the same kind twice running.

import { levelOf, type ScrollSave } from './save';
import { TEMPLATES } from './templates';
import type { CardRef, Template, Theme } from './types';

/** Cards between a template and its next appearance, at the least. */
const GAP = 6;
/** Cards to wait before a template you missed can come back. */
const RETURN_AFTER = 8;

/** How you've done on a theme lately, 0 to 1 (null with too few cards to say). */
export function themeForm(save: ScrollSave, theme: Theme): number | null {
  const last = save.recent.filter((r) => r.theme === theme).slice(-6);
  if (last.length < 3) return null;
  return last.reduce((a, r) => a + (r.passed ? 0.6 : 0) + (r.stars - 1) * 0.2, 0) / last.length;
}

/** The weakest theme with enough cards behind it to say, or null. */
export function weakestTheme(save: ScrollSave): Theme | null {
  let worst: { theme: Theme; form: number } | null = null;
  for (const theme of ['open', 'exploit', 'defend', 'odds'] as Theme[]) {
    const form = themeForm(save, theme);
    if (form !== null && form < 0.6 && (!worst || form < worst.form)) worst = { theme, form };
  }
  return worst?.theme ?? null;
}

/** Odds of each template for the next card. Exported for the tests. */
export function weights(save: ScrollSave): { t: Template; w: number }[] {
  const { cap } = levelOf(save.stars);
  const recent = save.recent;
  const lastTheme = recent[recent.length - 1]?.theme;
  return TEMPLATES.filter((t) => t.level <= cap)
    .map((t) => {
      const seenAt = recent.map((r) => r.id).lastIndexOf(t.id);
      const since = seenAt === -1 ? Infinity : recent.length - 1 - seenAt;
      if (since < GAP) return { t, w: 0 };
      let w = 1;
      // The top of your level is where you learn the most.
      if (t.level === cap) w += 0.6;
      // A kind of card you've been missing.
      const form = themeForm(save, t.theme);
      if (form !== null && form < 0.6) w += 1.4;
      // One you missed, once enough cards have gone by.
      const last = seenAt === -1 ? null : recent[seenAt];
      if (last && !last.passed && since >= RETURN_AFTER) w += 1.2;
      // Something you've never seen is always worth a look.
      if (seenAt === -1 && save.best[t.id] === undefined) w += 0.4;
      // Mix it up.
      if (t.theme === lastTheme) w *= 0.45;
      return { t, w };
    })
    .filter((x) => x.w > 0);
}

/** The next card, from `rng` (0 to 1). The seed is the save's counter, so no two cards share a deal. */
export function pickCard(save: ScrollSave, rng: () => number): CardRef {
  let pool = weights(save);
  // Too few templates to space them out (a very small library): anything in level.
  if (!pool.length) pool = TEMPLATES.filter((t) => t.level <= levelOf(save.stars).cap).map((t) => ({ t, w: 1 }));
  const total = pool.reduce((a, x) => a + x.w, 0);
  let x = rng() * total;
  let chosen = pool[pool.length - 1].t;
  for (const p of pool) {
    x -= p.w;
    if (x < 0) {
      chosen = p.t;
      break;
    }
  }
  return { id: chosen.id, seed: save.seed + 1 + Math.floor(rng() * 1000) * 1000 };
}
