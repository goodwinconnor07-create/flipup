import { useEffect, useState, type ReactNode } from 'react';
import { addPal, usePals } from '../../state/pals';
import { RequestRow } from '../FriendRequests';
import { joinParty, readParty } from '../../state/party';
import { closeSheet, navigate, toast } from '../../state/store';
import { Sheet } from '../../ui/components';
import { CodePad, useCode, type CodeMode } from '../../ui/CodePad';

/** Five code boxes and the code keyboard. Calls `run` once all five letters are in; it returns an error sentence, or null when it worked. */
function CodeEntry({ title, blurb, label, run, mode, extra }: { title: string; blurb: string; label: string; run: (code: string) => Promise<string | null>; mode?: CodeMode; extra?: ReactNode }) {
  const state = useCode(run, true, mode);
  return (
    <Sheet title={title}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          {blurb}
        </p>
        <CodePad state={state} label={label} />
        {extra}
      </div>
    </Sheet>
  );
}

/**
 * Type a friend code to send that person a friend request. They go on your list at once, as Pending until they
 * accept. Friend codes are six numbers; older phones may still have a five-letter one.
 */
export function AddPalSheet() {
  const [mode, setMode] = useState<CodeMode>('digits');
  return (
    <CodeEntry
      title="Add a friend"
      blurb={mode === 'digits' ? 'Type the friend code from their Party tab. They’ll get a request to accept.' : 'Type the 5-letter friend code from their Party tab. They’ll get a request to accept.'}
      label="Friend code"
      mode={mode}
      extra={
        <button type="button" className="link-btn press center" onClick={() => setMode(mode === 'digits' ? 'letters' : 'digits')}>
          {mode === 'digits' ? 'Their code has letters?' : 'Their code is numbers?'}
        </button>
      }
      run={async (code) => {
        try {
          const pal = await addPal(code);
          closeSheet();
          toast(pal.pending ? `Request sent. ${pal.name} shows as Pending until they accept.` : `${pal.name} is your friend now.`, 'success');
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

/** The requests waiting for you, from the red pill: Accept or Deny each. Closes itself once they're all answered. */
export function FriendRequestsSheet() {
  const { requests } = usePals();
  const [seen, setSeen] = useState(requests.length > 0);
  useEffect(() => {
    if (requests.length > 0) setSeen(true);
    // Let the last Accept show "Added" before the sheet goes.
    else if (seen) {
      const t = setTimeout(closeSheet, 300);
      return () => clearTimeout(t);
    }
  }, [requests.length, seen]);
  return (
    <Sheet title="Friend requests">
      {requests.length > 0 ? (
        <div className="group">
          {requests.map((req) => (
            <RequestRow key={req.from} req={req} />
          ))}
        </div>
      ) : (
        <p className="muted center">No requests waiting.</p>
      )}
    </Sheet>
  );
}
