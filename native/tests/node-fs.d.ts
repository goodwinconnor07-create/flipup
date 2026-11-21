// The two Node calls tests/ranges.test.ts makes (the app has no @types/node).
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
}
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
  export function readdirSync(path: string | URL, options: { recursive: true }): string[];
}
// What tests/worklet-functions.test.ts uses for its canary file.
declare module 'node:fs' {
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options: { recursive: true; force: true }): void;
}
declare module 'node:os' {
  export function tmpdir(): string;
}
declare module 'node:module' {
  export function createRequire(from: string): (id: string) => unknown;
}
