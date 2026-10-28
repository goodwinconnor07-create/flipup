import { useRef, useState } from 'react';
import { CODE_LENGTH, normalizeCode } from '../../game';
import { addPal } from '../../state/pals';
import { joinParty, readParty } from '../../state/party';
import { closeSheet, navigate, toast } from '../../state/store';
import { Sheet } from '../../ui/components';
import { haptic } from '../../ui/effects';

/** Five code boxes over a hidden input. Calls `run` once all five letters are in; it returns an error sentence, or null when it worked. */
function CodeEntry({ title, blurb, label, run }: { title: string; blurb: string; label: string; run: (code: string) => Promise<string | null> }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const looked = useRef('');

  const submit = async (value: string) => {
    if (looked.current) return;
    looked.current = value;
    setBusy(true);
    setError('');
    const problem = await run(value);
    if (!problem) return haptic('success');
    looked.current = '';
    setBusy(false);
    setError(problem);
    haptic('error');
  };

  return (
    <Sheet title={title}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          {blurb}
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
              if (next.length === CODE_LENGTH) void submit(next);
            }}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-label={label}
          />
        </div>
        <div className="join-status" aria-live="polite">
          {busy ? (
            <span className="spinner" aria-label="Looking" />
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

/** Type a friend code to add that person to your friends. */
export function AddPalSheet() {
  return (
    <CodeEntry
      title="Add a friend"
      blurb="Type the 5-letter friend code from their Party tab."
      label="Friend code"
      run={async (code) => {
        try {
          const pal = await addPal(code);
          closeSheet();
          toast(`${pal.name} is your friend now.`, 'success');
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : 'Something went wrong. Try again.';
        }
      }}
    />
  );
}

/** Type a party code to sit down in that party. */
export function JoinPartySheet() {
  return (
    <CodeEntry
      title="Join a party"
      blurb="Type the 5-letter party code from your host."
      label="Party code"
      run={async (code) => {
        try {
          if (!(await readParty(code))) return "There's no party with that code. Check it and try again.";
          await joinParty(code);
          closeSheet();
          navigate({ name: 'party' });
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : 'Something went wrong. Try again.';
        }
      }}
    />
  );
}
