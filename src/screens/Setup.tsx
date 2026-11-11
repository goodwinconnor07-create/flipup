import { useEffect, useState } from 'react';
import {
  BLIND_CAP_CHOICES,
  BLIND_MINUTE_MAX,
  blindsLabel,
  DEFAULT_SETTINGS,
  levelsFor,
  timerLabel,
  withStack,
  withVariant,
  LEGENDS,
  MAX_SEATS,
  STACK_CHOICES,
  TIMER_CHOICES,
  type Settings,
  type Variant,
  PERSONALITIES,
} from '../game';
import { loadSettings } from '../state/persist';
import { openTable, useApp } from '../state/store';
import { BackBar, Choice, chips, Group, StepRow, SwitchRow } from '../ui/components';
import { ChevronIcon } from '../ui/Icons';
import { BOTS } from '../game/botStyles';
import { BotPicker } from './BotPicker';
import { GameRow } from './GamePicker';

const RANDOM = 'Random table';
const PICK = 'Pick your bots';

/** The host's table settings: stack, blinds, rebuys, turn timer, and how many bots. */
export function SettingsFields({
  settings,
  onChange,
  timer = true,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  timer?: boolean;
}) {
  const levels = levelsFor(settings.startingStack);
  const blindKey = blindsLabel([settings.smallBlind, settings.bigBlind]);
  const blindsFoot = settings.blindMinutes
    ? `Blinds rise every ${settings.blindMinutes} min${settings.blindCap ? `, up to ${blindsLabel([settings.blindCap / 2, settings.blindCap])}` : ''}.`
    : 'The blinds stay the same all game.';
  return (
    <>
      <GameRow settings={settings} onChange={onChange} />
      <Group title="Chips and blinds" footer={blindsFoot}>
        <StepRow
          label="Starting chips"
          value={settings.startingStack}
          options={STACK_CHOICES}
          format={chips}
          // Keep the blinds sensible for the new stack (at least 10 big blinds deep).
          onChange={(startingStack) => onChange(withStack(settings, startingStack))}
        />
        <StepRow
          label="Blinds"
          value={blindKey}
          options={levels.map(blindsLabel)}
          onChange={(label) => {
            const [smallBlind, bigBlind] = levels.find((l) => blindsLabel(l) === label)!;
            onChange({ ...settings, smallBlind, bigBlind });
          }}
        />
        <StepRow
          label="Blinds go up every"
          value={settings.blindMinutes ?? 0}
          options={Array.from({ length: BLIND_MINUTE_MAX + 1 }, (_, i) => i)}
          format={(m) => (m ? `${m} min` : 'Never')}
          onChange={(blindMinutes) => onChange({ ...settings, blindMinutes })}
        />
        {!!settings.blindMinutes && (
          <StepRow
            label="Blinds stop at"
            value={settings.blindCap ?? 0}
            options={[0, ...BLIND_CAP_CHOICES.filter((c) => c > 0 && (c > settings.bigBlind || c === settings.blindCap))]}
            format={(c) => (c === 0 ? 'No limit' : blindsLabel([c / 2, c]))}
            onChange={(blindCap) => onChange({ ...settings, blindCap })}
          />
        )}
      </Group>
      <Group title="House rules">
        {(settings.variant ?? 'holdem') === 'holdem' && (
          <StepRow
            label="Bot level"
            hint="Casual is relaxed; Challenge makes fewer small mistakes. Changes next hand."
            value={settings.botDifficulty ?? 'casual'}
            options={['casual', 'challenge']}
            format={(v) => (v === 'challenge' ? 'Challenge' : 'Casual')}
            onChange={(botDifficulty) => onChange({ ...settings, botDifficulty })}
          />
        )}
        {(settings.variant ?? 'holdem') === 'holdem' && (
          <SwitchRow
            label="Invite BOT_001"
            hint="Add the new experimental bot. Joins next hand; leaves after the current hand."
            on={!!settings.humanPoker}
            onChange={(humanPoker) => onChange({ ...settings, humanPoker })}
          />
        )}
        {(settings.variant ?? 'holdem') === 'holdem' && settings.humanPoker && (
          <StepRow
            label="BOT_001 personality"
            hint={`${PERSONALITIES.find((p) => p.id === settings.botPersonality)?.description ?? 'The original experimental profile.'} Changes next hand.`}
            value={settings.botPersonality ?? 'original'}
            options={['original', ...PERSONALITIES.map((p) => p.id)]}
            format={(id) => PERSONALITIES.find((p) => p.id === id)?.label ?? 'Original'}
            onChange={(botPersonality) => onChange({ ...settings, botPersonality })}
          />
        )}
        {timer && (
          <StepRow
            label="Time to act"
            value={settings.turnSeconds}
            options={TIMER_CHOICES}
            format={timerLabel}
            onChange={(turnSeconds) => onChange({ ...settings, turnSeconds })}
          />
        )}
        <SwitchRow
          label="Rebuys"
          hint="Busted players can buy back in"
          on={settings.rebuys}
          onChange={(rebuys) => onChange({ ...settings, rebuys })}
        />
        {timer && (
          <SwitchRow
            label="Busted players peek"
            hint="Once you're out of chips, you see everyone's cards"
            on={!!settings.showToBusted}
            onChange={(showToBusted) => onChange({ ...settings, showToBusted })}
          />
        )}
      </Group>
    </>
  );
}

