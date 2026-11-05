// The Node calls the tests make (the app has no @types/node).
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
