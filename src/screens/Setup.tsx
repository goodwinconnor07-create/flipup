import { useState } from 'react';
import { BLIND_LEVELS, DEFAULT_SETTINGS, MAX_SEATS, STACK_CHOICES, TIMER_CHOICES, type Settings } from '../game';
import { loadSettings } from '../state/persist';
import { openTable, useApp } from '../state/store';
import { BackBar, Choice, chips, Toggle } from '../ui/components';
import { MinusIcon, PlusIcon } from '../ui/Icons';

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
  const levels = BLIND_LEVELS.filter(([, bb]) => bb <= settings.startingStack / 10);
  const blindKey = blindsLabel([settings.smallBlind, settings.bigBlind]);
  return (
    <>
      <Choice
        label="Starting chips"
        value={settings.startingStack}
        options={STACK_CHOICES}
        format={chips}
        onChange={(startingStack) => {
          // Keep the blinds sensible for the new stack (at least 10 big blinds deep).
          const fits = BLIND_LEVELS.filter(([, bb]) => bb <= startingStack / 10);
          const keep = fits.some(([sb, bb]) => sb === settings.smallBlind && bb === settings.bigBlind);
          const [smallBlind, bigBlind] = keep ? [settings.smallBlind, settings.bigBlind] : fits[fits.length - 1];
          onChange({ ...settings, startingStack, smallBlind, bigBlind });
        }}
      />
      <Choice
        label="Blinds"
        value={blindKey}
        options={levels.map(blindsLabel)}
        onChange={(label) => {
          const [smallBlind, bigBlind] = levels.find((l) => blindsLabel(l) === label)!;
          onChange({ ...settings, smallBlind, bigBlind });
        }}
      />
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
      </div>
    </>
  );
}

export function Setup({ mode }: { mode: 'online' | 'local' }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const s = loadSettings();
    // Old saved settings that don't fit today's choices fall back to the defaults' shape.
    const fits = BLIND_LEVELS.some(([sb, bb]) => sb === s.smallBlind && bb === s.bigBlind) && STACK_CHOICES.includes(s.startingStack);
    const base = fits ? s : { ...s, startingStack: 1000, smallBlind: 5, bigBlind: 10 };
    // Against bots nobody's waiting on you, so there's no clock.
    return mode === 'local' ? { ...base, turnSeconds: 0 } : { ...base, turnSeconds: base.turnSeconds || DEFAULT_SETTINGS.turnSeconds };
  });
  const [bots, setBots] = useState(mode === 'local' ? 4 : 0);
  const busy = useApp((s) => s.busy);
  const minBots = mode === 'local' ? 1 : 0;

  return (
    <div className="screen">
      <BackBar title={mode === 'online' ? 'Host a table' : 'Play the bots'} />
      <div className="screen-body">
        <h1 className="h1">{mode === 'online' ? 'Set up the table' : 'You vs the bots'}</h1>
        <div className="bots-row">
          <div>
            <b>Bots</b>
            <small className="muted">{mode === 'online' ? 'Fill seats your friends leave empty' : 'Computer players at your table'}</small>
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
        <SettingsFields settings={settings} onChange={setSettings} timer={mode === 'online'} />
      </div>
      <div className="screen-foot">
        <button type="button" className="btn btn-xl btn-dark" disabled={!!busy} onClick={() => void openTable(mode, settings, bots)}>
          {busy ? 'Opening…' : mode === 'online' ? 'Open the table' : 'Sit down'}
        </button>
      </div>
    </div>
  );
}
