import withdrawn from './withdrawn.json';
import { describeHand, type Card } from '../game';
import { apiUrl } from '../state/platform';
import { read, write } from '../state/persist';
import { loadBank, loadRecent } from './save';
import type { Colour } from '../gto/types';

export interface ScenarioOption {
  label: string; kind: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  to: number; added: number; freq: number; ev: number; foldEquity: number | null;
}
export interface ScrollScenario {
  schema: 2; id: string; family: string; players: number; hero: number; cards: Card[]; board: Card[];
  pot: number; stacks: number[]; wagers: number[]; toCall: number; minRaiseTo: number; active: boolean[];
  history: { type: string; amount: number; player?: number }[];
  options: ScenarioOption[]; tags: string[]; difficulty: string;
  ranges: { player: number; classes: string[]; combos: number; active: boolean }[];
  assumptions: string;
  quality: { method: string; gapPct: number; iterations: number; heroFrequencyDrift: number; heroEvDrift: number };
}
interface Catalogue { version: string; count: number; items: Pick<ScrollScenario, 'id' | 'family' | 'tags' | 'difficulty' | 'players'>[] }
const CACHE = 'flipup.scenario.cache';
const usable = (s: ScrollScenario) => s?.schema === 2 && !withdrawn.includes(s.id) && s.quality?.gapPct <= .1 && s.quality.heroFrequencyDrift <= .03 && s.quality.heroEvDrift <= .01 && s.options?.length >= 2;
const local = () => read<Record<string, ScrollScenario>>(CACHE) ?? {};
async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(12000), cache: 'no-store' });
  if (!r.ok) throw new Error('Could not download verified scenarios.');
  return r.json() as Promise<T>;
}
function remember(s: ScrollScenario) {
  if (!usable(s)) throw new Error('This scenario has not passed the accuracy checks.');
  const old = local(); delete old[s.id];
  write(CACHE, Object.fromEntries([...Object.entries(old).slice(-199), [s.id, s]]));
  return s;
}
export async function getScenario(id: string): Promise<ScrollScenario> {
  if (withdrawn.includes(id)) throw new Error('This starter scenario was withdrawn and cannot be graded.');
  const saved = [...loadBank(), ...loadRecent()].find(h => h.id === id)?.snapshot;
  if (saved && 'schema' in saved && saved.schema === 2 && usable(saved)) return saved;
  if (usable(local()[id])) return local()[id];
  try { return remember(await get<ScrollScenario>(apiUrl(`/api/gto/scroll/scenarios/${id}`))); }
  catch { return remember(await get<ScrollScenario>(`/gto/scenarios/${id}.json`)); }
}
export async function nextScenario(seen: string[]): Promise<ScrollScenario> {
  let cat: Catalogue;
  try { cat = await get<Catalogue>(apiUrl('/api/gto/scroll/catalogue')); if (!cat.count) throw new Error('empty'); }
  catch { cat = await get<Catalogue>('/gto/scenarios/catalogue.json').catch(() => ({ version: '', count: 0, items: Object.values(local()) })); }
  if (!cat.items.length) throw new Error('Fresh verified scenarios are being prepared. Check for new solves again soon.');
  cat.items = cat.items.filter(s => !withdrawn.includes(s.id));
  if (!cat.items.length) throw new Error('The previous starter pack has been withdrawn. Waiting for validated laptop-generated content.');
  const cached = local(); const recent = seen.slice(-8).map(id => cached[id]?.family).filter(Boolean);
  const fresh = cat.items.filter(s => !seen.includes(s.id));
  const pool = fresh.length ? fresh : cat.items;
  const varied = pool.filter(s => !recent.includes(s.family));
  const candidates = varied.length ? varied : pool;
  if (!fresh.length) {
    const age = new Map(seen.map((id, i) => [id, i]));
    candidates.sort((a, b) => (age.get(a.id) ?? -1) - (age.get(b.id) ?? -1));
    return getScenario(candidates[0].id);
  }
  return getScenario(candidates[Math.floor(Math.random() * candidates.length)].id);
}
export const formatFrequency = (p: number) => p === 0 ? '0%' : p < .01 ? '<1%' : p > .99 && p < 1 ? '>99%' : `${Number((p * 100).toFixed(1))}%`;
export function scenarioGrade(s: ScrollScenario, o: ScenarioOption): { colour: Colour; loss: number; best: ScenarioOption } {
  const best = s.options.reduce((a, b) => b.ev > a.ev ? b : a);
  const loss = Math.max(0, best.ev - o.ev);
  return { best, loss, colour: loss <= Math.max(.02, .005 * s.pot) ? 'green' : loss <= Math.max(.1, .025 * s.pot) ? 'yellow' : 'red' };
}
export function feedback(s: ScrollScenario, o: ScenarioOption): string[] {
  const { best, loss } = scenarioGrade(s, o);
  const lines = [loss <= .005 * s.pot ? 'That gives up very little value in this solution.' : `${best.label} is worth ${loss.toFixed(2)}bb more than this choice.`];
  lines.push(`You have ${describeHand([...s.cards, ...s.board]).detail.toLowerCase()}.`);
  const mix = s.options.filter(x => x.freq > .001);
  lines.push(`The solved mix: ${mix.map(x => `${x.label.toLowerCase()} ${formatFrequency(x.freq)}`).join(', ')}.`);
  if (s.toCall > 0) lines.push(`Calling ${s.toCall.toFixed(2)}bb into ${s.pot.toFixed(2)}bb needs ${(100 * s.toCall / (s.pot + s.toCall)).toFixed(1)}% equity if there is no further betting. The solved EV also includes what happens next.`);
  else if (o.added > 0) lines.push(`A zero-equity bluff risking ${o.added.toFixed(2)}bb needs everyone to fold ${(100 * o.added / (s.pot + o.added)).toFixed(1)}% of the time. Showdown value changes that calculation.`);
  if (o.foldEquity != null) lines.push(`Against your exact cards, the defender folds ${(100 * o.foldEquity).toFixed(1)}% to this size in the solution.`);
  if (s.players > 2) lines.push('With several opponents, ranges and card removal interact. Heads-up defence percentages cannot simply be assigned to each player.');
  return lines;
}
export async function requestSize(s: ScrollScenario, to: number): Promise<string> {
  const r = await fetch(apiUrl('/api/gto/scroll/size'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario: s.id, kind: s.toCall > 0 ? 'raise' : 'bet', to }) });
  const d = await r.json() as { id?: string; detail?: string };
  if (!r.ok || !d.id) throw new Error(d.detail ?? 'That size could not be queued.');
  return d.id;
}
export async function sizeResult(id: string) { return get<{ status: string; result?: { option: ScenarioOption; scenario: ScrollScenario }; error?: string }>(apiUrl(`/api/gto/scroll/jobs/${id}`)); }
