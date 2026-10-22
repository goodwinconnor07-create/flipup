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
  setTableLook,
  toggleCalm,
  toggleDark,
  toggleGlass,
  toggleMuted,
  useApp,
  type Sheet as SheetSpec,
} from '../../state/store';
import { Avatar, Choice, chips, EmojiPicker, PlayingCard, Sheet } from '../../ui/components';
import { FELTS, RAILS } from '../../state/persist';
import {
  BoltIcon,
  ClockIcon,
  ExitIcon,
  GearIcon,
  HelpIcon,
  HomeIcon,
  ListIcon,
  GlassIcon,
  MoonIcon,
  MuteIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  SoundIcon,
  StopIcon,
  TrophyIcon,
  UsersIcon,
} from '../../ui/Icons';
import { StandingsList } from '../Final';
import { SettingsFields } from '../Setup';
import { InviteSheet } from './InviteSheet';
import { JoinSheet } from './JoinSheet';
import { StreakSheet } from './StreakSheet';
import { RankingsSheet } from './RankingsSheet';
import { LogSheet } from './LogSheet';

export function SheetHost({ sheet }: { sheet: SheetSpec }) {
  switch (sheet.name) {
    case 'menu':
      return <MenuSheet />;
    case 'invite':
      return <InviteSheet />;
    case 'streak':
      return <StreakSheet />;
    case 'join':
      return <JoinSheet />;
    case 'settings':
      return <SettingsSheet />;
    case 'prefs':
      return <PrefsSheet />;
    case 'standings':
      return <StandingsSheet />;
    case 'rankings':
      return <RankingsSheet />;
    case 'log':
      return <LogSheet />;
    case 'theme':
      return <ThemeSheet />;
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

/** Felt colour, rail and a live preview. Only changes how the table looks on this phone. */
function ThemeSheet() {
  const look = useApp((s) => s.look);
  const custom = !FELTS.some((f) => f.felt.toLowerCase() === look.felt.toLowerCase());
  return (
    <Sheet title="Table theme">
      <div className={`table-oval theme-preview rail-${look.rail}`} style={{ ['--felt' as string]: look.felt }}>
        <div className="table-felt">
          <div className="board">
            {['As', 'Kh', '7d', 'Tc', '2s'].map((c) => (
              <PlayingCard key={c} card={c} size="md" />
            ))}
          </div>
        </div>
      </div>
      <p className="section-title" style={{ margin: '0 0 10px' }}>
        Felt
      </p>
      <div className="swatches" role="radiogroup" aria-label="Felt colour">
        {FELTS.map((f) => (
          <button
            key={f.felt}
            type="button"
            role="radio"
            aria-checked={look.felt.toLowerCase() === f.felt}
            aria-label={f.name}
            className={`swatch press${look.felt.toLowerCase() === f.felt ? ' on' : ''}`}
            style={{ background: f.felt }}
            onClick={() => setTableLook({ felt: f.felt })}
          />
        ))}
        <label
          className={`swatch swatch-custom${custom ? ' on' : ''}`}
          aria-label="Pick any colour"
          style={custom ? { background: look.felt } : undefined}
        >
          <input type="color" value={look.felt} onChange={(e) => setTableLook({ felt: e.target.value })} />
        </label>
      </div>
      <div style={{ marginTop: 20 }}>
        <Choice
          label="Rail"
          value={look.rail}
          options={RAILS.map((r) => r.id)}
          format={(id) => RAILS.find((r) => r.id === id)!.name}
          onChange={(rail) => setTableLook({ rail })}
        />
      </div>
      <button type="button" className="btn btn-dark" style={{ marginTop: 20 }} onClick={closeSheet}>
        Done
      </button>
    </Sheet>
  );
}

function Tile({ label, Icon, color, onClick }: Item) {
  return (
    <button type="button" className="menu-tile press" onClick={onClick}>
      <span className="mi-icon" style={{ background: color }}>
        <Icon />
      </span>
      {label}
    </button>
  );
}

/** The app's own switches, for Home: how this phone looks and sounds. */
function PrefsSheet() {
  const muted = useApp((s) => s.muted);
  const calm = useApp((s) => s.calm);
  const dark = useApp((s) => s.dark);
  const glass = useApp((s) => s.glass);
  const items: Item[] = [
    { label: dark ? 'Dark mode on' : 'Dark mode off', Icon: MoonIcon, color: dark ? 'var(--violet)' : 'var(--slate-hi)', onClick: toggleDark },
    { label: glass ? 'Liquid Glass on' : 'Liquid Glass off', Icon: GlassIcon, color: glass ? 'var(--blue)' : 'var(--slate-hi)', onClick: toggleGlass },
    { label: muted ? 'Sound off' : 'Sound on', Icon: muted ? MuteIcon : SoundIcon, color: muted ? 'var(--slate-hi)' : 'var(--green)', onClick: toggleMuted },
    { label: calm ? 'Animations off' : 'Animations on', Icon: BoltIcon, color: calm ? 'var(--slate-hi)' : 'var(--gold)', onClick: toggleCalm },
    { label: 'Table theme', Icon: PaletteIcon, color: 'var(--violet)', onClick: () => openSheet({ name: 'theme' }) },
    { label: 'Hand rankings', Icon: HelpIcon, color: 'var(--blue)', onClick: () => openSheet({ name: 'rankings' }) },
  ];
  return (
    <Sheet title="Settings">
      <div className="menu-grid">
        {items.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>
    </Sheet>
  );
}

function MenuSheet() {
  const game = useApp((s) => s.game);
  const deviceId = useApp((s) => s.deviceId);
  const online = useApp((s) => s.session?.mode === 'online');
  const muted = useApp((s) => s.muted);
  const calm = useApp((s) => s.calm);
  const dark = useApp((s) => s.dark);
  const glass = useApp((s) => s.glass);
  const host = game?.hostDeviceId === deviceId;
  const me = game ? myPlayer(game, deviceId) : undefined;
  const playing = game?.status === 'playing';
  const started = !!game && game.status !== 'lobby';
  const ended = game?.status === 'ended';
  const quick = (fn: () => void) => () => {
    fn();
    closeSheet();
  };

  const table: Item[] = [];
  if (started) table.push({ label: 'Standings', Icon: TrophyIcon, color: 'var(--gold)', onClick: () => openSheet({ name: 'standings' }) });
  if (started) table.push({ label: 'Hand log', Icon: ListIcon, color: 'var(--blue)', onClick: openLog });
  if (online && game?.code && !ended)
    table.push({ label: 'Invite friends', Icon: UsersIcon, color: 'var(--green)', onClick: () => openSheet({ name: 'invite' }) });
  if (host && !ended)
    table.push({ label: 'Table settings', Icon: GearIcon, color: 'var(--slate-hi)', onClick: () => openSheet({ name: 'settings' }) });
  if (host && playing && game.players.length < 9)
    table.push({ label: 'Add a bot', Icon: PlusIcon, color: 'var(--violet)', onClick: quick(() => dispatch({ type: 'addBot' })) });

  const you: Item[] = [
    {
      label: muted ? 'Sound off' : 'Sound on',
      Icon: muted ? MuteIcon : SoundIcon,
      color: muted ? 'var(--slate-hi)' : 'var(--green)',
      onClick: toggleMuted,
    },
    {
      label: calm ? 'Animations off' : 'Animations on',
      Icon: BoltIcon,
      color: calm ? 'var(--slate-hi)' : 'var(--gold)',
      onClick: toggleCalm,
    },
    {
      label: dark ? 'Dark mode on' : 'Dark mode off',
      Icon: MoonIcon,
      color: dark ? 'var(--violet)' : 'var(--slate-hi)',
      onClick: toggleDark,
    },
    {
      label: glass ? 'Liquid Glass on' : 'Liquid Glass off',
      Icon: GlassIcon,
      color: glass ? 'var(--blue)' : 'var(--slate-hi)',
      onClick: toggleGlass,
    },
    { label: 'Table theme', Icon: PaletteIcon, color: 'var(--violet)', onClick: () => openSheet({ name: 'theme' }) },
    { label: 'Name and emoji', Icon: PencilIcon, color: 'var(--red)', onClick: () => navigate({ name: 'profile', then: 'done' }) },
    { label: 'Hand rankings', Icon: HelpIcon, color: 'var(--blue)', onClick: () => openSheet({ name: 'rankings' }) },
  ];
  if (me && playing) {
    you.push(
      me.sittingOut
        ? { label: "I'm back", Icon: ClockIcon, color: 'var(--blue)', onClick: quick(() => dispatch({ type: 'sitOut', out: false })) }
        : { label: 'Sit out', Icon: ClockIcon, color: 'var(--slate-hi)', onClick: quick(() => dispatch({ type: 'sitOut', out: true })) },
    );
  }

  const leave: Item[] = [{ label: 'Home', Icon: HomeIcon, color: 'var(--green)', onClick: () => resetTo() }];
  if (host && game && !ended) {
    leave.push({
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
  if (ended) {
    leave.push({ label: 'Close table', Icon: ExitIcon, color: 'var(--red)', danger: true, onClick: closeTable });
  } else if (game && (!host || online)) {
    leave.push({
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
      {table.length > 0 && (
        <>
          <p className="menu-section">Table</p>
          <div className="menu-grid">
            {table.map((t) => (
              <Tile key={t.label} {...t} />
            ))}
          </div>
        </>
      )}
      <p className="menu-section">You</p>
      <div className="menu-grid">
        {you.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>
      <div className="menu-rows">
        {leave.map(({ label, Icon, color, onClick, danger }) => (
          <button key={label} type="button" className={`menu-item press${danger ? ' danger' : ''}`} onClick={onClick}>
            <span className="mi-icon" style={{ background: color }}>
              <Icon />
            </span>
            {label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
