import { useEffect, useState } from 'react';
import { PARTY_MAX_GAMES, PARTY_MIN_GAMES, VARIANTS } from '../game';
import { ensureMyCode, loadPals, myPalCode, PALS_CHANGED, refreshPals, removePal, restorePal, type Pal } from '../state/pals';
import { loadPartyRef } from '../state/party';
import { navigate, openSheet, toast, undoToast, useApp } from '../state/store';
import { Avatar } from '../ui/components';
import { ChevronIcon, KeypadIcon, PlusIcon, ShareIcon, UsersIcon } from '../ui/Icons';
import { copy } from './sheets/InviteSheet';

const SHOWCASE = VARIANTS.slice(0, 6);

/** The Party tab: host or join a tournament of mini games, and your friends. */
/** When friends and the friend card were last checked with the server, and how long to wait before the next time. */
let lastSync = 0;
const SYNC_EVERY = 60_000;

export function PartyTab() {
  const profile = useApp((s) => s.profile);
  const named = profile.name.trim().length > 0;
  const [pals, setPals] = useState(loadPals);
  const [code, setCode] = useState(myPalCode);
  const [busy, setBusy] = useState(false);
  const party = loadPartyRef();

  useEffect(() => {
    const reload = () => setPals(loadPals());
    window.addEventListener(PALS_CHANGED, reload);
    // Switching tabs back and forth shouldn't ask the server every time.
    if (Date.now() - lastSync > SYNC_EVERY) {
      lastSync = Date.now();
      void refreshPals();
      // A phone that already has a code keeps its name and picture fresh on the server.
      if (myPalCode() && named) void ensureMyCode().catch(() => undefined);
    }
    return () => window.removeEventListener(PALS_CHANGED, reload);
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
    setPals(loadPals());
    undoToast(`Removed ${pal.name}.`, () => {
      restorePal(pal);
      setPals(loadPals());
    });
  };

  return (
    <>
      <button type="button" className="party-host press" onClick={() => !needName() && navigate({ name: 'partySetup' })}>
        <span className="party-host-games" aria-hidden>
          {SHOWCASE.map((v, i) => (
            <span key={v.id} style={{ ['--i' as string]: i }}>
              {v.emoji}
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

      <h3 className="section-head">Friends</h3>
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
        {pals.map((pal) => (
          <div key={pal.code} className="group-row friend-row">
            <span className="gr-face">
              <Avatar emoji={pal.emoji} size={36} />
            </span>
            <span className="gr-text">
              {pal.name}
              <small>{pal.code}</small>
            </span>
            <button type="button" className="link-btn press" aria-label={`Remove ${pal.name}`} onClick={() => remove(pal)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      {pals.length === 0 && <p className="muted center party-empty">No friends yet. Add one with their code.</p>}
    </>
  );
}
