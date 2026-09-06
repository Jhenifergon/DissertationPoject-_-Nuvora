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
  for (const sub of ['tasks', 'checkins', 'reflections']) {
    it(`lets a signed-in user read/write their own ${sub}`, async () => {
      const db = dbAs('alice');
      const ref = db.collection('users').doc('alice').collection(sub).doc('doc1');
      await assertSucceeds(ref.set({ example: true }));
      await assertSucceeds(ref.get());
    });

    it(`blocks a signed-in user from reading someone else's ${sub}`, async () => {
      const asBob = dbAs('bob');
      await asBob.collection('users').doc('bob').collection(sub).doc('doc1').set({ example: true });
      const asAlice = dbAs('alice');
      await assertFails(asAlice.collection('users').doc('bob').collection(sub).doc('doc1').get());
    });

    it(`blocks a signed-in user from writing into someone else's ${sub}`, async () => {
      const db = dbAs('alice');
      await assertFails(db.collection('users').doc('bob').collection(sub).doc('doc1').set({ example: true }));
    });

    it(`blocks an unauthenticated request from reading ${sub}`, async () => {
      const db = dbAs(null);
      await assertFails(db.collection('users').doc('alice').collection(sub).doc('doc1').get());
    });
  }
});

describe('firestore.rules — deletion (matches lib/store.js delete* functions)', () => {
  it('lets a signed-in user delete their own documents', async () => {
    const db = dbAs('alice');
    const ref = db.collection('users').doc('alice').collection('tasks').doc('t1');
    await ref.set({ title: 'x' });
    await assertSucceeds(ref.delete());
  });

  it('blocks a signed-in user from deleting someone else\'s documents', async () => {
    const asBob = dbAs('bob');
    await asBob.collection('users').doc('bob').collection('tasks').doc('t1').set({ title: 'x' });
    const asAlice = dbAs('alice');
    await assertFails(asAlice.collection('users').doc('bob').collection('tasks').doc('t1').delete());
  });

  it('lets a signed-in user delete their own top-level users/{uid} document (account data wipe)', async () => {
    const db = dbAs('alice');
    await db.collection('users').doc('alice').set({ settings: {} });
    await assertSucceeds(db.collection('users').doc('alice').delete());
  });
});
