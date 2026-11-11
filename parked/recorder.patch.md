# How to Play recorder hook

`scripts/shootHowTo.mjs` reads the bots table through `window.__flipupTable`. It was in `native/src/state/session.ts`
(after `noteDay()`), compiled away unless the web build was exported with `EXPO_PUBLIC_RECORDER=1`. It is not in the
shipping app. To re-shoot, paste this back for the export and remove it afterwards:

```ts
if (process.env.EXPO_PUBLIC_RECORDER === '1' && typeof window !== 'undefined') {
  (window as unknown as { __flipupTable: () => Game | null }).__flipupTable = () => session?.game ?? null;
}
```
