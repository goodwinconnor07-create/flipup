import { useEffect, useRef, useState } from 'react';
import { CODE_LENGTH, normalizeCode, type TableInfo } from '../game';
import { fetchTableInfo } from '../state/api';
import { joinTable, navigate, replace, useApp } from '../state/store';
import { Avatar, BackBar, chips } from '../ui/components';
import { haptic } from '../ui/effects';

/** Type (or arrive with) the 5-letter code. */
export function Join({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(normalizeCode(initialCode ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const looked = useRef('');

  const lookUp = async (value: string) => {
    if (value.length !== CODE_LENGTH || looked.current === value) return;
    looked.current = value;
    setBusy(true);
    setError('');
    try {
      const info = await fetchTableInfo(value);
      if (!info) {
        setError("There's no table with that code. Check it and try again.");
        haptic('error');
        return;
      }
      replace({ name: 'joinTable', info });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      haptic('error');
    } finally {
      looked.current = '';
      setBusy(false);
    }
  };

  // Arriving from a join link: look the code up straight away.
  useEffect(() => {
    if (code.length === CODE_LENGTH) void lookUp(code);
  }, []);

  return (
    <div className="screen">
      <BackBar title="Join a table" />
      <div className="screen-body">
        <h1 className="h1">Enter the code</h1>
        <p className="muted" style={{ margin: 0 }}>
          Get the 5-letter code from whoever's hosting, or scan their QR code.
        </p>
        <div className="code-input">
          <input
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
            maxLength={10}
            placeholder="CODE"
            aria-label="Table code"
            autoFocus={!initialCode}
          />
        </div>
        {busy && <span className="spinner join-busy" aria-label="Looking for the table" />}
        {error && (
          <p className="bad shake" role="alert" style={{ margin: 0, textAlign: 'center' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** Who's at the table, and a button to sit down. */
export function JoinTable({ info }: { info: TableInfo }) {
  const profile = useApp((s) => s.profile);
  const full = info.seatsLeft <= 0;
  const ended = info.status === 'ended';
  const sit = () => {
    if (!profile.name.trim()) navigate({ name: 'profile', then: 'join', info });
    else joinTable(info.code);
  };
  return (
    <div className="screen">
      <BackBar title={`Table ${info.code}`} />
      <div className="screen-body">
        <div>
          <h1 className="h1">{info.hostName ? `${info.hostName}'s table` : 'The table'}</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            {info.status === 'playing'
              ? "Playing now. You'll be dealt in next hand."
              : ended
                ? 'This table has finished.'
                : 'Waiting to start.'}
          </p>
        </div>
        <div className="info-chips">
          <span className="info-chip">
            Blinds{' '}
            <b>
              {chips(info.settings.smallBlind)}/{chips(info.settings.bigBlind)}
            </b>
          </span>
          <span className="info-chip">
            Stack <b>{chips(info.settings.startingStack)}</b>
          </span>
        </div>
        <div className="roster">
          {info.players.map((p, i) => (
            <div key={i} className="roster-item">
              <span className="roster-pic" style={{ animationDelay: `${i * 0.08}s` }}>
                <Avatar emoji={p.emoji} size={64} />
              </span>
              <span className="roster-name">{p.name}</span>
              {p.bot && <span className="tag">Bot</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="screen-foot">
        {profile.name.trim() && !full && !ended && (
          <button type="button" className="me-row press" onClick={() => navigate({ name: 'profile', then: 'join', info })}>
            <Avatar emoji={profile.emoji} size={36} />
            <span>
              Playing as <b>{profile.name}</b>
            </span>
            <span className="me-row-edit">Change</span>
          </button>
        )}
        <button type="button" className="btn btn-xl btn-green" disabled={full || ended} onClick={sit}>
          {ended ? 'Table finished' : full ? 'Table full' : 'Take a seat'}
        </button>
      </div>
    </div>
  );
}
