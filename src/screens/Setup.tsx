import { useEffect, useState } from 'react';
import { BLIND_CAP_CHOICES, BLIND_LEVELS, DEFAULT_SETTINGS, LEGENDS, MAX_SEATS, STACK_CHOICES, TIMER_CHOICES, type Settings, type Variant } from '../game';
import { loadSettings } from '../state/persist';
import { openTable, useApp } from '../state/store';
import { BackBar, Choice, chips, Toggle } from '../ui/components';
import { ChevronIcon, MinusIcon, PlusIcon } from '../ui/Icons';
import { BOTS } from '../game/botStyles';
import { BotPicker } from './BotPicker';
import { GameRow, withVariant } from './GamePicker';

const RANDOM = 'Random table (recommended)';
const PICK = 'Pick your bots';

/** The longest wait between blind rises on the slider (0 is never). */
export const BLIND_MINUTE_MAX = 20;

/** Blinds offered for a starting stack: at least 10 big blinds deep, with no tiny blinds on big stacks (no 1/2 at 5,000, no 5/10 either at 10,000). */
const smallestBigBlind = (stack: number) => (stack >= 10_000 ? 20 : stack >= 5_000 ? 10 : 0);
const levelsFor = (stack: number) => BLIND_LEVELS.filter(([, bb]) => bb <= stack / 10 && bb >= smallestBigBlind(stack));

export const blindsLabel = ([sb, bb]: [number, number]) => `${chips(sb)}/${chips(bb)}`;
export const timerLabel = (s: number) => (s === 0 ? 'Off' : `${s}s`);

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
  return (
    <>
      <GameRow settings={settings} onChange={onChange} />
      <Choice
        label="Starting chips"
        value={settings.startingStack}
        options={STACK_CHOICES}
        format={chips}
        onChange={(startingStack) => {
          // Keep the blinds sensible for the new stack (at least 10 big blinds deep).
          const fits = levelsFor(startingStack);
          const keep = fits.some(([sb, bb]) => sb === settings.smallBlind && bb === settings.bigBlind);
          const [smallBlind, bigBlind] = keep ? [settings.smallBlind, settings.bigBlind] : fits[fits.length - 1];
          onChange({ ...settings, startingStack, smallBlind, bigBlind });
        }}
      />
      <Choice
        label="Blinds"
        columns={levels.length <= 5 ? levels.length : 3}
        value={blindKey}
        options={levels.map(blindsLabel)}
        onChange={(label) => {
          const [smallBlind, bigBlind] = levels.find((l) => blindsLabel(l) === label)!;
          onChange({ ...settings, smallBlind, bigBlind });
        }}
      />
      <div className="choice">
        <p className="section-title slider-title">
          <span>Blinds go up every</span>
          <b className="num">{settings.blindMinutes ? `${settings.blindMinutes} min` : 'Never'}</b>
        </p>
        <input
          type="range"
          className="raise-slider"
          aria-label="Blinds go up every"
          min={0}
          max={BLIND_MINUTE_MAX}
          step={1}
          value={settings.blindMinutes ?? 0}
          onChange={(e) => onChange({ ...settings, blindMinutes: Number(e.target.value) })}
        />
        <div className="slider-ends" aria-hidden>
          <span>Never</span>
          <span>{BLIND_MINUTE_MAX} min</span>
        </div>
      </div>
      {!!settings.blindMinutes && (
        <Choice
          label="Blinds stop increasing at"
          columns={3}
          value={settings.blindCap ?? 0}
          options={[0, ...BLIND_CAP_CHOICES.filter((c) => c > 0 && (c > settings.bigBlind || c === settings.blindCap))]}
          format={(c) => (c === 0 ? 'No limit' : blindsLabel([c / 2, c]))}
          onChange={(blindCap) => onChange({ ...settings, blindCap })}
        />
      )}
      {timer && (
        <Choice
          label="Time to act"
          value={settings.turnSeconds}
          options={TIMER_CHOICES}
          format={timerLabel}
          onChange={(turnSeconds) => onChange({ ...settings, turnSeconds })}
        />
      )}
      <div className="tile-flat toggles">
        <Toggle
          label="Rebuys"
          hint="Busted players can buy back in"
          on={settings.rebuys}
          onChange={(rebuys) => onChange({ ...settings, rebuys })}
        />
        {timer && (
          <Toggle
            label="Busted players peek"
            hint="Once you're out of chips, you see everyone's cards"
            on={!!settings.showToBusted}
            onChange={(showToBusted) => onChange({ ...settings, showToBusted })}
          />
        )}
      </div>
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
  const minBots = mode === 'local' ? 1 : 0;
  // Each of the two screens starts at its top, not wherever the long list left the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [picking]);
  const choosing = mode === 'local' && how === PICK;
  const faces = new Map<string, string>([...BOTS.map((b) => [b.name, b.emoji] as const), ...LEGENDS.map((l) => [l.short, l.emoji] as const)]);

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
        {mode === 'local' && <Choice label="Who plays" value={how} options={[RANDOM, PICK]} onChange={setHow} columns={1} />}
        {choosing ? (
          <button type="button" className="picked-row press" onClick={() => setPicking(true)}>
            <span className="picked-faces">
              <b>{picked.length === 0 ? 'Choose your bots' : `${picked.length} ${picked.length === 1 ? 'bot' : 'bots'} picked`}</b>
              <span aria-hidden>{picked.length === 0 ? '🤖' : picked.map((n) => faces.get(n)).join(' ')}</span>
              <small className="muted">{picked.length === 0 ? 'Browse every bot by playstyle, plus AI Legends' : picked.join(', ')}</small>
            </span>
            <ChevronIcon width={20} height={20} aria-hidden />
          </button>
        ) : (
          <div className="bots-row">
            <div>
              <b>Bots</b>
              <small className="muted">
                {mode === 'online' ? 'Fill seats your friends leave empty' : 'Computer players at your table'}
              </small>
            </div>
            <div className="mini-stepper">
              <button
                type="button"
                className="icon-btn press"
                aria-label="One less bot"
                disabled={bots <= minBots}
                onClick={() => setBots(bots - 1)}
              >
                <MinusIcon />
              </button>
              <b className="num" aria-live="polite" aria-label={`${bots} bots`}>
                {bots}
              </b>
              <button
                type="button"
                className="icon-btn press"
                aria-label="One more bot"
                disabled={bots >= MAX_SEATS - 1}
                onClick={() => setBots(bots + 1)}
              >
                <PlusIcon />
              </button>
            </div>
          </div>
        )}
        <SettingsFields settings={settings} onChange={setSettings} timer={mode === 'online'} />
      </div>
      <div className="screen-foot">
        <button
          type="button"
          className="btn btn-xl btn-dark"
          disabled={!!busy || (choosing && picked.length === 0)}
          onClick={() => void (choosing ? openTable(mode, settings, picked.length, picked) : openTable(mode, settings, bots))}
        >
          {busy ? 'Opening…' : mode === 'online' ? 'Open the table' : choosing && picked.length === 0 ? 'Pick your bots first' : 'Sit down'}
        </button>
      </div>
    </div>
  );
}
