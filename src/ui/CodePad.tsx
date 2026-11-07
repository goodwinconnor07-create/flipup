import { useEffect, useRef, useState } from 'react';
import { CODE_ALPHABET, CODE_LENGTH, TABLE_CODE_LENGTH } from '../game';
import { haptic } from './effects';

// Typing a code: boxes and a keyboard laid out like the phone's own, so every letter is where you'd expect it.
// Party and friend codes are five letters and never use vowels or Y, so those keys are shown greyed out. A table's
// code is six letters or numbers (ACES42), so every key works and a number row sits on top. The phone's keyboard
// never opens; on a computer the real keyboard types into it too.

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const NUMBERS = '1234567890';

/** Which kind of code is being typed: a table's (six letters or numbers) or a party's or friend's (five consonants). */
export type CodeKind = 'table' | 'letters';

export interface CodeState {
  code: string;
  busy: boolean;
  error: string;
  kind: CodeKind;
  length: number;
  type: (letter: string) => void;
  erase: () => void;
  /** Puts a whole code in (from a QR scan) and looks it up. */
  fill: (code: string) => void;
  setError: (error: string) => void;
}

/** The code typed so far. `run` is called once every box is full, and returns an error sentence, or null when it worked. */
export function useCode(run: (code: string) => Promise<string | null>, listening = true, kind: CodeKind = 'letters'): CodeState {
  const length = kind === 'table' ? TABLE_CODE_LENGTH : CODE_LENGTH;
  const allowed = (ch: string) => (kind === 'table' ? /^[A-Z0-9]$/.test(ch) : CODE_ALPHABET.includes(ch));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const looking = useRef(false);

  const submit = async (value: string) => {
    if (looking.current) return;
    looking.current = true;
    setBusy(true);
    setError('');
    let problem: string | null;
    try {
      problem = await run(value);
    } catch {
      problem = "Couldn't look that up. Try again.";
    }
    looking.current = false;
    if (!problem) {
      haptic('success');
      return;
    }
    // A wrong code starts over, so there's nothing to backspace through.
    setBusy(false);
    setCode('');
    setError(problem);
    haptic('error');
  };

  const type = (letter: string) => {
    if (busy || code.length >= length || !allowed(letter)) return;
    const next = code + letter;
    setCode(next);
    setError('');
    if (next.length === length) void submit(next);
  };

  const erase = () => {
    if (busy) return;
    setCode((c) => c.slice(0, -1));
    setError('');
  };

  const fill = (value: string) => {
    if (busy || looking.current) return;
    setCode(value);
    void submit(value);
  };

  // A computer's keyboard types the code too. Nothing on a phone listens for it, since no field is focused.
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        erase();
        return;
      }
      const letter = e.key.toUpperCase();
      if (letter.length === 1) type(letter);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return { code, busy, error, kind, length, type, erase, fill, setError };
}

/** The five boxes, the spinner or error under them, and the keyboard. */
export function CodePad({ state, label }: { state: CodeState; label: string }) {
  const { code, busy, error } = state;
  return (
    <>
      <div className={`join-code${error ? ' err' : ''}${busy ? ' busy' : ''}`} role="status" aria-label={`${label}: ${code.split('').join(' ') || 'empty'}`}>
        {Array.from({ length: state.length }, (_, i) => (
          <span key={`${i}-${code[i] ?? ''}`} className={`join-cell${i === code.length && !busy ? ' next' : ''}${code[i] ? ' filled' : ''}`}>
            {code[i] ?? ''}
          </span>
        ))}
      </div>
      <div className="join-status" aria-live="polite">
        {busy ? (
          <span className="spinner" aria-label="Looking it up" />
        ) : error ? (
          <p className="bad shake" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        ) : (
          <small className="muted">{state.kind === 'table' ? 'Letters and numbers, like ACES42.' : 'Codes have no vowels, so those keys are off.'}</small>
        )}
      </div>
      <div className="code-kb" role="group" aria-label={`${label} letters`}>
        {state.kind === 'table' && (
          <div className="code-kb-row">
            {NUMBERS.split('').map((digit) => (
              <button
                key={digit}
                type="button"
                className="code-key press"
                disabled={busy}
                onClick={() => {
                  haptic('light');
                  state.type(digit);
                }}
              >
                {digit}
              </button>
            ))}
          </div>
        )}
        {ROWS.map((row, r) => (
          <div key={row} className="code-kb-row">
            {row.split('').map((letter) => {
              const usable = state.kind === 'table' || CODE_ALPHABET.includes(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  className={`code-key press${usable ? '' : ' off'}`}
                  disabled={busy || !usable}
                  aria-hidden={!usable || undefined}
                  tabIndex={usable ? undefined : -1}
                  onClick={() => {
                    haptic('light');
                    state.type(letter);
                  }}
                >
                  {letter}
                </button>
              );
            })}
            {r === ROWS.length - 1 && (
              <button
                type="button"
                className="code-key code-key-delete press"
                aria-label="Delete"
                disabled={busy || code.length === 0}
                onClick={() => {
                  haptic('light');
                  state.erase();
                }}
              >
                ⌫
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
