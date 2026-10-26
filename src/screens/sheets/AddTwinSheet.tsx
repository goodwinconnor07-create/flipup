import { useRef, useState } from 'react';
import { CODE_LENGTH, normalizeCode } from '../../game';
import { addFriendByCode } from '../../state/friends';
import { navigate, closeSheet } from '../../state/store';
import { Sheet } from '../../ui/components';
import { haptic } from '../../ui/effects';

/** Type a friend's twin code (five letters, from their Settings) to add their twin. */
export function AddTwinSheet() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const looked = useRef('');

  const lookUp = async (value: string) => {
    if (looked.current) return;
    looked.current = value;
    setBusy(true);
    setError('');
    try {
      const friend = await addFriendByCode(value);
      haptic('success');
      closeSheet();
      navigate({ name: 'scout', code: friend.code });
    } catch (e) {
      looked.current = '';
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      haptic('error');
    }
  };

  return (
    <Sheet title="Add a friend's twin">
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          Type the 5-letter twin code from your friend's Settings. They turn on "Let friends play my twin" to get one.
        </p>
        <div className="join-code" onClick={() => input.current?.focus()}>
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <span key={i} className={`join-cell${i === Math.min(code.length, CODE_LENGTH - 1) ? ' next' : ''}${code[i] ? ' filled' : ''}`}>
              {code[i] ?? ''}
            </span>
          ))}
          <input
            ref={input}
            className="join-code-input"
            value={code}
            onChange={(e) => {
              const next = normalizeCode(e.target.value);
              setCode(next);
              setError('');
              if (next.length === CODE_LENGTH) void lookUp(next);
            }}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-label="Twin code"
          />
        </div>
        <div className="join-status" aria-live="polite">
          {busy ? (
            <span className="spinner" aria-label="Looking for the twin" />
          ) : error ? (
            <p className="bad shake" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
