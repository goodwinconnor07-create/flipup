// Metro, set up so the app can import the shared poker engine in ../src/game (one engine for the
// web app, the server and this app; it's never copied). `@game/*` is mapped in tsconfig.json.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const engine = path.resolve(__dirname, '../src/game');

config.watchFolders = [...(config.watchFolders ?? []), engine];
// The engine has no packages of its own; anything it needs resolves from this app's node_modules.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
