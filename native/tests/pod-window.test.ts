import { describe, expect, it } from 'vitest';

import { planWindow, type WindowAnchor } from '../src/components/table/pod-window';

// A six-handed bots game: you plus five others, four fit in the row.
const others = ['a', 'b', 'c', 'd', 'e'];
const none: ReadonlySet<string> = new Set();

function run(steps: { focus?: string; folded?: string[]; just?: string[]; speaking?: string[] }[]) {
  let anchor: WindowAnchor = { id: null, idx: 0 };
  return steps.map((st) => {
    const p = planWindow({ others, folded: new Set(st.folded ?? []), justFolded: new Set(st.just ?? []), speaking: new Set(st.speaking ?? []), focus: st.focus, max: 4, anchor });
    anchor = { id: p.live[p.s] ?? null, idx: p.s };
    return p.live.slice(p.s, p.s + p.n);
  });
}

describe('the seat row with more players than fit', () => {
  it('always shows the player who is acting', () => {
    const rows = run([{ focus: 'a' }, { focus: 'e' }, { focus: 'b' }, { focus: 'c' }]);
    expect(rows[0]).toContain('a');
    expect(rows[1]).toContain('e');
    expect(rows[2]).toContain('b');
    expect(rows[3]).toContain('c');
    rows.forEach((r) => expect(r).toHaveLength(4));
  });

  it('keeps a player who just folded in view while the next player acts (no holding the window back)', () => {
    // b folds; c is next to act and e is the fifth player, so the row has to move to show e after d.
    const rows = run([{ focus: 'b' }, { focus: 'c', folded: ['b'], just: ['b'] }, { focus: 'd', folded: ['b'], just: ['b'] }]);
    expect(rows[1]).toContain('b');
    expect(rows[1]).toContain('c');
    expect(rows[2]).toContain('d');
  });

  it('drops a folded player once their moment is over, leaving room for the others', () => {
    const rows = run([{ focus: 'c', folded: ['b'], just: ['b'] }, { focus: 'c', folded: ['b'] }]);
    expect(rows[1]).not.toContain('b');
    expect(rows[1]).toHaveLength(4);
    expect(rows[1]).toContain('e');
  });

  it("doesn't shuffle the row when a player out of view folds", () => {
    const rows = run([{ focus: 'd' }, { focus: 'd', folded: ['a'], just: ['a'] }, { focus: 'd', folded: ['a'] }]);
    // a is at the left edge, then goes: b, c, d, e stay where they were.
    expect(rows[2]).toEqual(['b', 'c', 'd', 'e']);
  });

  it('shows the winner at the end', () => {
    const [row] = run([{ focus: 'e', folded: ['a', 'b'] }]);
    expect(row).toContain('e');
  });

  it('brings a speaker in without losing whoever is acting', () => {
    const [row] = run([{ focus: 'b', speaking: ['e'] }]);
    expect(row).toContain('b');
  });
});
