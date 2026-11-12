// Secret Missions at the table: your mission (and how far you are in the race) over the move buttons, and the gold
// banner across the felt when someone completes theirs or a race is settled.

import { chips } from '../../ui/components';
import { MISSION_GOAL, MISSION_SWAP_AFTER, rewardOf, secretMission, type Game, type Player } from '../../game';

/** Your mission, its reward, your progress in the race and who's leading. */
export function MissionStrip({ game, me }: { game: Game; me: Player | null | undefined }) {
  const hand = game.hand;
  const m = game.missions;
  // Between hands the banner on the felt says what happened, and the buttons need the room.
  if (!hand || hand.variant !== 'missions' || !m || !me || hand.result) return null;
  const mine = m.players[me.id];
  if (!mine) return null;
  const name = (id: string) => (id === me.id ? 'You' : (game.players.find((p) => p.id === id)?.name ?? 'Someone'));
  const leaders = Object.entries(m.players)
    .filter(([id]) => game.players.some((p) => p.id === id))
    .sort((a, b) => b[1].done - a[1].done)
    .slice(0, 3)
    .map(([id, p]) => `${name(id)} ${p.done}`)
    .join(' · ');
  const left = mine.mission ? Math.max(0, MISSION_SWAP_AFTER - (hand.number - mine.since)) : 0;
  const info = mine.mission ? secretMission(mine.mission) : null;
  return (
    <div className="power-strip mission-strip" aria-label={info ? `Your mission: ${info.name}. ${info.text}` : 'Mission complete'}>
      <span className="power-emoji" aria-hidden>
        {info ? info.emoji : '✅'}
      </span>
      <span className="power-text">
        <b>
          {info ? `${info.name} · +${chips(rewardOf(info.id) * game.settings.bigBlind)} each` : 'Mission complete! A new one next hand'}
        </b>
        <small>{info ? info.text : `Race ${m.race}: ${leaders}`}</small>
        {info && (
          <small>
            Race {m.race}: {leaders}
            {left <= 5 ? ` · swaps in ${left} hand${left === 1 ? '' : 's'}` : ''}
          </small>
        )}
      </span>
      <span className="mission-dots" aria-label={`${mine.done} of ${MISSION_GOAL} missions`}>
        {Array.from({ length: MISSION_GOAL }, (_, i) => (
          <i key={i} className={i < mine.done ? 'on' : ''} />
        ))}
      </span>
    </div>
  );
}

/** The banner across the felt at the end of a hand: completed missions, and a race's result. */
export function MissionToast({ game }: { game: Game }) {
  const hand = game.hand;
  const m = game.missions;
  if (!hand?.result || hand.variant !== 'missions') return null;
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? 'Someone';
  const race = m?.last && m.last.hand === hand.number ? m.last : null;
  const done = hand.missionsDone ?? [];
  if (!done.length && !race) return null;
  return (
    <div className="mission-toast pop" role="status" key={`mission-${hand.number}`}>
      {done.map((d) => {
        const total = Object.values(d.paid).reduce((a, b) => a + b, 0);
        const info = secretMission(d.mission);
        return (
          <p key={d.by}>
            <b>🕶️ MISSION COMPLETE</b> {name(d.by)} · {info.emoji} {info.name} · +{chips(total)}
          </p>
        );
      })}
      {race && (
        <p>
          <b>🏁 Race {race.race} over</b>{' '}
          {race.places.map((x, i) => `${i + 1}. ${name(x.id)} ${x.pct > 0 ? '+' : ''}${Math.round(x.pct * 100)}%`).join(' · ')}
        </p>
      )}
    </div>
  );
}
