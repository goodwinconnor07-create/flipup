import { useState, type ComponentType, type SVGProps } from 'react';
import { myPlayer, seatFor, type Settings } from '../../game';
import {
  closeSheet,
  closeTable,
  confirm,
  dispatch,
  getState,
  leaveTable,
  navigate,
  openLog,
  openSheet,
  resetTo,
  setProfile,
  useApp,
  type Sheet as SheetSpec,
} from '../../state/store';
import { Avatar, chips, EmojiPicker, Sheet } from '../../ui/components';
import {
  ExitIcon,
  HelpIcon,
  ListIcon,
  HomeIcon,
  GearIcon,
  PencilIcon,
  StopIcon,
  TrophyIcon,
  UsersIcon,
  ClockIcon,
  PlusIcon,
} from '../../ui/Icons';
import { StandingsList } from '../Final';
import { SettingsFields } from '../Setup';
import { InviteSheet } from './InviteSheet';
import { RankingsSheet } from './RankingsSheet';
import { LogSheet } from './LogSheet';

export function SheetHost({ sheet }: { sheet: SheetSpec }) {
  switch (sheet.name) {
    case 'menu':
      return <MenuSheet />;
    case 'invite':
      return <InviteSheet />;
    case 'settings':
      return <SettingsSheet />;
    case 'standings':
      return <StandingsSheet />;
    case 'rankings':
      return <RankingsSheet />;
    case 'log':
      return <LogSheet />;
    case 'emoji':
      return <EmojiSheet />;
    case 'player':
      return <PlayerSheet playerId={sheet.playerId} />;
    case 'confirm':
      return <ConfirmSheet sheet={sheet} />;
  }
}

