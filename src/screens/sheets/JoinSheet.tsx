import { useState } from 'react';
import { isCode, normalizeCode, type TableInfo } from '../../game';
import { fetchTableInfo } from '../../state/api';
import { navigate } from '../../state/store';
import { Sheet } from '../../ui/components';
import { CodePad, useCode } from '../../ui/CodePad';
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

/** A popup to type the 5-letter code with the keys below it, or scan the host's QR code. */
export function JoinSheet() {
  const [scanning, setScanning] = useState(false);
  const state = useCode(async (value) => {
    const result = await findTable(value);
    if ('info' in result) {
      navigate({ name: 'joinTable', info: result.info });
      return null;
    }
    return result.error;
  }, !scanning);

  const onScan = (text: string) => {
    const found = codeFromScan(text);
    if (!found) {
      if (!state.busy) state.setError("That QR code isn't a FlipUp table.");
      return;
    }
    setScanning(false);
    state.fill(found);
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
            {state.error && (
              <p className="bad shake" role="alert" style={{ margin: 0, textAlign: 'center' }}>
                {state.error}
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
            <CodePad state={state} label="Table code" />
            <div className="join-or">or</div>
            <button
              type="button"
              className="btn btn-blue"
              onClick={() => {
                state.setError('');
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
