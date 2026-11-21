import { describe, expect, it } from 'vitest';
import { BOTS } from './botStyles';
import { EMOJIS } from './emoji';

// A bot must read as a character, never as a person a friend could be, and never as an icon.
const PEOPLE = /[\u{1F466}-\u{1F469}\u{1F474}-\u{1F475}\u{1F9D1}-\u{1F9D3}\u{1F9D4}\u{1F468}\u{1F469}]/u;
const ICONS = ['♠️', '♥️', '♦️', '♣️', '🏆', '🎱', '🎯'];

describe('bot faces', () => {
  it('never wears a picker face, a person or a suit, trophy or 8-ball', () => {
    for (const b of BOTS) {
      expect((EMOJIS as readonly string[]).includes(b.emoji), `${b.name} ${b.emoji}`).toBe(false);
      expect(PEOPLE.test(b.emoji), `${b.name} ${b.emoji}`).toBe(false);
      expect(ICONS.includes(b.emoji), `${b.name} ${b.emoji}`).toBe(false);
    }
  });
});
