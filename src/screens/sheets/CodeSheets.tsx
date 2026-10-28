import { addPal } from '../../state/pals';
import { joinParty, readParty } from '../../state/party';
import { closeSheet, navigate, toast } from '../../state/store';
import { Sheet } from '../../ui/components';
import { CodePad, useCode } from '../../ui/CodePad';

/** Five code boxes and the code keyboard. Calls `run` once all five letters are in; it returns an error sentence, or null when it worked. */
function CodeEntry({ title, blurb, label, run }: { title: string; blurb: string; label: string; run: (code: string) => Promise<string | null> }) {
  const state = useCode(run);
  return (
    <Sheet title={title}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          {blurb}
        </p>
        <CodePad state={state} label={label} />
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
