import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, within, cleanup } from '@testing-library/react';

// Regression test for "I can save a weekly reflection but can't see my
// previous reflections when I come back" — a Firestore-mode bug. Unlike
// NuvoraApp.firebase.test.jsx, lib/store.js is NOT mocked here: its real
// Firestore branch runs against a small in-memory stand-in for
// 'firebase/firestore', so save -> state -> reload -> render is exercised
// end to end.
//
// The starting data mirrors what real accounts hold: ten reflections from
// scripts/seedHistoricalData.mjs (words in a single `text` field) plus one
// the student wrote in the app (`manageable`/`hard`), all with Firestore
// Timestamps. The screen used to render only manageable/hard and cap the
// list at five, so the seeded entries showed as empty date-only cards and
// everything past the fifth was unreachable.

let mockAuthCallback;
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (authObj, cb) => { mockAuthCallback = cb; cb(FAKE_USER); return () => {}; },
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ firebaseEnabled: true, auth: {}, db: {}, reauthenticate: vi.fn(), deleteAccount: vi.fn() }));

// Minimal Firestore: documents live in a Map keyed by collection path.
// serverTimestamp() is resolved to a Timestamp-like value on write, as the
// server does, and orderBy('createdAt', 'desc') sorts by it.
const mockDb = { collections: new Map(), clock: 0 };
function fakeTimestamp(ms) {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toMillis: () => ms, toDate: () => new Date(ms) };
}
const SERVER_TS = { __serverTimestamp: true };
vi.mock('firebase/firestore', () => {
  const coll = path => {
    if (!mockDb.collections.has(path)) mockDb.collections.set(path, new Map());
    return mockDb.collections.get(path);
  };
  const resolve = data => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === SERVER_TS ? fakeTimestamp(Date.now() + ++mockDb.clock) : v]));
  const snapOf = (id, data) => ({ id, data: () => data, exists: () => data !== undefined });
  return {
    collection: (db, ...segs) => ({ path: segs.join('/') }),
    doc: (db, ...segs) => ({ path: segs.slice(0, -1).join('/'), id: segs[segs.length - 1] }),
    query: (ref, ...constraints) => ({ ...ref, constraints }),
    orderBy: (field, dir = 'asc') => ({ field, dir }),
    serverTimestamp: () => SERVER_TS,
    increment: n => n,
    addDoc: async (ref, data) => {
      const id = `doc-${coll(ref.path).size + 1}-${mockDb.clock}`;
      coll(ref.path).set(id, resolve(data));
      return { id };
    },
    getDocs: async q => {
      let docs = [...coll(q.path).entries()].map(([id, data]) => snapOf(id, data));
      for (const c of q.constraints || []) {
        const sign = c.dir === 'desc' ? -1 : 1;
        docs = docs.sort((a, b) => sign * (a.data()[c.field].toMillis() - b.data()[c.field].toMillis()));
      }
      return { docs };
    },
    getDoc: async ref => snapOf(ref.id, coll(ref.path).get(ref.id)),
    setDoc: async () => {},
    updateDoc: async () => {},
    deleteDoc: async () => {},
  };
});

const FAKE_USER = { uid: 'student-1', email: 'student@example.com' };
const DAY = 24 * 60 * 60 * 1000;

function seedFirestore() {
  mockDb.collections.clear();
  mockDb.clock = 0;
  const reflections = new Map();
  for (let i = 1; i <= 10; i++) {
    reflections.set(`synthetic-reflection-${String(i).padStart(2, '0')}`, {
      text: `Seeded reflection number ${i}.`,
      barrier: 'start',
      createdAt: fakeTimestamp(Date.now() - (40 - i * 3) * DAY),
      synthetic: true,
      seedSource: 'historical-demo-v1',
    });
  }
  reflections.set('real-1', { manageable: 'My own earlier entry.', hard: 'Starting earlier.', createdAt: fakeTimestamp(Date.now() - 17.5 * DAY) });
  mockDb.collections.set('users/student-1/reflections', reflections);
}

