// No worklet may call a function the React Compiler has moved out of it. The compiler lifts a function that captures
// nothing (`const frac = (x) => x - Math.floor(x)` inside a useAnimatedStyle) to the top of the file as a plain
// JavaScript `_temp`; the worklet then calls a non-worklet function on the UI thread, which throws, and a throw in a
// UI-thread frame aborts the app. That shipped in TestFlight build 82: every lobby crashed on the iPhone (the web
// build has no UI thread, so it never showed there). This compiles every file that makes a worklet with the app's own
// Babel setup (the React Compiler on, as in app.config.ts) and checks what each worklet captures. Fix one by writing
// the sum out in place, or with a module-level helper marked 'worklet'.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

const NATIVE = new URL('..', import.meta.url).pathname;
const ROOT = new URL('../src/', import.meta.url).pathname;
/** Just the call this test makes (the app has no Babel types). */
type Babel = { transformFileSync(file: string, opts: object): { code?: string | null } | null };
const babel = createRequire(import.meta.url)('@babel/core') as Babel;
const WORKLET = /\b(useAnimatedStyle|useAnimatedProps|useDerivedValue|useFrameCallback|useAnimatedScrollHandler|useAnimatedReaction|'worklet')/;

/** Every source file under src. */
const files = (): string[] => readdirSync(ROOT, { recursive: true }).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.d.ts')).map((f) => ROOT + f);

/** Compiles like the app's iOS release build: babel-preset-expo with the React Compiler on. */
function compile(file: string): string {
  const opts = {
    babelrc: false,
    configFile: false,
    cwd: NATIVE,
    filename: file,
    presets: [['babel-preset-expo', { 'react-compiler': {} }]],
    caller: { name: 'metro', platform: 'ios', bundler: 'metro', isDev: false, supportsReactCompiler: true, supportsStaticESM: false } as never,
  };
  return babel.transformFileSync(file, opts)?.code ?? '';
}

/** What each worklet in the compiled code captures that the compiler moved out (`_temp`, `_temp2`...). */
function movedOut(code: string): { checked: number; captured: string[] } {
  const captured: string[] = [];
  let checked = 0;
  for (const m of code.matchAll(/const\s*\[([^\]]*)\]\s*=\s*this\.__closure/g)) {
    checked++;
    if (/\b_temp\d*\b/.test(m[1])) captured.push(m[1]);
  }
  return { checked, captured };
}

describe('worklets', () => {
  it('are compiled the way the bug needs to be seen (the check catches the build 82 crash)', () => {
    const crash = `import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
      export function Spin() {
        const clock = useSharedValue(0);
        const style = useAnimatedStyle(() => {
          const frac = (x: number) => x - Math.floor(x);
          return { transform: [{ rotate: \`\${360 * frac(clock.get())}deg\` }] };
        });
        return style;
      }`;
    // The worklets plugin reads the file itself, so the canary is a real (temporary) file.
    const dir = mkdtempSync(`${tmpdir()}/worklet-canary-`);
    const file = `${dir}/canary.tsx`;
    try {
      writeFileSync(file, crash);
      expect(movedOut(compile(file)).captured).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('never call a function the React Compiler moved out of them', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const file of files().filter((f) => WORKLET.test(readFileSync(f, 'utf8')))) {
      const found = movedOut(compile(file));
      checked += found.checked;
      for (const c of found.captured) bad.push(`${file.slice(ROOT.length)}: captures [${c}]`);
    }
    // The check only means something if the worklets plugin ran and named what each worklet captures.
    expect(checked).toBeGreaterThan(20);
    expect(bad).toEqual([]);
  }, 120_000);
});
