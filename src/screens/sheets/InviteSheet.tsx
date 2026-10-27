import { joinLink, joinLinkLabel } from '../../state/platform';
import { toast, useApp } from '../../state/store';
import { Sheet } from '../../ui/components';
import { CopyIcon, ShareIcon } from '../../ui/Icons';
import { QRCode } from '../../ui/QRCode';
import { TILE_COLORS } from '../../ui/theme';

export async function copy(text: string, done = 'Link copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(done, 'success');
  } catch {
    toast("Couldn't copy. Read the code out instead.", 'error');
  }
}

/** Opens the phone's share sheet with some text (a hand, say), or copies it. */
export async function shareText(title: string, text: string, done: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  await copy(text, done);
}

/** Opens the phone's share sheet with the join link, or copies it. */
export async function shareInvite(code: string) {
  const link = joinLink(code);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join my poker table', text: `Pull up a chair. GTODuel code: ${code}`, url: link });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  await copy(link);
}

/** The join code as big colourful letter tiles. */
export function CodeTiles({ code, label = 'Table code' }: { code: string; label?: string }) {
  return (
    <div className="code-tiles" aria-label={`${label} ${code.split('').join(' ')}`}>
      {code.split('').map((ch, i) => (
        <span key={i} style={{ background: TILE_COLORS[i % TILE_COLORS.length], animationDelay: `${i * 60}ms` }}>
          {ch}
        </span>
      ))}
    </div>
  );
}

export function InviteSheet() {
  const code = useApp((s) => s.game?.code);
  if (!code) return null;
  return (
    <Sheet title="Invite friends">
      <div className="stack center">
        <CodeTiles code={code} />
        <div className="qr-box">
          <QRCode text={joinLink(code)} size={260} />
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Scan to join, or go to <b>{joinLinkLabel(code)}</b>
        </p>
        <button type="button" className="btn btn-blue" onClick={() => void shareInvite(code)}>
          <ShareIcon width={24} height={24} /> Share invite
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void copy(joinLink(code))}>
          <CopyIcon width={22} height={22} /> Copy link
        </button>
      </div>
    </Sheet>
  );
}
