// A small in-memory stand-in for 'firebase/firestore', used by component
// tests that need lib/store.js's real Firestore branch to run end to end.
// Documents live in a Map keyed by collection path. serverTimestamp() is
// resolved to a Timestamp-like value on write (as the server does),
// updateDoc() understands dotted field paths ('currentStep.done'), and
// orderBy() sorts by Timestamp.
//
// Usage (vi.mock factories are hoisted, so import inside the factory):
//   vi.mock('firebase/firestore', async () => (await import('@/test/fakeFirestore')).firestoreModule);
//   import { fakeDb, fakeTimestamp } from '@/test/fakeFirestore';

export const fakeDb = { collections: new Map(), clock: 0, failWrites: false };

export function fakeTimestamp(ms) {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toMillis: () => ms, toDate: () => new Date(ms) };
}

export function resetFakeDb() {
  fakeDb.collections.clear();
  fakeDb.clock = 0;
  fakeDb.failWrites = false;
}

const SERVER_TS = { __serverTimestamp: true };

function coll(path) {
  if (!fakeDb.collections.has(path)) fakeDb.collections.set(path, new Map());
  return fakeDb.collections.get(path);
}

function resolveValue(v) {
  if (v === SERVER_TS) return fakeTimestamp(Date.now() + ++fakeDb.clock);
  if (v && typeof v === 'object' && v.__increment !== undefined) return v;
  return v;
}

function setPath(target, dotted, value) {
  const keys = dotted.split('.');
  let obj = target;
  for (const k of keys.slice(0, -1)) {
    obj[k] = obj[k] && typeof obj[k] === 'object' ? { ...obj[k] } : {};
    obj = obj[k];
  }
  obj[keys[keys.length - 1]] = resolveValue(value);
}

function guard() {
  if (fakeDb.failWrites) throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
}

const snapOf = (id, data, path) => ({ id, ref: { path, id }, data: () => data, exists: () => data !== undefined });

export const firestoreModule = {
  collection: (db, ...segs) => ({ path: segs.join('/') }),
  doc: (db, ...segs) => ({ path: segs.slice(0, -1).join('/'), id: segs[segs.length - 1] }),
  query: (ref, ...constraints) => ({ ...ref, constraints }),
  orderBy: (field, dir = 'asc') => ({ field, dir }),
  serverTimestamp: () => SERVER_TS,
  increment: n => ({ __increment: n }),
  addDoc: async (ref, data) => {
    guard();
    const id = `doc-${coll(ref.path).size + 1}-${++fakeDb.clock}`;
    const stored = {};
    for (const [k, v] of Object.entries(data)) stored[k] = resolveValue(v);
    coll(ref.path).set(id, stored);
    return { id };
  },
  getDocs: async q => {
    let docs = [...coll(q.path).entries()].map(([id, data]) => snapOf(id, data, q.path));
    for (const c of q.constraints || []) {
      const sign = c.dir === 'desc' ? -1 : 1;
      const t = v => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);
      docs = docs.sort((a, b) => sign * (t(a.data()[c.field]) - t(b.data()[c.field])));
    }
    return { docs };
  },
  getDoc: async ref => snapOf(ref.id, coll(ref.path).get(ref.id), ref.path),
  setDoc: async (ref, data, opts) => {
    guard();
    const existing = opts?.merge ? coll(ref.path).get(ref.id) || {} : {};
    coll(ref.path).set(ref.id, { ...existing, ...data });
  },
  updateDoc: async (ref, patch) => {
    guard();
    const existing = coll(ref.path).get(ref.id);
    if (!existing) throw Object.assign(new Error('not-found'), { code: 'not-found' });
    const next = { ...existing };
    for (const [k, v] of Object.entries(patch)) setPath(next, k, v);
    coll(ref.path).set(ref.id, next);
  },
  deleteDoc: async ref => {
    guard();
    coll(ref.path).delete(ref.id);
  },
};
