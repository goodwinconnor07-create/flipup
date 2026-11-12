// Finds code nothing ships: files that no entry point reaches, and exports nothing uses. Run with `npm run dead`.
//
// Why it exists: when a feature is taken out, the code and tests that served only it tend to stay (AI twins did: their
// memory, sharing and tests kept running in CI long after the feature was gone). Run this after removing a feature, and
// delete what it lists in the same change, with the tests. It only reports; it never deletes and never fails a build.
//
// "In the product" means reachable by imports from the website (`src/main.tsx`), the Worker (`worker/index.ts`) or an
// iPhone screen (`native/src/app/**`, `native/modules/**`). Tests and scripts don't count: a function only a test or a
// lab script calls is still dead weight in the app. Code that is hidden behind a flag on purpose (Legends, the Campaign:
// see `EXTRAS_ON` in `src/game/scope.ts`) is still reached by imports, so it isn't listed; ask the owner before removing it.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skip = /node_modules|\/dist\/|\/\.expo|\/parked\/|\/\.git\/|worker-configuration/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skip.test(p + '/')) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = ['src', 'worker', 'native/src', 'native/modules', 'native/tests', 'scripts', 'e2e'].map((d) => join(root, d)).flatMap((d) => (statSync(d, { throwIfNoEntry: false })?.isDirectory() ? walk(d) : []));
const all = new Set(files);
const rel = (f) => f.slice(root.length + 1);
const isTest = (f) => /\.test\.tsx?$|\/tests\/|\/e2e\//.test(f);
const isScript = (f) => rel(f).startsWith('scripts/');

// How the app writes its imports: relative, `@game/*`, `@design/*`, `@train/*`, `@/engine` and `@/*`.
const alias = [
  ['@game/', join(root, 'src/game/')],
  ['@design/', join(root, 'src/design/')],
  ['@train/', join(root, 'src/train/')],
  ['@/', join(root, 'native/src/')],
];
function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else if (spec === '@/engine') base = join(root, 'native/src/engine/index');
  else {
    const a = alias.find(([k]) => spec.startsWith(k));
    if (!a) return null;
    base = a[1] + spec.slice(a[0].length);
  }
  for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx']) if (all.has(c)) return c;
  return null;
}

const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const graph = new Map();
for (const f of files) {
  const deps = new Set();
  for (const m of text.get(f).matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const r = resolveImport(f, m[1]);
    if (!r) continue;
    deps.add(r);
    // The phone and the web pick a sibling by platform: `x.ios.tsx`, `x.web.ts`.
    const stem = r.replace(/\.tsx?$/, '');
    for (const ext of ['.ios.tsx', '.ios.ts', '.web.tsx', '.web.ts']) if (all.has(stem + ext)) deps.add(stem + ext);
  }
  graph.set(f, deps);
}
function reach(entries) {
  const seen = new Set(entries);
  const stack = [...entries];
  while (stack.length) for (const d of graph.get(stack.pop()) ?? []) if (!seen.has(d)) (seen.add(d), stack.push(d));
  return seen;
}

const product = reach(files.filter((f) => /^(src\/main\.tsx|worker\/index\.ts|native\/src\/app\/|native\/modules\/)/.test(rel(f)) || f.endsWith('.d.ts')));
const viaScripts = reach(files.filter(isScript));
const viaTests = reach(files.filter(isTest));

// ── 1. Files nothing in the product reaches ─────────────────────────────────
const lines = (f) => text.get(f).split('\n').length;
const orphans = files.filter((f) => !isTest(f) && !isScript(f) && !product.has(f));
const byDir = new Map();
for (const f of orphans) {
  const how = viaScripts.has(f) ? 'only lab scripts use it' : viaTests.has(f) ? 'only tests use it' : 'nothing uses it';
  byDir.set(dirname(rel(f)), [...(byDir.get(dirname(rel(f))) ?? []), `${basename(f)} (${lines(f)} lines, ${how})`]);
}
console.log('FILES NOTHING IN THE PRODUCT REACHES');
if (!orphans.length) console.log('  none');
for (const [d, list] of [...byDir].sort()) {
  console.log(`  ${d}`);
  for (const x of list) console.log(`    ${x}`);
}

// ── 2. Exports nothing in the product uses ──────────────────────────────────
const word = (n) => new RegExp(`(?<![\\w$])${n.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
const productFiles = [...product].filter((f) => !isTest(f) && !isScript(f));
const where = /^(src\/(game|state|train|data|design|bot_engine)|worker|native\/src\/(state|components|design))/;
const dead = new Map();
for (const f of productFiles) {
  if (!where.test(rel(f))) continue;
  const t = text.get(f);
  const names = new Set();
  for (const m of t.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of t.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const p of m[1].split(',')) names.add(p.trim().split(/\s+as\s+/).pop().replace(/^type\s+/, ''));
  for (const n of names) {
    if (!n) continue;
    // Used in its own file counts as used (it's just exported for no reason); only an export used nowhere is dead.
    if ((t.match(word(n)) ?? []).length > 1) continue;
    if (productFiles.some((g) => g !== f && word(n).test(text.get(g)))) continue;
    const by = [isTest, isScript].map((is) => files.some((g) => is(g) && word(n).test(text.get(g))));
    dead.set(rel(f), [...(dead.get(rel(f)) ?? []), `${n}${by[0] ? ' [a test uses it]' : ''}${by[1] ? ' [a script uses it]' : ''}`]);
  }
}
console.log('\nEXPORTS NOTHING IN THE PRODUCT USES (and not used inside their own file)');
if (!dead.size) console.log('  none');
for (const [f, list] of [...dead].sort()) {
  console.log(`  ${f}`);
  for (const x of list) console.log(`    ${x}`);
}
console.log(`\n${orphans.length} files, ${[...dead.values()].reduce((a, l) => a + l.length, 0)} exports. A function used only by a function on this list is dead too: delete from the top down and run it again.`);
