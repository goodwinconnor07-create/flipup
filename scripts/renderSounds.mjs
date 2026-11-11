// Renders the web's synthesised table sounds (src/ui/sound.ts) to WAV files for the iPhone app, so both play the
// same sounds. Each sound is played into Chromium's OfflineAudioContext by the real sound.ts, then saved.
// Run after changing a sound in sound.ts:  node scripts/renderSounds.mjs
// (Needs Playwright's Chromium; in the cloud sandbox set CHROMIUM_PATH=/opt/pw-browsers/chromium if it can't find it.)
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

/** The made-in-code sounds the table uses. The four recorded ones are copied from public/sounds as they are. */
// deal, flip, check and fold are recordings now (scripts/recordedSounds.sh), so they aren't rendered here.
const SOUNDS = ['turn', 'tick', 'win', 'collect', 'pop', 'spook', 'dice', 'sting', 'splash'];
const OUT = new URL('../native/assets/sounds/', import.meta.url);
const RATE = 44100;

const bundle = await build({ entryPoints: [new URL('../src/ui/sound.ts', import.meta.url).pathname], bundle: true, format: 'iife', globalName: 'Sound', write: false });
const code = bundle.outputFiles[0].text;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
mkdirSync(OUT, { recursive: true });
for (const name of SOUNDS) {
  const page = await browser.newPage();
  // sound.ts makes its own AudioContext: hand it an offline one, three seconds long, and record what it plays.
  await page.setContent('<!doctype html><title>sounds</title>');
  await page.evaluate((rate) => {
    window.__offline = new OfflineAudioContext(1, rate * 3, rate);
    window.AudioContext = function () {
      return window.__offline;
    };
  }, RATE);
  await page.addScriptTag({ content: code });
  const samples = await page.evaluate(async (n) => {
    window.Sound.playSound(n);
    const buf = await window.__offline.startRendering();
    const data = buf.getChannelData(0);
    // Trim the silence at the end.
    let end = data.length;
    while (end > 0 && Math.abs(data[end - 1]) < 1e-4) end--;
    return Array.from(data.subarray(0, Math.min(data.length, end + 441)));
  }, name);
  await page.close();
  writeFileSync(new URL(`${name}.wav`, OUT), wav(samples));
  console.log(`${name}.wav  ${(samples.length / RATE).toFixed(2)}s`);
}
await browser.close();

/** 16-bit mono PCM. */
function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + samples.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24);
  b.writeUInt32LE(RATE * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return b;
}
