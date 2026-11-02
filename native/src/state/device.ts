import { isDeviceId, newId } from '@/engine';

import { save } from './storage';

const KEY = 'flipup.device';

/** A random id for this phone, made on first use (`flipup.device`, like the web). Tables use it to know who's who. */
export function deviceId(): string {
  let saved: unknown = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    saved = null;
  }
  if (isDeviceId(saved)) return saved;
  const id = `d${newId(20)}`;
  save(KEY, id);
  return id;
}
