import { useRef, useState } from 'react';
import { CODE_LENGTH, isCode, normalizeCode, type TableInfo } from '../../game';
import { fetchTableInfo } from '../../state/api';
import { navigate } from '../../state/store';
import { Sheet } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { QrIcon } from '../../ui/Icons';
import { QRScanner } from '../../ui/QRScanner';

/** Looks a code up. Returns the table, or the sentence to show when it can't be found. */
export async function findTable(code: string): Promise<{ info: TableInfo } | { error: string }> {
  try {
    const info = await fetchTableInfo(code);
    return info ? { info } : { error: "There's no table with that code. Check it and try again." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong. Try again.' };
  }
}

/** The code inside a scanned QR: the join link ends in it, or the text is just the code. */
export function codeFromScan(text: string): string | null {
  let tail = text.trim();
  try {
    tail = new URL(tail).pathname;
  } catch {
    // Not a link; treat the whole text as the code.
  }
  const code = normalizeCode(tail.split('/').filter(Boolean).pop() ?? '');
  return isCode(code) ? code : null;
}

/** A popup to type the 5-letter code or scan the host's QR code. The keyboard only opens when you tap the boxes. */
export function JoinSheet() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const looked = useRef('');

  const lookUp = async (value: string) => {
    if (looked.current) return;
    looked.current = value;
    setBusy(true);
    setError('');
    const result = await findTable(value);
    looked.current = '';
    if ('info' in result) {
      haptic('success');
      navigate({ name: 'joinTable', info: result.info });
      return;
    }
    setBusy(false);
    setError(result.error);
    haptic('error');
  };

  const onScan = (text: string) => {
    const found = codeFromScan(text);
    if (!found) {
      if (!looked.current) setError("That QR code isn't a FlipUp table.");
      return;
    }
    setScanning(false);
    setCode(found);
    void lookUp(found);
  };

  return (
    <Sheet title="Join a table">
      <div className="stack">
        {scanning ? (
          <>
            <QRScanner onText={onScan} />
            <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
              Point the camera at the QR code on the host's phone.
            </p>
            {error && (
              <p className="bad shake" role="alert" style={{ margin: 0, textAlign: 'center' }}>
                {error}
              </p>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setScanning(false)}>
              Type the code instead
            </button>
          </>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Type the 5-letter code from whoever's hosting.
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
                aria-label="Table code"
              />
            </div>
            <div className="join-status" aria-live="polite">
              {busy ? (
                <span className="spinner" aria-label="Looking for the table" />
              ) : error ? (
                <p className="bad shake" role="alert" style={{ margin: 0 }}>
                  {error}
                </p>
              ) : null}
            </div>
            <div className="join-or">or</div>
            <button
              type="button"
              className="btn btn-blue"
              onClick={() => {
                setError('');
                setScanning(true);
              }}
            >
              <QrIcon width={22} height={22} /> Scan a QR code
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
