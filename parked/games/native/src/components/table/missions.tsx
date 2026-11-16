// Secret Missions at the table: the note over Next hand when someone completes one or a race is settled. Your own
// mission is a card beside your hole cards (mission-card.tsx), laid out like Power Cards.
import { secretMission, type Game } from '@/engine';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** "🕶️ Mission complete: Max · Hero Call · +70" and the race's result, at the end of a hand. */
export function missionNote(game: Game): string | null {
  const hand = game.hand;
  const m = game.missions;
  if (!hand?.result || hand.variant !== 'missions') return null;
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? 'Someone';
  const lines = (hand.missionsDone ?? []).map((d) => `🕶️ Mission complete: ${name(d.by)} · ${secretMission(d.mission).name} · +${chips(Object.values(d.paid).reduce((a, b) => a + b, 0))}`);
  const race = m?.last && m.last.hand === hand.number ? m.last : null;
  if (race) lines.push(`🏁 Race ${race.race} over: ${race.places.map((x, i) => `${i + 1}. ${name(x.id)} ${x.pct > 0 ? '+' : ''}${Math.round(x.pct * 100)}%`).join(' · ')}`);
  return lines.length ? lines.join('\n') : null;
}
