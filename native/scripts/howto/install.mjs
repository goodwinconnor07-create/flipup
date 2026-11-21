// Puts the How to Play recorder into this checkout for the shooting build only (.github/workflows/howto-shots.yml):
// copies recorder.tsx into src/ and mounts it on the root layout. Never committed; the app that ships has none of it.
//
//   node scripts/howto/install.mjs
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
copyFileSync(join(here, 'recorder.tsx'), join(root, 'src', 'howto-recorder.tsx'));

const layout = join(root, 'src', 'app', '_layout.tsx');
let src = readFileSync(layout, 'utf8');
if (!src.includes('HowToRecorder')) {
  src = src.replace("import { LaunchCover } from '@/components/launch-cover';", "import { LaunchCover } from '@/components/launch-cover';\nimport { HowToRecorder } from '@/howto-recorder';");
  src = src.replace('<LaunchCover />', '<LaunchCover />\n      <HowToRecorder />');
  if (!src.includes('<HowToRecorder />') || !src.includes("from '@/howto-recorder'")) throw new Error('Could not mount the recorder on _layout.tsx');
  writeFileSync(layout, src);
}
console.log('How to Play recorder installed.');
