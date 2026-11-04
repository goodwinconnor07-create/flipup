import { useEffect, useState } from 'react';
import { PARTY_MAX_GAMES, PARTY_MIN_GAMES, VARIANTS } from '../game';
import { checkRequests, ensureMyCode, myPalCode, refreshPals, removePal, restorePal, usePals, type Pal } from '../state/pals';
import { loadPartyRef } from '../state/party';
import { navigate, openSheet, toast, undoToast, useApp } from '../state/store';
import { Avatar } from '../ui/components';
import { GameThumb } from '../ui/GameIllustrations';
import { ChevronIcon, KeypadIcon, PlusIcon, ShareIcon, UsersIcon } from '../ui/Icons';
import { usePullToRefresh } from '../ui/usePullToRefresh';
import { RequestPill, RequestRow } from './FriendRequests';
import { copy } from './sheets/InviteSheet';

const SHOWCASE = VARIANTS.slice(0, 6);

/** When your own friend card was last refreshed on the server, and how long to wait before the next time. */
let lastSync = 0;
const SYNC_EVERY = 60_000;
/** A new friend row lights up for this long after it lands on the list. */
const FRESH_MS = 1500;

/** The Party tab: host or join a tournament of mini games, and your friends. */
export function PartyTab() {
  const profile = useApp((s) => s.profile);
  const named = profile.name.trim().length > 0;
  // One shared list: an add, an accept or a poll shows here at once, whichever screen did it.
  const { pals, requests, refreshing } = usePals();
  const [code, setCode] = useState(myPalCode);
  const [busy, setBusy] = useState(false);
  const party = loadPartyRef();
  const pullMarker = usePullToRefresh(() => void refreshPals());

  useEffect(() => {
    // Opening the tab looks for requests and answers straight away, quietly (the placeholders are for a pull).
    void checkRequests();
    // Switching tabs back and forth shouldn't rewrite your own card every time.
    if (Date.now() - lastSync > SYNC_EVERY) {
      lastSync = Date.now();
      // A phone that already has a code keeps its name and picture fresh on the server.
      if (myPalCode() && named) void ensureMyCode().catch(() => undefined);
    }
  }, []);

  // Hosting and joining need a name first.
  const needName = (): boolean => {
    if (named) return false;
    navigate({ name: 'profile', then: 'done' });
    toast('Add your name first.');
    return true;
  };

  const makeCode = async () => {
    if (busy || needName()) return;
    setBusy(true);
    try {
      setCode(await ensureMyCode());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't make your code.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = (pal: Pal) => {
    removePal(pal.code);
    undoToast(pal.pending ? `Cancelled your request to ${pal.name}.` : `Removed ${pal.name}.`, () => restorePal(pal));
  };

  return (
    <>
      <div ref={pullMarker} className="pull-refresh" aria-hidden>
        <span className="pull-spinner" />
      </div>
      <button type="button" className="party-host press" onClick={() => !needName() && navigate({ name: 'partySetup' })}>
        <span className="party-host-games" aria-hidden>
          {SHOWCASE.map((v, i) => (
            <span key={v.id} style={{ ['--i' as string]: i }}>
              <GameThumb variant={v.id} size={38} />
            </span>
          ))}
        </span>
        <b>Host a party</b>
        <small>
          Play {PARTY_MIN_GAMES} to {PARTY_MAX_GAMES} mini games in a row. The best finisher wins.
        </small>
        <span className="party-host-cta">
          Set it up
          <ChevronIcon width={18} height={18} />
        </span>
      </button>

      <div className="group">
        {party && (
          <button type="button" className="group-row press" onClick={() => navigate({ name: 'party' })}>
            <span className="gr-icon" style={{ background: 'var(--gold)' }}>
              <UsersIcon />
            </span>
            <span className="gr-text">
              Your party
              <small>Code {party.code}</small>
            </span>
            <ChevronIcon className="gr-chev" width={16} height={16} />
          </button>
        )}
        <button type="button" className="group-row press" onClick={() => !needName() && openSheet({ name: 'joinParty' })}>
          <span className="gr-icon" style={{ background: 'var(--green)' }}>
            <KeypadIcon />
          </span>
          <span className="gr-text">
            Join a party
            <small>Type the code from your host</small>
          </span>
          <ChevronIcon className="gr-chev" width={16} height={16} />
        </button>
      </div>

      {requests.length > 0 && (
        <>
          <h3 className="section-head">Incoming Friend Requests</h3>
          <div className="group">
            {requests.map((req) => (
              <RequestRow key={req.from} req={req} />
            ))}
          </div>
        </>
      )}

      <h3 className="section-head friends-head">
        Friends
        {requests.length > 0 && (
          <button type="button" className="count-pill-btn press" aria-label={`${requests.length} friend ${requests.length === 1 ? 'request' : 'requests'}`} onClick={() => openSheet({ name: 'palRequests' })}>
            <RequestPill count={requests.length} />
          </button>
        )}
      </h3>
      <div className="friend-code">
        {code ? (
          <>
            <span className="friend-code-text">
              <small className="eyebrow">Your friend code</small>
              <b className="friend-code-value">{code}</b>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-blue"
              onClick={() => void copy(`Add me on FlipUp. My friend code is ${code}`, 'Code copied')}
              aria-label="Copy your friend code"
            >
              <ShareIcon width={18} height={18} /> Copy
            </button>
          </>
        ) : (
          <>
            <span className="friend-code-text">
              <small className="eyebrow">Your friend code</small>
              <span className="muted">Give friends a code so they can add you.</span>
            </span>
            <button type="button" className="btn btn-sm btn-blue" disabled={busy} onClick={() => void makeCode()}>
              {busy ? 'Making…' : 'Get my code'}
            </button>
          </>
        )}
      </div>
      <div className="group">
        <button type="button" className="group-row press" onClick={() => openSheet({ name: 'addPal' })}>
          <span className="gr-icon" style={{ background: 'var(--gold)' }}>
            <PlusIcon />
          </span>
          <span className="gr-text">Add a friend</span>
          <ChevronIcon className="gr-chev" width={16} height={16} />
        </button>
        {refreshing
          ? Array.from({ length: Math.min(6, Math.max(2, pals.length)) }, (_, i) => (
              <div key={i} className="group-row friend-row skeleton-row" aria-hidden>
                <span className="skeleton skeleton-face" />
                <span className="skeleton-lines">
                  <span className="skeleton skeleton-line" />
                  <span className="skeleton skeleton-line short" />
                </span>
              </div>
            ))
          : pals.map((pal) => (
              <div key={pal.code} className={`group-row friend-row${Date.now() - pal.addedAt < FRESH_MS ? ' friend-in' : ''}`}>
                <span className="gr-face">
                  <Avatar emoji={pal.emoji} size={36} />
                </span>
                <span className="gr-text">
                  {pal.name}
                  <small>{pal.pending ? <span className="pending-tag">Pending</span> : pal.code}</small>
                </span>
                <button type="button" className="link-btn press" aria-label={pal.pending ? `Cancel request to ${pal.name}` : `Remove ${pal.name}`} onClick={() => remove(pal)}>
                  {pal.pending ? 'Cancel' : 'Remove'}
                </button>
              </div>
            ))}
      </div>
      {refreshing && <span className="sr-only" role="status">Refreshing friends</span>}
      {!refreshing && pals.length === 0 && <p className="muted center party-empty">No friends yet. Add one with their code.</p>}
    </>
  );
}
