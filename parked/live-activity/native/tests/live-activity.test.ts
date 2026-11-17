import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createTable, DEFAULT_SETTINGS, liveAttributes, liveState } from '@game/index';

// The Live Activity is drawn in Swift from JSON the server and the app write in TypeScript. ActivityKit matches the
// app's and the widget's attribute types by name and shape, and decodes pushes by field name, so all three must agree.
const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const moduleCopy = read('native/modules/flipup-live/ios/TableActivityAttributes.swift');
const widgetCopy = read('native/targets/live/TableActivityAttributes.swift');

/** `public var name: Type` lines of one Swift struct body, as name → type. */
function swiftFields(source: string, from: string, to: string): Record<string, string> {
  const body = source.slice(source.indexOf(from), to ? source.indexOf(to) : undefined);
  return Object.fromEntries([...body.matchAll(/public var (\w+): ([\w[\]?]+)/g)].map((m) => [m[1], m[2]]));
}

const SWIFT_TYPE: Record<string, string> = { string: 'String', boolean: 'Bool' };

describe('Live Activity types', () => {
  it('are the same in the app module and the widget extension', () => {
    expect(widgetCopy).toBe(moduleCopy);
  });

  it("match what liveState() sends, field for field", () => {
    const game = createTable({ hostDeviceId: 'device-live-test-0001', name: 'Connor', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 2, code: 'ACES42', now: 0 });
    const state = liveState(game, 'device-live-test-0001', 0)!;
    const fields = swiftFields(moduleCopy, 'struct ContentState', '}');
    expect(Object.keys(fields).sort()).toEqual(Object.keys(state).sort());
    for (const [key, value] of Object.entries(state)) {
      const swift = fields[key];
      if (Array.isArray(value)) expect(swift).toBe('[String]');
      else if (typeof value === 'number' || value === null) expect(['Int', 'Double', 'Double?']).toContain(swift);
      else expect(swift).toBe(SWIFT_TYPE[typeof value]);
    }
    // Numbers that can be fractions (big blinds, seconds) are Double; counts are Int.
    for (const key of ['pot', 'toCall', 'net', 'stack']) expect(fields[key]).toBe('Double');
    for (const key of ['turnStart', 'turnEnd']) expect(fields[key]).toBe('Double?');
  });

  it('has the attributes the app starts it with', () => {
    const attrs = swiftFields(moduleCopy.slice(moduleCopy.lastIndexOf('  }')), '', '');
    const sent = { ...liveAttributes(createTable({ hostDeviceId: 'device-live-test-0001', name: 'A', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 1, code: 'ACES42', now: 0 })), origin: 'https://playflipup.com' };
    expect(Object.keys(attrs).sort()).toEqual(Object.keys(sent).sort());
  });

  it('keeps the hole cards private on a locked Lock Screen', () => {
    const cards = read('native/targets/live/Cards.swift');
    const holeCards = cards.slice(cards.indexOf('struct HoleCards'), cards.indexOf('struct BoardRow'));
    expect(holeCards).toContain('.privacySensitive()');
  });
});
