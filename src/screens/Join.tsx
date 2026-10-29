import { useEffect, useState } from 'react';
import { FORMATS, stakeById, venueById, type TableInfo } from '../game';
import { useCampaign } from '../state/campaign';
import { joinTable, navigate, openSheet, replace, resetTo, useApp } from '../state/store';
import { Avatar, BackBar, chips } from '../ui/components';
import { haptic } from '../ui/effects';
import { findTable } from './sheets/JoinSheet';

/** Arriving from a join link: look the code up, then show the table. Typing a code happens in the join popup. */
export function Join({ code }: { code: string }) {
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    void findTable(code).then((result) => {
      if (!live) return;
      if ('info' in result) replace({ name: 'joinTable', info: result.info });
      else {
        setError(result.error);
        haptic('error');
      }
    });
    return () => {
      live = false;
    };
  }, [code]);

  return (
    <div className="screen">
      <BackBar title="Join a table" />
      <div className="screen-body center">
        {error ? (
          <>
            <p className="bad shake" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
            <button
              type="button"
              className="btn btn-blue"
              onClick={() => {
                resetTo();
                openSheet({ name: 'join' });
              }}
            >
              Enter a different code
            </button>
          </>
        ) : (
          <span className="spinner" aria-label="Looking for the table" />
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
  // A campaign table: the buy-in comes out of your own bankroll as you sit down.
  const c = useCampaign();
  const tag = info.campaign;
  const venue = tag?.kind === 'sng' ? venueById(tag.venue) : undefined;
  const cost = tag ? (tag.buyIn ?? info.settings.startingStack) : 0;
  const started = tag?.kind === 'sng' && info.status !== 'lobby';
  const blocked = !tag ? null : started ? 'Already started' : c.seat ? 'Finish your campaign table first' : c.chips < cost ? `You need ${chips(cost)}` : null;
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
        {tag && (
          <p className="camp-join">
            {venue ? `${venue.emoji} ${venue.name} ${FORMATS[venue.format].name}` : `🃏 ${stakeById(tag.venue) ? 'Campaign cash game' : 'Campaign table'}`}: the buy-in of <b>{chips(cost)}</b> comes out of your bankroll ({chips(c.chips)}).
            {tag.prize !== undefined && (
              <>
                {' '}
                Prize pool <b>{chips(tag.prize)}</b>.
              </>
            )}
          </p>
        )}
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
        <button type="button" className="btn btn-xl btn-green" disabled={full || ended || !!blocked} onClick={sit}>
          {ended ? 'Table finished' : full ? 'Table full' : (blocked ?? (tag ? `Buy in for ${chips(cost)}` : 'Take a seat'))}
        </button>
      </div>
    </div>
  );
}