function ConfirmSheet({ sheet }: { sheet: Extract<SheetSpec, { name: 'confirm' }> }) {
  const run = () => {
    sheet.onConfirm();
    if (getState().sheet === sheet) closeSheet();
  };
  return (
    <Sheet title={sheet.title}>
      {sheet.body && (
        <p className="muted" style={{ marginTop: 0 }}>
          {sheet.body}
        </p>
      )}
      <div className="stack">
        <button type="button" className={`btn btn-xl ${sheet.danger ? 'btn-red' : 'btn-green'}`} onClick={run}>
          {sheet.confirm}
        </button>
        <button type="button" className="btn btn-ghost" onClick={closeSheet}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}

function EmojiSheet() {
  const profile = useApp((s) => s.profile);
  return (
    <Sheet title="Your emoji">
      <div className="look-preview">
        <span key={profile.emoji} className="pop">
          <Avatar emoji={profile.emoji} size={96} />
        </span>
        <b>{profile.name.trim() || 'You'}</b>
      </div>
      <EmojiPicker value={profile.emoji} onChange={(emoji) => setProfile({ emoji })} />
      <button type="button" className="btn btn-dark" style={{ marginTop: 20 }} onClick={closeSheet}>
        Done
      </button>
    </Sheet>
  );
}

function StandingsSheet() {
  const game = useApp((s) => s.game);
  if (!game) return null;
  return (
    <Sheet title="Standings">
      <p className="muted" style={{ marginTop: 0 }}>
        Chips now, minus everything bought in for.
      </p>
      <StandingsList game={game} />
    </Sheet>
  );
}

function SettingsSheet() {
  const game = useApp((s) => s.game);
  const online = useApp((s) => s.session?.mode === 'online');
  const [settings, setSettings] = useState<Settings | null>(game?.settings ?? null);
  if (!game || !settings) return null;
  const save = () => {
    if (dispatch({ type: 'settings', settings })) closeSheet();
  };
  return (
    <Sheet title="Table settings">
      {game.status === 'playing' && (
        <p className="muted" style={{ marginTop: 0 }}>
          Changes start next hand. A new stack size is for rebuys and new players.
        </p>
      )}
      <div className="stack">
        <SettingsFields settings={settings} onChange={setSettings} timer={online} />
        <button type="button" className="btn btn-dark" onClick={save}>
          Save
        </button>
      </div>
    </Sheet>
  );
}

function PlayerSheet({ playerId }: { playerId: string }) {
  const game = useApp((s) => s.game);
  const player = game?.players.find((p) => p.id === playerId);
  if (!game || !player) return null;
  const inHand = !!seatFor(game.hand, player.id) && !!game.hand && !game.hand.result;
  return (
    <Sheet>
      <div className="look-preview">
        <Avatar emoji={player.emoji} size={88} />
        <b className="h3">{player.name}</b>
        <span className="muted">
          {chips(player.stack)} chips{player.bot ? ' · Bot' : ''}
        </span>
      </div>
      <button
        type="button"
        className="btn btn-red"
        onClick={() =>
          confirm({
            title: `Remove ${player.name}?`,
            body: inHand ? 'Their hand is folded and they leave the table.' : 'They leave the table with their chips.',
            confirm: 'Remove',
            danger: true,
            onConfirm: () => dispatch({ type: 'remove', playerId: player.id }),
          })
        }
      >
        Remove from table
      </button>
    </Sheet>
  );
}

interface Item {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  onClick: () => void;
  danger?: boolean;
}

function MenuSheet() {
  const game = useApp((s) => s.game);
  const deviceId = useApp((s) => s.deviceId);
  const online = useApp((s) => s.session?.mode === 'online');
  const host = game?.hostDeviceId === deviceId;
  const me = game ? myPlayer(game, deviceId) : undefined;
  const playing = game?.status === 'playing';
  const items: Item[] = [];

  if (game && game.status !== 'lobby')
    items.push({ label: 'Standings', Icon: TrophyIcon, color: 'var(--gold)', onClick: () => openSheet({ name: 'standings' }) });
  if (game && game.status !== 'lobby') items.push({ label: 'Hand log', Icon: ListIcon, color: 'var(--blue)', onClick: openLog });
  if (online && game?.code && game.status !== 'ended')
    items.push({ label: 'Invite friends', Icon: UsersIcon, color: 'var(--green)', onClick: () => openSheet({ name: 'invite' }) });
  if (host && playing && game.players.length < 9)
    items.push({
      label: 'Add a bot',
      Icon: PlusIcon,
      color: 'var(--violet)',
      onClick: () => {
        dispatch({ type: 'addBot' });
        closeSheet();
      },
    });
  if (host && game?.status !== 'ended')
    items.push({ label: 'Table settings', Icon: GearIcon, color: 'var(--slate-hi)', onClick: () => openSheet({ name: 'settings' }) });
  if (me && playing) {
    items.push(
      me.sittingOut
        ? {
            label: "I'm back",
            Icon: ClockIcon,
            color: 'var(--blue)',
            onClick: () => {
              dispatch({ type: 'sitOut', out: false });
              closeSheet();
            },
          }
        : {
            label: 'Sit out next hand',
            Icon: ClockIcon,
            color: 'var(--blue)',
            onClick: () => {
              dispatch({ type: 'sitOut', out: true });
              closeSheet();
            },
          },
    );
  }
  items.push({
    label: 'Name and emoji',
    Icon: PencilIcon,
    color: 'var(--red)',
    onClick: () => navigate({ name: 'profile', then: 'done' }),
  });
  items.push({ label: 'Hand rankings', Icon: HelpIcon, color: 'var(--violet)', onClick: () => openSheet({ name: 'rankings' }) });
  items.push({ label: 'Home', Icon: HomeIcon, color: 'var(--green)', onClick: () => resetTo() });
  if (host && game && game.status !== 'ended') {
    items.push({
      label: 'End the game',
      Icon: StopIcon,
      color: 'var(--red)',
      danger: true,
      onClick: () =>
        confirm({
          title: 'End the game for everyone?',
          body: 'A hand in progress is called off and everyone gets their bets back. Then you see the final standings.',
          confirm: 'End game',
          danger: true,
          onConfirm: () => dispatch({ type: 'end' }),
        }),
    });
  }
  if (game?.status === 'ended') {
    items.push({ label: 'Close table', Icon: ExitIcon, color: 'var(--red)', danger: true, onClick: closeTable });
  } else if (game && (!host || online)) {
    items.push({
      label: 'Leave table',
      Icon: ExitIcon,
      color: 'var(--red)',
      danger: true,
      onClick: () =>
        confirm({
          title: 'Leave the table?',
          body: online
            ? 'Your seat goes to someone else. If a hand is on, your cards are folded.'
            : 'This ends your game against the bots.',
          confirm: 'Leave',
          danger: true,
          onConfirm: leaveTable,
        }),
    });
  }

  return (
    <Sheet title="Menu">
      {items.map(({ label, Icon, color, onClick, danger }) => (
        <button key={label} type="button" className={`menu-item press${danger ? ' danger' : ''}`} onClick={onClick}>
          <span className="mi-icon" style={{ background: color }}>
            <Icon />
          </span>
          {label}
        </button>
      ))}
    </Sheet>
  );
}
