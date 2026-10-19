import { MAX_SEATS, type Game } from '../game';
import { joinLinkLabel } from '../state/platform';
import { confirm, dispatch, openSheet, useApp } from '../state/store';
import { Avatar, chips } from '../ui/components';
import { colourWipe } from '../ui/effects';
import { PlusIcon, QrIcon, ShareIcon } from '../ui/Icons';
import { CodeTiles, shareInvite } from './sheets/InviteSheet';
import { timerLabel } from './Setup';

export function Lobby({ game }: { game: Game }) {
  const deviceId = useApp((s) => s.deviceId);
  const online = useApp((s) => s.session?.mode === 'online');
  const host = game.hostDeviceId === deviceId;
  const hostName = game.players.find((p) => p.deviceId === game.hostDeviceId)?.name ?? 'the host';
  const humans = game.players.filter((p) => !p.bot).length;
  const s = game.settings;

  const deal = (e: React.MouseEvent<HTMLButtonElement>) => {
    const start = () => dispatch({ type: 'start' });
    if (!online || humans > 1) return colourWipe(e, start);
    confirm({
      title: 'Deal without friends?',
      body: "Nobody's joined yet. Friends can still sit down later and get dealt in on the next hand.",
      confirm: 'Deal',
      onConfirm: start,
    });
  };

  return (
    <>
      <div className="screen-body">
        <div>
          <h1 className="h1">{host ? (online ? 'Invite your friends' : 'Your table') : "You're in!"}</h1>
          {!(host && online) && (
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {host ? 'Add or remove bots, then deal.' : `Waiting for ${hostName} to deal.`}
            </p>
          )}
        </div>

        {online && game.code && host && (
          <div className="invite-panel">
            <CodeTiles code={game.code} />
            <button
              type="button"
              className="link-chip press"
              aria-label={`Share link ${joinLinkLabel(game.code)}`}
              onClick={() => void shareInvite(game.code!)}
            >
              <span className="link-host">{joinLinkLabel(game.code)}</span>
              <ShareIcon width={20} height={20} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => openSheet({ name: 'invite' })}>
              <QrIcon width={24} height={24} /> QR code
            </button>
          </div>
        )}

        <div className="section-row">
          <p className="section-title">
            At the table · {game.players.length}/{MAX_SEATS}
          </p>
        </div>
        <div className="roster">
          {game.players.map((p, i) => {
            const you = p.deviceId === deviceId;
            const canEdit = host && !you;
            return (
              <button
                key={p.id}
                type="button"
                className="roster-item"
                disabled={!canEdit}
                aria-label={`${p.name}${you ? ', you' : ''}${p.bot ? ', bot' : ''}`}
                onClick={() => openSheet({ name: 'player', playerId: p.id })}
              >
                <span className="roster-pic" style={{ animationDelay: `${i * 0.08}s`, ['--float-delay' as string]: `${0.5 + i * 0.35}s` }}>
                  <span className="roster-float">
                    <Avatar emoji={p.emoji} size={64} />
                  </span>
                </span>
                <span className="roster-name">{p.name}</span>
                {you ? (
                  <span className="tag tag-you">You</span>
                ) : p.bot ? (
                  <span className="tag">Bot</span>
                ) : p.deviceId === game.hostDeviceId ? (
                  <span className="tag">Host</span>
                ) : null}
              </button>
            );
          })}
          {host && game.players.length < MAX_SEATS && (
            <button type="button" className="roster-item add-bot" onClick={() => dispatch({ type: 'addBot' })}>
              <span className="roster-pic">
                <span className="add-bot-circle">
                  <PlusIcon width={28} height={28} />
                </span>
              </span>
              <span className="roster-name">Add bot</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="info-chips press-row"
          disabled={!host}
          onClick={() => openSheet({ name: 'settings' })}
          aria-label="Table settings"
        >
          <span className="info-chip">
            Blinds{' '}
            <b>
              {chips(s.smallBlind)}/{chips(s.bigBlind)}
            </b>
          </span>
          <span className="info-chip">
            Stack <b>{chips(s.startingStack)}</b>
          </span>
          {online && (
            <span className="info-chip">
              Timer <b>{timerLabel(s.turnSeconds)}</b>
            </span>
          )}
          {!!s.blindMinutes && (
            <span className="info-chip">
              Blinds up <b>{s.blindMinutes} min</b>
            </span>
          )}
          <span className="info-chip">
            Rebuys <b>{s.rebuys ? 'On' : 'Off'}</b>
          </span>
          {host && <span className="info-chip edit">Change</span>}
        </button>
      </div>
      <div className="screen-foot">
        {host ? (
          <button type="button" className="btn btn-xl btn-green" disabled={game.players.length < 2} onClick={deal}>
            {game.players.length < 2 ? 'Add a player to deal' : 'Deal'}
          </button>
        ) : (
          <p className="waiting-line">
            <span className="dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            Waiting for {hostName} to deal
          </p>
        )}
      </div>
    </>
  );
}
