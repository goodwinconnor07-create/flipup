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

  it('settles when two players speak at once from opposite ends (it used to swing for ever and close the table)', () => {
    // Haunted Pot before the deal: four others, three fit, nobody to act, the first and the last both talking.
    const four = ['a', 'b', 'c', 'd'];
    let anchor: WindowAnchor = { id: null, idx: 0 };
    const seen: number[] = [];
    for (let i = 0; i < 6; i++) {
      const p = planWindow({ others: four, folded: null, justFolded: none, speaking: new Set(['a', 'd']), focus: undefined, max: 3, anchor });
      anchor = { id: p.live[p.s] ?? null, idx: p.s };
      seen.push(p.s);
    }
    expect(new Set(seen.slice(1)).size).toBe(1);
  });

  it('always comes to rest, whoever is speaking, folded or acting', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const all = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let t = 0; t < 4000; t++) {
      const list = all.slice(0, 4 + Math.floor(rnd() * 5));
      const pick = (chance: number) => new Set(list.filter(() => rnd() < chance));
      const folded = pick(0.3);
      const speaking = pick(0.35);
      const justFolded = new Set([...folded].filter(() => rnd() < 0.3));
      const focus = rnd() < 0.3 ? undefined : list[Math.floor(rnd() * list.length)];
      const max = rnd() < 0.5 ? 3 : 4;
      let anchor: WindowAnchor = { id: rnd() < 0.5 ? null : list[Math.floor(rnd() * list.length)], idx: Math.floor(rnd() * list.length) };
      const starts: number[] = [];
      // React gives up after 25 draws in a row; the window has to be still long before that.
      for (let i = 0; i < 8; i++) {
        const p = planWindow({ others: list, folded, justFolded, speaking, focus, max, anchor });
        anchor = { id: p.live[p.s] ?? null, idx: p.s };
        starts.push(p.s);
      }
      expect(starts[7], `case ${t}`).toBe(starts[6]);
      expect(starts[6], `case ${t}`).toBe(starts[5]);
      // And whoever is acting is in view once it has come to rest.
      const live = list.filter((id) => !folded.has(id) || speaking.has(id) || justFolded.has(id));
      if (focus && live.includes(focus)) expect(live.slice(starts[7], starts[7] + Math.min(max, live.length))).toContain(focus);
    }
  });
});
