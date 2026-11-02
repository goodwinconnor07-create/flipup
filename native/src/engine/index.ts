// The app's door to the shared poker engine. Screens import from here, never from ../src/game directly,
// so there's one place to see what the app uses. The engine is pure TypeScript with no DOM or Node APIs.
export * from '@game/index';
