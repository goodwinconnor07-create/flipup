import { describe, expect, it } from 'vitest';
import { handLogText, plainCards } from './handText';

describe('hand text', () => {
  it('writes cards with suit symbols and 10 for T', () => {
    expect(plainCards('Flop: [Ah] [Td] [2c] [Ks]')).toBe('Flop: A♥ 10♦ 2♣ K♠');
    expect(plainCards('Sam folds')).toBe('Sam folds');
  });

  it('makes a message: title, your hand, then every move without the log heading', () => {
    const text = handLogText(7, ['Hand #7', 'Pia posts the small blind 5', 'Flop: [Ah] [Td] [2c]', 'Sam wins 30'], ['Kd', 'Qd']);
    expect(text.split('\n')).toEqual(['FlipUp · Hand #7', 'Your hand: K♦ Q♦', 'Pia posts the small blind 5', 'Flop: A♥ 10♦ 2♣', 'Sam wins 30']);
  });

  it('leaves out "Your hand" when you were not dealt in', () => {
    expect(handLogText(2, ['Hand #2', 'Sam wins 10'])).toBe('FlipUp · Hand #2\nSam wins 10');
  });
});
