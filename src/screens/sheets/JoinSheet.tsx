import { useEffect, useRef, useState } from 'react';
import { CODE_ALPHABET, CODE_LENGTH, isCode, normalizeCode, type TableInfo } from '../../game';
import { fetchTableInfo } from '../../state/api';
import { navigate } from '../../state/store';
import { Sheet } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { QrIcon } from '../../ui/Icons';
import { QRScanner } from '../../ui/QRScanner';
import { TILE_COLORS } from '../../ui/theme';

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

/**
 * The letters of a table code, as big coloured keys under the boxes. The phone's own keyboard never
 * opens, so the code is typed here (and on a computer, with the real keyboard, through the window listener).
 */
function CodeKeyboard({ onLetter, onDelete, disabled }: { onLetter: (letter: string) => void; onDelete: () => void; disabled: boolean }) {
  const letters = CODE_ALPHABET.split('');
  return (
    <div className="join-keys" role="group" aria-label="Code letters">
      {letters.map((letter, i) => (
        <button
          key={letter}
          type="button"
          className="join-key"
          style={{ background: TILE_COLORS[i % TILE_COLORS.length] }}
          disabled={disabled}
          onClick={() => {
            haptic('light');
            onLetter(letter);
          }}
        >
          {letter}
        </button>
      ))}
      <button
        type="button"
        className="join-key join-key-delete"
        aria-label="Delete"
        disabled={disabled}
        onClick={() => {
          haptic('light');
          onDelete();
        }}
      >
        ⌫
      </button>
    </div>
  );
}

/** A popup to type the 5-letter code with the keys below it, or scan the host's QR code. */
export function JoinSheet() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
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

  const typeLetter = (letter: string) => {
    if (busy || code.length >= CODE_LENGTH) return;
    const next = code + letter;
    setCode(next);
    setError('');
    if (next.length === CODE_LENGTH) void lookUp(next);
  };

  const erase = () => {
    if (busy) return;
    setCode((c) => c.slice(0, -1));
    setError('');
  };

  // A computer's keyboard types the code too. Nothing on a phone listens for it, since no field is focused.
  useEffect(() => {
    if (scanning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        erase();
        return;
      }
      const letter = e.key.toUpperCase();
      if (letter.length === 1 && CODE_ALPHABET.includes(letter)) typeLetter(letter);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onScan = (text: string) => {
    const found = codeFromScan(text);
    if (!found) {
      if (!looked.current) setError("That QR code isn't a GTODuel table.");
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
            <div className="join-code">
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <span key={`${i}-${code[i] ?? ''}`} className={`join-cell${i === Math.min(code.length, CODE_LENGTH - 1) ? ' next' : ''}${code[i] ? ' filled' : ''}`}>
                  {code[i] ?? ''}
                </span>
              ))}
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
            <CodeKeyboard onLetter={typeLetter} onDelete={erase} disabled={busy} />
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
