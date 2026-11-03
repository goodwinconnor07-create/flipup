// Metro, set up so the app can import the shared poker engine in ../src/game (one engine for the web app, the
// server and this app; it's never copied), the shared design tokens in ../src/design, and the finish page's
// stats (../src/train/tableStats.ts, pure, over the engine). `@game/*`,
// `@design/*` and `@train/*` are mapped in tsconfig.json.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const shared = ['../src/game', '../src/design', '../src/train'].map((dir) => path.resolve(__dirname, dir));

config.watchFolders = [...(config.watchFolders ?? []), ...shared];
// The engine has no packages of its own; anything it needs resolves from this app's node_modules.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