async function openReflection() {
  await screen.findByText('How are things feeling, there?');
  const nav = document.querySelector('nav');
  fireEvent.click(within(nav).getByRole('button', { name: 'Progress' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Weekly reflection' }));
  await screen.findByRole('heading', { name: 'Weekly reflection' });
}

function pastEntries() {
  return [...document.querySelectorAll('article.panel')].map(a => a.textContent);
}

beforeEach(() => {
  localStorage.setItem('nuvora-onboarding-seen', '1');
  seedFirestore();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Firebase mode: weekly reflection history', () => {
  it('shows existing reflections, including seeded ones stored as `text`, newest first with older ones reachable', async () => {
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);
    await openReflection();

    // Every card shows the student's words, not just a date.
    const entries = pastEntries();
    expect(entries).toHaveLength(5);
    ['Seeded reflection number 10.', 'Seeded reflection number 9.', 'Seeded reflection number 8.', 'My own earlier entry.', 'Seeded reflection number 7.']
      .forEach((text, i) => expect(entries[i]).toContain(text));
    expect(screen.getByText('Your 5 most recent reflections, newest first.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show older reflections (6)' }));
    const all = pastEntries();
    expect(all).toHaveLength(11);
    expect(all[5]).toContain('Seeded reflection number 6.');
    expect(all[10]).toContain('Seeded reflection number 1.');
  });

  it('save -> navigate away -> return -> reload -> sign out and back in: the new reflection stays visible at the top', async () => {
    const NuvoraApp = (await import('./NuvoraApp')).default;
    const { unmount } = render(<NuvoraApp />);
    await openReflection();

    fireEvent.change(screen.getByLabelText('What felt manageable this week?'), { target: { value: 'Writing one paragraph a day.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    await screen.findByText('Saved. Thank you for taking a moment for this.');
    // Immediately visible.
    expect(pastEntries()[0]).toContain('Writing one paragraph a day.');

    // Navigate away and back.
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Weekly reflection' }));
    await screen.findByRole('heading', { name: 'Weekly reflection' });
    expect(pastEntries()[0]).toContain('Writing one paragraph a day.');

    // Reload / reopen: a fresh mount reads everything back from Firestore.
    unmount();
    render(<NuvoraApp />);
    await openReflection();
    expect(pastEntries()[0]).toContain('Writing one paragraph a day.');
    expect(pastEntries()[1]).toContain('Seeded reflection number 10.');

    // Sign out, then back into the same account.
    mockAuthCallback(null);
    await screen.findByText('Welcome to your calm study space');
    mockAuthCallback({ ...FAKE_USER });
    // The app returns to the screen the student was on.
    await screen.findByText('Past reflections');
    expect(pastEntries()[0]).toContain('Writing one paragraph a day.');

    // Existing reflections were never rewritten or removed.
    const stored = mockDb.collections.get('users/student-1/reflections');
    expect(stored.size).toBe(12);
    expect(stored.get('synthetic-reflection-01')).toMatchObject({ text: 'Seeded reflection number 1.', synthetic: true });
    expect(stored.get('real-1')).toMatchObject({ manageable: 'My own earlier entry.' });
  });

  it('does not show the previous account\'s data while the next sign-in is loading', async () => {
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);
    await openReflection();

    mockAuthCallback(null);
    await screen.findByText('Welcome to your calm study space');
    // The screen is remembered across sign-in, so student-2 lands on the
    // reflection screen — it must hold only their own (empty) history,
    // both while their data is still loading and after.
    act(() => mockAuthCallback({ uid: 'student-2', email: 'other@example.com' }));
    expect(screen.queryByText('Past reflections')).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Weekly reflection' });
    expect(screen.queryByText('Past reflections')).not.toBeInTheDocument();
    expect(screen.queryByText(/Seeded reflection/)).not.toBeInTheDocument();
  });
});
