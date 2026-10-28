import { GameThumb } from '../ui/GameIllustrations';
import { useState } from 'react';
import {
  PARTY_BLIND_HANDS,
  PARTY_FILL,
  PARTY_MAX_GAMES,
  PARTY_MIN_GAMES,
  PARTY_STACKS,
  shufflePlaylist,
  variantInfo,
  VARIANTS,
  type Variant,
} from '../game';
import { createParty } from '../state/party';
import { back, replace, toast } from '../state/store';
import { Choice, chips } from '../ui/components';
import { haptic } from '../ui/effects';
import { BackIcon, PlusIcon } from '../ui/Icons';

const ALL = VARIANTS.map((v) => v.id);

/** Pick the mini games for a party tournament, and how fast the blinds climb. */
export function PartySetup() {
  const [games, setGames] = useState<Variant[]>(() => ['holdem', ...shufflePlaylist(ALL.filter((v) => v !== 'holdem'), 5)]);
  const [stack, setStack] = useState(1000);
  const [blindHands, setBlindHands] = useState(3);
  const [fill, setFill] = useState(6);
  const [busy, setBusy] = useState(false);
  const ok = games.length >= PARTY_MIN_GAMES && games.length <= PARTY_MAX_GAMES;

  const add = (v: Variant) => {
    if (games.length >= PARTY_MAX_GAMES) return toast(`A party has at most ${PARTY_MAX_GAMES} games.`, 'error');
    haptic('light');
    setGames([...games, v]);
  };

  const open = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await createParty({ games, startingStack: stack, blindHands, fillTo: fill });
      replace({ name: 'party' });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't open the party.", 'error');
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button type="button" className="icon-btn press" aria-label="Back" onClick={back}>
          <BackIcon />
        </button>
        <div className="topbar-title h3">New party</div>
      </div>
      <div className="screen-body party-setup">
        <div>
          <h1 className="h1">Pick the games</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Everyone plays one short table per game. Finish higher, score more. Blinds climb fast, so each game is over in minutes.
          </p>
        </div>

        <div className="section-row">
          <p className="section-title">
            Your playlist · {games.length} of {PARTY_MIN_GAMES}–{PARTY_MAX_GAMES}
          </p>
          <button type="button" className="link-btn press" onClick={() => setGames(shufflePlaylist(ALL, games.length))}>
            Shuffle
          </button>
        </div>
        <ol className="playlist">
          {games.map((g, i) => {
            const info = variantInfo(g);
            return (
              <li key={`${i}-${g}`} className="playlist-row">
                <span className="playlist-n num">{i + 1}</span>
                <GameThumb variant={g} size={36} />
                <span className="playlist-name">{info.name}</span>
                <button
                  type="button"
                  className="playlist-x press"
                  aria-label={`Remove ${info.name}`}
                  disabled={games.length <= PARTY_MIN_GAMES}
                  onClick={() => setGames(games.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ol>

        <p className="section-title">Add a game</p>
        <div className="addgames">
          {VARIANTS.map((v) => (
            <button key={v.id} type="button" className="addgame press" onClick={() => add(v.id)} aria-label={`Add ${v.name}`}>
              <GameThumb variant={v.id} size={30} />
              <span>{v.name}</span>
              <PlusIcon width={16} height={16} />
            </button>
          ))}
        </div>

        <Choice label="Chips each game" value={stack} options={PARTY_STACKS} onChange={setStack} format={chips} />
        <Choice label="Blinds double every" value={blindHands} options={PARTY_BLIND_HANDS} onChange={setBlindHands} format={(n) => `${n} hands`} />
        <Choice label="Bots fill empty seats up to" value={fill} options={PARTY_FILL} onChange={setFill} format={(n) => (n === 0 ? 'None' : String(n))} />

        <button type="button" className="btn btn-xl btn-blue" disabled={!ok || busy} onClick={() => void open()}>
          {busy ? 'Opening…' : 'Open the party'}
        </button>
      </div>
    </div>
  );
}
