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

// Mirrors the full task document components/screens/Tasks.jsx writes.
const task = (overrides = {}) => ({
  title: 'x', module: 'Other', due: '', priority: 'normal', bucket: 'today', done: false,
  currentStep: { id: 's1', text: 'Open the document.', done: false, completedAt: null },
  ...overrides,
});

describe('firestore.rules — nested subcollections (tasks, checkins, reflections)', () => {
  // reflections have no schema requirement, so a generic document is fine
  // there; tasks and checkins need a minimally valid shape or the new
  // schema validation (see below) would reject the setup write itself.
  const validDoc = {
    tasks: task({ title: 'Example task' }),
    checkins: { answers: {}, risk: { score: 40, band: 'Moderate', factors: {} } },
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
    await assertSucceeds(db.collection('users').doc('alice').collection('tasks').doc('t1').set(task({
      title: 'Read chapter 2', priority: 'high', module: 'Dissertation', due: '2026-10-01',
    })));
  });

  // Each rejection test starts from a VALID task and changes exactly one
  // field, so the write can only fail because of the rule being tested.
  // (Earlier versions wrote documents that were also missing required
  // fields, so they would have failed even without the rule under test.)
  it('rejects a task with no title', async () => {
    const db = dbAs('alice');
    const { title, ...withoutTitle } = task();
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set(withoutTitle));
  });

  it('rejects a task whose title is not a string', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set(task({ title: 12345 })));
  });

  it('rejects a task title longer than 200 characters', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set(task({ title: 'a'.repeat(201) })));
  });

  it('rejects a task whose done field is not a boolean', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set(task({ done: 'yes' })));
  });

  it('rejects a task with a priority outside the allowed enum', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set(task({ priority: 'urgent!!' })));
  });

  it('rejects a task with a bucket outside today/week/later', async () => {
    const db = dbAs('alice');
    await assertFails(db.collection('users').doc('alice').collection('tasks').doc('t1').set(task({ bucket: 'someday' })));
  });

  it('accepts a task with no priority field at all (it is optional)', async () => {
    const db = dbAs('alice');
    const { priority, ...withoutPriority } = task();
    await assertSucceeds(db.collection('users').doc('alice').collection('tasks').doc('t1').set(withoutPriority));
  });

  it('a partial update (matching lib/store.js updateTask) is validated against the resulting merged document', async () => {
    const db = dbAs('alice');
    const ref = db.collection('users').doc('alice').collection('tasks').doc('t1');
    await ref.set(task({ title: 'Original' }));
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
      risk: { score: 45, band: 'Moderate', message: 'x', factors: {} },
    }));
  });

  it('accepts an incomplete check-in with risk explicitly null (the "not sure" path)', async () => {
    const db = dbAs('alice');
    await assertSucceeds(db.collection('users').doc('alice').collection('checkins').doc('c1').set({
      answers: {}, risk: null, incomplete: true,
    }));
  });

  // As with tasks: each rejection starts from a VALID check-in (answers
  // present, factors present) and changes one thing in `risk`, so a
  // failure can only come from the score/band rule itself.
  const checkin = (risk = {}) => ({
    answers: { mood: 2, sleep: 3, focus: 3, initiation: 3, confidence: 3 },
    risk: { score: 45, band: 'Moderate', message: 'x', factors: {}, ...risk },
  });
  const checkinRef = db => db.collection('users').doc('alice').collection('checkins').doc('c1');

  it('accepts the maximum score of exactly 100', async () => {
    await assertSucceeds(checkinRef(dbAs('alice')).set(checkin({ score: 100, band: 'Higher' })));
  });

  it('rejects a score above 100 (101)', async () => {
    await assertFails(checkinRef(dbAs('alice')).set(checkin({ score: 101, band: 'Higher' })));
  });

  it('accepts the minimum score of exactly 0', async () => {
    await assertSucceeds(checkinRef(dbAs('alice')).set(checkin({ score: 0, band: 'Low' })));
  });

  it('rejects a negative score', async () => {
    await assertFails(checkinRef(dbAs('alice')).set(checkin({ score: -5, band: 'Low' })));
  });

  it('rejects a band outside Low/Moderate/Higher', async () => {
    await assertFails(checkinRef(dbAs('alice')).set(checkin({ score: 50, band: 'Severe' })));
  });

  it('rejects a non-numeric score', async () => {
    await assertFails(checkinRef(dbAs('alice')).set(checkin({ score: 'high', band: 'Higher' })));
  });

  it('rejects a scored check-in with no factors', async () => {
    const { factors, ...riskWithoutFactors } = checkin().risk;
    await assertFails(checkinRef(dbAs('alice')).set({ ...checkin(), risk: riskWithoutFactors }));
  });

  it('rejects a check-in with no answers', async () => {
    const { answers, ...withoutAnswers } = checkin();
    await assertFails(checkinRef(dbAs('alice')).set(withoutAnswers));
  });
});

