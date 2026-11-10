import { RESEARCH_ENGINE, type ResearchHand, type ResearchRun } from './engine';
import { researchReviewLink, type ResearchMetadata, type ResearchReport } from './protocol';
export interface ResearchCredentials {
  id: string;
  key: string;
  metadata: ResearchMetadata;
  remoteReady: boolean;
}
interface StoredHand {
  id: string;
  runId: string;
  index: number;
  revision: number;
  uploadedRevision: number;
  hand: ResearchHand;
}
let dbPromise: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open('flipup.bot-research', 1);
    r.onupgradeneeded = () => {
      for (const name of ['runs', 'credentials', 'hands']) r.result.createObjectStore(name);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => {
      dbPromise = undefined;
      reject(r.error);
    };
    r.onblocked = () => {
      dbPromise = undefined;
      reject(new Error('Close other FlipUp research tabs, then try again.'));
    };
  }));
}
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
async function read<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await database();
  return request(db.transaction(store).objectStore(store).get(key)) as Promise<T | undefined>;
}
async function write(stores: string[], change: (tx: IDBTransaction) => void): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Research could not be saved on this phone.'));
    try {
      change(tx);
    } catch (e) {
      tx.abort();
      reject(e);
    }
  });
}
export async function loadResearch(): Promise<ResearchRun | null> {
  const id = await read<string>('runs', 'current');
  if (!id) return null;
  const run = await read<ResearchRun>('runs', id);
  if (!run) return null;
  if (run.protocol !== 'bot-research-1' || run.engine !== RESEARCH_ENGINE)
    throw new Error('This saved research session needs its original app version. Download its report before starting another.');
  return { ...run, paused: true };
}
export async function createResearchStorage(run: ResearchRun): Promise<void> {
  const key = [...crypto.getRandomValues(new Uint8Array(32))].map((n) => n.toString(16).padStart(2, '0')).join('');
  const credentials: ResearchCredentials = {
    id: run.id,
    key,
    remoteReady: false,
    metadata: { protocol: run.protocol, engine: run.engine, seed: run.seed, limit: run.limit, startedAt: run.startedAt },
  };
  await write(['runs', 'credentials'], (tx) => {
    tx.objectStore('runs').put(run, run.id);
    tx.objectStore('runs').put(run.id, 'current');
    tx.objectStore('credentials').put(credentials, run.id);
  });
}
export async function saveResearch(run: ResearchRun, hand?: ResearchHand): Promise<void> {
  let conflict = false;
  await write(['runs', 'hands'], (tx) => {
    const runs = tx.objectStore('runs'),
      prior = runs.get(run.id);
    prior.onsuccess = () => {
      if ((prior.result as ResearchRun | undefined)?.checkpointRevision !== run.checkpointRevision) {
        conflict = true;
        tx.abort();
        return;
      }
      run.checkpointRevision++;
      runs.put(run, run.id);
      if (hand) {
        const store = tx.objectStore('hands'),
          id = `${run.id}:${String(hand.index).padStart(3, '0')}`,
          request = store.get(id);
        request.onsuccess = () => {
          const old = request.result as StoredHand | undefined;
          store.put(
            {
              id,
              runId: run.id,
              index: hand.index,
              revision: (old?.revision ?? 0) + 1,
              uploadedRevision: old?.uploadedRevision ?? 0,
              hand,
            } satisfies StoredHand,
            id,
          );
        };
      }
    };
  }).catch((error) => {
    if (conflict) throw new Error('This research session changed in another tab. Reload this page to continue from the saved hand.');
    throw error;
  });
}
export async function researchHands(id: string): Promise<StoredHand[]> {
  const db = await database();
  return request(
    db
      .transaction('hands')
      .objectStore('hands')
      .getAll(IDBKeyRange.bound(`${id}:`, `${id}:\uffff`)),
  );
}
export async function localResearchReport(id: string): Promise<ResearchReport> {
  const credentials = await read<ResearchCredentials>('credentials', id);
  if (!credentials) throw new Error('Research session was not found on this phone.');
  return { metadata: credentials.metadata, expiresAt: 0, hands: (await researchHands(id)).map((r) => r.hand) };
}
export async function privateResearchLink(id: string): Promise<string> {
  const credentials = await read<ResearchCredentials>('credentials', id);
  if (!credentials) throw new Error('Research session was not found.');
  return researchReviewLink(location.origin, id, credentials.key);
}
export async function researchUploadStatus(id: string) {
  const hands = await researchHands(id);
  return { saved: hands.length, uploaded: hands.filter((h) => h.uploadedRevision >= h.revision).length };
}
async function api(path: string, key: string, method: string, body?: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? `Upload failed (${response.status}). Your hands are still saved on this phone.`);
  return result;
}
const flights = new Map<string, Promise<void>>();
/** Resumable and idempotent; newer notes cannot be acknowledged by an older in-flight upload. */
export function syncResearch(id: string): Promise<void> {
  const flight = flights.get(id);
  if (flight) return flight;
  const work = (async () => {
    const credentials = await read<ResearchCredentials>('credentials', id);
    if (!credentials) throw new Error('Missing private research key.');
    if (!credentials.remoteReady) {
      await api('/api/bot-research', credentials.key, 'POST', { id, key: credentials.key, metadata: credentials.metadata });
      credentials.remoteReady = true;
      await write(['credentials'], (tx) => {
        tx.objectStore('credentials').put(credentials, id);
      });
    }
    for (;;) {
      const pending = (await researchHands(id)).filter((h) => h.uploadedRevision < h.revision);
      if (!pending.length) return;
      for (const row of pending) {
        await api(`/api/bot-research/${id}/hands/${row.index}`, credentials.key, 'PUT', { revision: row.revision, hand: row.hand });
        await write(['hands'], (tx) => {
          const store = tx.objectStore('hands'),
            r = store.get(row.id);
          r.onsuccess = () => {
            const latest = r.result as StoredHand;
            if (latest) store.put({ ...latest, uploadedRevision: Math.max(latest.uploadedRevision, row.revision) }, row.id);
          };
        });
      }
    }
  })().finally(() => flights.delete(id));
  flights.set(id, work);
  return work;
}
export async function fetchResearchReport(id: string, key: string): Promise<ResearchReport> {
  let after = -1;
  const hands: ResearchHand[] = [];
  for (let page = 0; page < 16; page++) {
    const report = (await api(`/api/bot-research/${id}?after=${after}`, key, 'GET')) as ResearchReport & { next: number | null };
    if (!report || !report.metadata || !Array.isArray(report.hands)) throw new Error('The server returned an invalid research report.');
    hands.push(...report.hands);
    if (report.next === null) return { ...report, hands };
    if (!Number.isInteger(report.next) || report.next <= after) throw new Error('Invalid research report page.');
    after = report.next;
  }
  throw new Error('Research report exceeded the supported session length.');
}
export async function deleteResearchUpload(id: string, key: string): Promise<void> {
  await api(`/api/bot-research/${id}`, key, 'DELETE');
}
export async function researchArchives(): Promise<ResearchCredentials[]> {
  const db = await database();
  return request(db.transaction('credentials').objectStore('credentials').getAll());
}
