import { useState } from 'react';
import type { FriendRequest } from '../game';
import { acceptRequest, denyRequest } from '../state/pals';
import { toast } from '../state/store';
import { Avatar } from '../ui/components';
import { haptic } from '../ui/effects';

/** How long an accepted request shows "Added" before it moves into Friends. */
const ADDED_MS = 450;

/** One friend request: their face and name, then Accept and Deny. Used on the Party tab and in the requests sheet. */
export function RequestRow({ req }: { req: FriendRequest }) {
  const [added, setAdded] = useState(false);
  const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const accept = () => {
    if (added) return;
    haptic('success');
    setAdded(true);
    setTimeout(
      () =>
        void acceptRequest(req.from).catch((e: unknown) => {
          setAdded(false);
          toast(e instanceof Error ? e.message : "Couldn't accept. Try again.", 'error');
        }),
      calm ? 0 : ADDED_MS,
    );
  };
  const deny = () => {
    haptic('light');
    void denyRequest(req.from).catch((e: unknown) => toast(e instanceof Error ? e.message : "Couldn't answer. Try again.", 'error'));
  };

  return (
    <div className={`group-row request-row${added ? ' added' : ''}`} role="group" aria-label={`Friend request from ${req.name}`}>
      <span className="gr-face">
        <Avatar emoji={req.emoji} size={36} />
      </span>
      <span className="gr-text">
        {req.name}
        <small>{added ? 'Added' : req.username ? `@${req.username}` : 'Wants to be friends'}</small>
      </span>
      {!added && (
        <span className="request-actions">
          <button type="button" className="btn btn-sm request-deny press" onClick={deny} aria-label={`Deny ${req.name}`}>
            Deny
          </button>
          <button type="button" className="btn btn-sm btn-blue press" onClick={accept} aria-label={`Accept ${req.name}`}>
            Accept
          </button>
        </span>
      )}
    </div>
  );
}

/** The red count pill on the Party tab and the Friends heading. Nothing at zero. */
export function RequestPill({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="count-pill" aria-hidden>
      {count > 99 ? '99+' : count}
    </span>
  );
}