describe('firestore.rules — users/{uid} settings and stats validation', () => {
  const userRef = db => db.collection('users').doc('alice');
  // The exact shape lib/store.js saveSettings() writes (defaultSettings,
  // sanitised), here with a restart point saved by "Stop for now".
  const settings = (overrides = {}) => ({
    calmMode: false, calmTone: true, reducedMotion: false, textScale: 1,
    displayName: 'Sam', hideProgress: false, supportPersonName: '', supportPersonNote: '',
    restartMemory: { taskId: 't1', taskTitle: 'Essay', stepText: 'Write the title.', stoppedAt: '2026-09-29T10:00:00.000Z' },
    ...overrides,
  });

  it('accepts the full settings object the app saves', async () => {
    await assertSucceeds(userRef(dbAs('alice')).set({ settings: settings() }, { merge: true }));
  });

  it('accepts settings with no restart point (restartMemory null)', async () => {
    await assertSucceeds(userRef(dbAs('alice')).set({ settings: settings({ restartMemory: null }) }, { merge: true }));
  });

  it('rejects a setting with the wrong type', async () => {
    await assertFails(userRef(dbAs('alice')).set({ settings: settings({ calmMode: 'yes' }) }, { merge: true }));
  });

  it('rejects a text size outside 0.5–2', async () => {
    await assertFails(userRef(dbAs('alice')).set({ settings: settings({ textScale: 50 }) }, { merge: true }));
  });

  it('rejects a display name longer than 100 characters', async () => {
    await assertFails(userRef(dbAs('alice')).set({ settings: settings({ displayName: 'a'.repeat(101) }) }, { merge: true }));
  });

  it('rejects a restart point whose step text is longer than 500 characters', async () => {
    const restartMemory = { ...settings().restartMemory, stepText: 'a'.repeat(501) };
    await assertFails(userRef(dbAs('alice')).set({ settings: settings({ restartMemory }) }, { merge: true }));
  });

  it('rejects settings that are not a map', async () => {
    await assertFails(userRef(dbAs('alice')).set({ settings: 'calm' }, { merge: true }));
  });

  it('accepts the stats increments recordStepCompleted / recordStrategyUse make', async () => {
    const db = dbAs('alice');
    await assertSucceeds(userRef(db).set({ stats: { stepsCompleted: 1 } }, { merge: true }));
    await assertSucceeds(userRef(db).set({ stats: { strategyUses: { big: 2 } } }, { merge: true }));
  });

  it('rejects stats with a non-numeric step count', async () => {
    await assertFails(userRef(dbAs('alice')).set({ stats: { stepsCompleted: 'many' } }, { merge: true }));
  });

  it('still accepts a settings save on a document with extra seed-script metadata', async () => {
    // scripts/seedProgressStats.mjs adds keys such as syntheticProgress
    // next to stats. Because merge writes are checked against the whole
    // resulting document, extra keys must not block later settings saves.
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx.firestore().collection('users').doc('alice').set({
        stats: { stepsCompleted: 3, strategyUses: { start: 1 } },
        syntheticProgress: true, progressSeedSource: 'seed',
      });
    });
    await assertSucceeds(userRef(dbAs('alice')).set({ settings: settings({ calmMode: true }) }, { merge: true }));
  });

  it('refuses the unused /settings and /stats sub-collections (default deny)', async () => {
    const db = dbAs('alice');
    await assertFails(userRef(db).collection('settings').doc('s1').set({ calmMode: true }));
    await assertFails(userRef(db).collection('stats').doc('s1').set({ stepsCompleted: 1 }));
  });
});

describe('firestore.rules — reflection size validation', () => {
  const reflectionRef = db => db.collection('users').doc('alice').collection('reflections').doc('r1');

  it('accepts a reflection in the shape the app saves', async () => {
    await assertSucceeds(reflectionRef(dbAs('alice')).set({ manageable: 'Emailing my tutor.', hard: 'Starting earlier.', createdAt: new Date() }));
  });

  it('accepts a reflection in the shape the seed script saves', async () => {
    await assertSucceeds(reflectionRef(dbAs('alice')).set({ text: 'A calmer week.', barrier: 'start', createdAt: new Date() }));
  });

  it('rejects a reflection answer longer than 2000 characters', async () => {
    await assertFails(reflectionRef(dbAs('alice')).set({ manageable: 'a'.repeat(2001), hard: '' }));
  });

  it('rejects a reflection answer that is not text', async () => {
    await assertFails(reflectionRef(dbAs('alice')).set({ manageable: 42 }));
  });
});

describe('firestore.rules — deletion (matches lib/store.js delete* functions)', () => {
  it('lets a signed-in user delete their own documents', async () => {
    const db = dbAs('alice');
    const ref = db.collection('users').doc('alice').collection('tasks').doc('t1');
    await ref.set(task());
    await assertSucceeds(ref.delete());
  });

  it('blocks a signed-in user from deleting someone else\'s documents', async () => {
    const asBob = dbAs('bob');
    await asBob.collection('users').doc('bob').collection('tasks').doc('t1').set(task());
    const asAlice = dbAs('alice');
    await assertFails(asAlice.collection('users').doc('bob').collection('tasks').doc('t1').delete());
  });

  it('lets a signed-in user delete their own top-level users/{uid} document (account data wipe)', async () => {
    const db = dbAs('alice');
    await db.collection('users').doc('alice').set({ settings: {} });
    await assertSucceeds(db.collection('users').doc('alice').delete());
  });
});
