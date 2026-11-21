// Prints every game in VARIANTS with its name, field colour and small picture as SVG (the same shapes the app draws),
// for the store art.   npx tsx store/scripts/game-art.ts > store/scripts/games-13.json
import { gameLook, gameThumb, prims, type Prim } from '../../src/design/gameArt';
import { VARIANTS } from '../../src/game/variants';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function d(p: Prim): string {
  if (p.tag === 'g') return `<g${p.t ? ` transform="${p.t}"` : ''}${p.opacity != null ? ` opacity="${p.opacity}"` : ''}>${p.kids.map(d).join('')}</g>`;
  if (p.tag === 'text') return `<text x="${p.x}" y="${p.y}" font-family="Inter Display, Inter, sans-serif" font-size="${p.size}" font-weight="${p.weight}" text-anchor="${p.anchor}" fill="${p.fill}"${p.opacity != null ? ` opacity="${p.opacity}"` : ''}>${esc(p.text)}</text>`;
  return `<path d="${p.d}" fill="${p.fill}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw}"` : ''} stroke-linejoin="round" stroke-linecap="round"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}${p.opacity != null ? ` opacity="${p.opacity}"` : ''}${p.t ? ` transform="${p.t}"` : ''}/>`;
}
console.log(JSON.stringify(VARIANTS.map((v) => ({ id: v.id, name: v.name, field: gameLook(v.id).card[0], svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${prims(gameThumb(v.id)).map(d).join('')}</svg>` }))));
