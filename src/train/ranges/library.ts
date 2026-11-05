// Every range training hand: the hand-written ones (scenarios.ts) and the generated ones (generated.json, built by
// generate.ts). The generated file is big, so it's a separate download, fetched when range training opens.

import url from './generated.json?url';
import type { Scenario } from './model';
import { SCENARIOS, unpack } from './scenarios';

let loading: Promise<Scenario[]> | null = null;

/** All the hands, hand-written first. */
export function loadHands(): Promise<Scenario[]> {
  loading ??= fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`hands: ${r.status}`);
      return r.json() as Promise<Scenario[]>;
    })
    .then((raw) => [...SCENARIOS, ...unpack(raw)])
    .catch((e) => {
      loading = null;
      throw e;
    });
  return loading;
}
