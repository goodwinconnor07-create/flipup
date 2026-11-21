// The two Node calls tests/ranges.test.ts makes (the app has no @types/node).
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
}
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
  export function readdirSync(path: string | URL, options: { recursive: true }): string[];
}
