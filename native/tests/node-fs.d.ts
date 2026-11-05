// The two Node calls tests/ranges.test.ts makes (the app has no @types/node).
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
}
