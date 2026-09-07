import { readFileSync } from 'fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// IMPORTANT — how to run this file
// --------------------------------
// These tests exercise the real firestore.rules against a local Firestore
// emulator. They are NOT run as part of `npm test` (the filename
// deliberately doesn't match Vitest's default *.test.js discovery
// pattern), and were NOT executed in the environment these tests were
// written in: that sandbox's network policy blocks downloading the
// emulator binary itself (it comes from storage.googleapis.com, which is
// not on the allowed list there). The rules and the tests below were
// written and reasoned through carefully, but "written correctly" and
// "verified passing" are different claims — this file only supports the
// first until you've actually run it.
//
// To run them yourself (needs the Firebase CLI and Java, both normal to
// have locally):
//   npm install -g firebase-tools        (one-off)
//   npm run test:rules
//
// This intentionally is not wired into `npm test` — it requires the
// emulator to be running, which `npm test` alone cannot provide.

const PROJECT_ID = 'nuvora-rules-test';
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

function dbAs(uid) {
  const ctx = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
  return ctx.firestore();
}

describe('firestore.rules — users/{userId} document', () => {
  it('lets a signed-in user read their own document', async () => {
    const db = dbAs('alice');
    await assertSucceeds(db.collection('users').doc('alice').get());
  });

  it('lets a signed-in user write their own document', async () => {
    const db = dbAs('alice');
    await assertSucceeds(db.collection('users').doc('alice').set({ settings: { calmMode: true } }));
  });

  it('blocks a signed-in user from reading someone else\'s document', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('bob').get());
  });

  it('blocks a signed-in user from writing someone else\'s document', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('bob').set({ settings: {} }));
  });

  it('blocks an unauthenticated request entirely', async () => {
    const db = dbAs(null);
    await assertFails(db.collection('users').doc('alice').get());
  });
});

describe('firestore.rules — nested subcollections (tasks, checkins, reflections)', () => {
  // reflections have no schema requirement, so a generic document is fine
  // there; tasks and checkins need a minimally valid shape or the new
  // schema validation (see below) would reject the setup write itself.
  const validDoc = {
    tasks: { title: 'Example task', done: false },
    checkins: { answers: {}, risk: { score: 40, band: 'Moderate' } },
    reflections: { example: true },
  };

  for (const sub of ['tasks', 'checkins', 'reflections']) {
    it(`lets a signed-in user read/write their own ${sub}`, async () => {
      const db = dbAs('alice');
      const ref = db.collection('users').doc('alice').collection(sub).doc('doc1');
      await assertSucceeds(ref.set(validDoc[sub]));
      await assertSucceeds(ref.get());
    });

    it(`blocks a signed-in user from reading someone else's ${sub}`, async () => {
      const asBob = dbAs('bob');
      await asBob.collection('users').doc('bob').collection(sub).doc('doc1').set(validDoc[sub]);
      const asAlice = dbAs('alice');
      await assertFails(asAlice.collection('users').doc('bob').collection(sub).doc('doc1').get());
    });

    it(`blocks a signed-in user from writing into someone else's ${sub}`, async () => {
      const db = dbAs('alice');
      await assertFails(db.collection('users').doc('bob').collection(sub).doc('doc1').set(validDoc[sub]));
    });

    it(`blocks an unauthenticated request from reading ${sub}`, async () => {
      const db = dbAs(null);
      await assertFails(db.collection('users').doc('alice').collection(sub).doc('doc1').get());
    });
  }
});

describe('firestore.rules — task schema validation', () => {
  it('accepts a valid task', async () => {
    const db = dbAs('alice');
    await assertSucceeds(db.collection('users').doc('alice').collection('tasks').doc('t1').set({
      title: 'Read chapter 2', done: false, priority: 'high', module: 'Dissertation', due: '2026-10-01',
    }));
  });

  it('rejects a task with no title', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set({ done: false }));
  });

  it('rejects a task whose title is not a string', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set({ title: 12345, done: false }));
  });

  it('rejects a task whose done field is not a boolean', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set({ title: 'x', done: 'yes' }));
  });

  it('rejects a task with a priority outside the allowed enum', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set({ title: 'x', done: false, priority: 'urgent!!' }));
  });

  it('accepts a task with no priority field at all (it is optional)', async () => {
    const db = dbAs('alice');
    await assertSucceeds(db.collection('users').doc('alice').collection('tasks').doc('t1').set({ title: 'x', done: false }));
  });

  it('a partial update (matching lib/store.js updateTask) is validated against the resulting merged document', async () => {
    const db = dbAs('alice');
    const ref = db.collection('users').doc('alice').collection('tasks').doc('t1');
    await ref.set({ title: 'Original', done: false, priority: 'normal' });
    // Only changing the title — done/priority are untouched by this write,
    // but rules still see (and must accept) the full resulting document.
    await assertSucceeds(ref.update({ title: 'Edited title' }));
  });
});

describe('firestore.rules — check-in schema validation', () => {
  it('accepts a valid scored check-in', async () => {
    const db = dbAs('alice');
    await assertSucceeds(db.collection('users').doc('alice').collection('checkins').doc('c1').set({
      answers: { mood: 2, sleep: 3, focus: 3, initiation: 3, confidence: 3 },
      risk: { score: 45, band: 'Moderate', message: 'x' },
    }));
  });

  it('accepts an incomplete check-in with risk explicitly null (the "not sure" path)', async () => {
    const db = dbAs('alice');
    await assertSucceeds(db.collection('users').doc('alice').collection('checkins').doc('c1').set({
      answers: {}, risk: null, incomplete: true,
    }));
  });

  it('rejects a score above 100', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('checkins').doc('c1').set({
      risk: { score: 150, band: 'Higher' },
    }));
  });

  it('rejects a negative score', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('checkins').doc('c1').set({
      risk: { score: -5, band: 'Low' },
    }));
  });

  it('rejects a band outside Low/Moderate/Higher', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('checkins').doc('c1').set({
      risk: { score: 50, band: 'Severe' },
    }));
  });

  it('rejects a non-numeric score', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('checkins').doc('c1').set({
      risk: { score: 'high', band: 'Higher' },
    }));
  });
});

describe('firestore.rules — deletion (matches lib/store.js delete* functions)', () => {
  it('lets a signed-in user delete their own documents', async () => {
    const db = dbAs('alice');
    const ref = db.collection('users').doc('alice').collection('tasks').doc('t1');
    await ref.set({ title: 'x', done: false });
    await assertSucceeds(ref.delete());
  });

  it('blocks a signed-in user from deleting someone else\'s documents', async () => {
    const asBob = dbAs('bob');
    await asBob.collection('users').doc('bob').collection('tasks').doc('t1').set({ title: 'x', done: false });
    const asAlice = dbAs('alice');
    await assertFails(asAlice.collection('users').doc('bob').collection('tasks').doc('t1').delete());
  });

  it('lets a signed-in user delete their own top-level users/{uid} document (account data wipe)', async () => {
    const db = dbAs('alice');
    await db.collection('users').doc('alice').set({ settings: {} });
    await assertSucceeds(db.collection('users').doc('alice').delete());
  });
});
