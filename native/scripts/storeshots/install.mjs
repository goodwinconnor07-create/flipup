// Puts the App Store screenshots' recorder into this checkout for the shooting build only
// (.github/workflows/store-shots.yml): copies recorder.tsx into src/ and mounts it on the root layout. Never
// committed; the app that ships has none of it.
//
//   node scripts/storeshots/install.mjs
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
copyFileSync(join(here, 'recorder.tsx'), join(root, 'src', 'store-recorder.tsx'));

const layout = join(root, 'src', 'app', '_layout.tsx');
let src = readFileSync(layout, 'utf8');
if (!src.includes('StoreRecorder')) {
  src = src.replace("import { LaunchCover } from '@/components/launch-cover';", "import { LaunchCover } from '@/components/launch-cover';\nimport { StoreRecorder } from '@/store-recorder';");
  src = src.replace('<LaunchCover />', '<LaunchCover />\n      <StoreRecorder />');
  if (!src.includes('<StoreRecorder />') || !src.includes("from '@/store-recorder'")) throw new Error('Could not mount the recorder on _layout.tsx');
  writeFileSync(layout, src);
}
console.log('App Store screenshots recorder installed.');
