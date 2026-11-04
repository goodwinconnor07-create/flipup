import { useEffect, useRef, useState } from 'react';
import { CODE_ALPHABET, CODE_LENGTH, FRIEND_CODE_LENGTH } from '../game';
import { haptic } from './effects';

// Typing a 5-letter code (a table, a party or a friend): five boxes and a keyboard laid out like the phone's
// own, so every letter is where you'd expect it. Codes never use vowels or Y, so those keys are shown greyed
// out. The phone's keyboard never opens; on a computer the real keyboard types into it too. Friend codes are six
// digits (`mode: 'digits'`), typed on a number pad laid out like the phone's.

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const DIGIT_ROWS = ['123', '456', '789', '0'];
const DIGITS = '0123456789';

export type CodeMode = 'letters' | 'digits';

export interface CodeState {
  code: string;
  mode: CodeMode;
  busy: boolean;
  error: string;
  type: (letter: string) => void;
  erase: () => void;
  /** Puts a whole code in (from a QR scan) and looks it up. */
  fill: (code: string) => void;
  setError: (error: string) => void;
}

/** The code typed so far. `run` is called once all five letters are in, and returns an error sentence, or null when it worked. */
export function useCode(run: (code: string) => Promise<string | null>, listening = true, mode: CodeMode = 'letters'): CodeState {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const length = mode === 'digits' ? FRIEND_CODE_LENGTH : CODE_LENGTH;
  const alphabet = mode === 'digits' ? DIGITS : CODE_ALPHABET;
  // Switching between letters and numbers starts the code over.
  const [was, setWas] = useState(mode);
  if (was !== mode) {
    setWas(mode);
    setCode('');
    setError('');
  }
  const [busy, setBusy] = useState(false);
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
    if (busy || code.length >= length || !alphabet.includes(letter)) return;
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

  return { code, mode, busy, error, type, erase, fill, setError };
}

/** The five boxes, the spinner or error under them, and the keyboard. */
export function CodePad({ state, label }: { state: CodeState; label: string }) {
  const { code, busy, error } = state;
  const digits = state.mode === 'digits';
  const length = digits ? FRIEND_CODE_LENGTH : CODE_LENGTH;
  const rows = digits ? DIGIT_ROWS : ROWS;
  const alphabet = digits ? DIGITS : CODE_ALPHABET;
  return (
    <>
      <div className={`join-code${digits ? ' digits' : ''}${error ? ' err' : ''}${busy ? ' busy' : ''}`} role="status" aria-label={`${label}: ${code.split('').join(' ') || 'empty'}`}>
        {Array.from({ length }, (_, i) => (
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
          <small className="muted">{digits ? 'Friend codes are six numbers.' : 'Codes have no vowels, so those keys are off.'}</small>
        )}
      </div>
      <div className={`code-kb${digits ? ' digits' : ''}`} role="group" aria-label={`${label} ${digits ? 'numbers' : 'letters'}`}>
        {rows.map((row, r) => (
          <div key={row} className="code-kb-row">
            {digits && r === rows.length - 1 && <span className="code-key code-key-gap" aria-hidden />}
            {row.split('').map((letter) => {
              const usable = alphabet.includes(letter);
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
            {r === rows.length - 1 && (
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
