// Which of the other players the seat row shows when there are more than fit (pure, so the flow of a six-handed
// bots game can be tested). The row is a window over the players still in the hand: it moves only when it has to,
// to bring in whoever is acting (or the winner) or a speaker, and a player who just folded stays in the list for a
// moment (`justFolded`) so their Fold can be read, without ever holding the window back from the player who is acting.

export interface WindowAnchor {
  /** The player at the left of the window last time: the window stays on them when others fold out around it. */
  id: string | null;
  /** Where that was in the list, for when they've gone. */
  idx: number;
}

export interface WindowPlan {
  /** Everyone who is in the list now, in seat order. */
  live: string[];
  /** How many show, and the index of the first. */
  n: number;
  s: number;
}

export function planWindow(a: {
  others: string[];
  /** Folded players, and those of them still to be seen (just folded, or speaking). Null before a hand. */
  folded: ReadonlySet<string> | null;
  justFolded: ReadonlySet<string>;
  speaking: ReadonlySet<string>;
  /** Who the window should keep in view: the player to act, or the winner. */
  focus: string | undefined;
  max: number;
  anchor: WindowAnchor;
}): WindowPlan {
  const live = a.others.filter((id) => !a.folded || !a.folded.has(id) || a.speaking.has(id) || a.justFolded.has(id));
  const n = Math.min(a.max, live.length);
  const top = Math.max(0, live.length - n);
  const held = a.anchor.id ? live.indexOf(a.anchor.id) : -1;
  let s = Math.max(0, Math.min(held >= 0 ? held : a.anchor.idx, top));
  const at = a.focus ? live.indexOf(a.focus) : -1;
  if (at >= 0) {
    if (at < s) s = at;
    else if (at > s + n - 1) s = at - n + 1;
  }
  const speaker = live.findIndex((id, i) => a.speaking.has(id) && (i < s || i > s + n - 1));
  if (speaker >= 0) {
    const to = speaker < s ? speaker : speaker - n + 1;
    if (at < 0 || (at >= to && at <= to + n - 1)) s = to;
  }
  return { live, n, s };
}