export function Setup({ mode, variant }: { mode: 'online' | 'local'; variant?: Variant }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const s = loadSettings();
    // Old saved settings that don't fit today's choices fall back to the defaults' shape.
    const fits =
      levelsFor(s.startingStack).some(([sb, bb]) => sb === s.smallBlind && bb === s.bigBlind) && STACK_CHOICES.includes(s.startingStack);
    const fitted = fits ? s : { ...s, startingStack: 1000, smallBlind: 5, bigBlind: 10 };
    // A game picked on Home starts with the stacks and blinds it plays best with.
    const base = variant ? withVariant(fitted, variant) : fitted;
    // Against bots nobody's waiting on you, so there's no clock.
    return mode === 'local' ? { ...base, turnSeconds: 0 } : { ...base, turnSeconds: base.turnSeconds || DEFAULT_SETTINGS.turnSeconds };
  });
  const [bots, setBots] = useState(mode === 'local' ? 4 : 0);
  // Against the bots you can leave the table to chance, or choose exactly who sits down.
  const [how, setHow] = useState<string>(RANDOM);
  const [picked, setPicked] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const busy = useApp((s) => s.busy);
  const minBots = mode === 'local' && !settings.humanPoker ? 1 : 0;
  // Each of the two screens starts at its top, not wherever the long list left the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [picking]);
  const choosing = mode === 'local' && how === PICK;
  const faces = new Map<string, string>([
    ...BOTS.map((b) => [b.name, b.emoji] as const),
    ...LEGENDS.map((l) => [l.short, l.emoji] as const),
  ]);

  if (picking) {
    return (
      <BotPicker
        picked={picked}
        onBack={() => setPicking(false)}
        onSave={(names) => {
          setPicked(names);
          setPicking(false);
        }}
      />
    );
  }

  return (
    <div className="screen">
      <BackBar title={mode === 'online' ? 'Host a table' : 'Play the bots'} />
      <div className="screen-body">
        <h1 className="h1">{mode === 'online' ? 'Set up the table' : 'You vs the bots'}</h1>
        {mode === 'local' && <Choice label="Who plays" value={how} options={[RANDOM, PICK]} onChange={setHow} />}
        {choosing ? (
          <button type="button" className="picked-row press" onClick={() => setPicking(true)}>
            <span className="picked-faces">
              <b>{picked.length === 0 ? 'Choose your bots' : `${picked.length} ${picked.length === 1 ? 'bot' : 'bots'} picked`}</b>
              <span aria-hidden>{picked.length === 0 ? '🤖' : picked.map((n) => faces.get(n)).join(' ')}</span>
              <small className="muted">{picked.length === 0 ? 'Browse every bot by playstyle' : picked.join(', ')}</small>
            </span>
            <ChevronIcon width={20} height={20} aria-hidden />
          </button>
        ) : (
          <Group footer={mode === 'online' ? 'Bots fill seats your friends leave empty.' : 'Computer players at your table.'}>
            <StepRow
              label="Bots"
              value={bots}
              options={Array.from({ length: MAX_SEATS - 1 - minBots }, (_, i) => i + minBots)}
              onChange={setBots}
              buttons={['One less bot', 'One more bot']}
            />
          </Group>
        )}
        <SettingsFields
          settings={settings}
          onChange={(s) => {
            setSettings(s);
            if (s.humanPoker) setBots((b) => Math.min(b, MAX_SEATS - 2));
          }}
          timer={mode === 'online'}
        />
        {settings.humanPoker && <p className="muted">BOT_001 will join in an extra bot seat.</p>}
        {settings.humanPoker && choosing && picked.length > MAX_SEATS - 2 && (
          <p role="alert">Pick at most seven other bots to leave a seat for BOT_001.</p>
        )}
      </div>
      <div className="screen-foot">
        <button
          type="button"
          className="btn btn-xl btn-dark"
          disabled={
            !!busy ||
            (choosing && ((!settings.humanPoker && picked.length === 0) || (!!settings.humanPoker && picked.length > MAX_SEATS - 2)))
          }
          onClick={() => void (choosing ? openTable(mode, settings, picked.length, picked) : openTable(mode, settings, bots))}
        >
          {busy
            ? 'Opening…'
            : mode === 'online'
              ? 'Open the table'
              : choosing && picked.length === 0 && !settings.humanPoker
                ? 'Pick your bots first'
                : 'Sit down'}
        </button>
      </div>
    </div>
  );
}
