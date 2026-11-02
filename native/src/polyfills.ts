// Loaded first (root layout). The engine shuffles and makes ids with Web Crypto; React Native doesn't promise it,
// so fall back to the system's secure random source.
import { getRandomValues } from 'expo-crypto';

const g = globalThis as { crypto?: { getRandomValues?: (a: ArrayBufferView) => ArrayBufferView } };
if (!g.crypto?.getRandomValues) {
  g.crypto = { ...(g.crypto ?? {}), getRandomValues: getRandomValues as never };
}
