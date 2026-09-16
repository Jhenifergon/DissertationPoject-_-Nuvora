import { readFile } from 'node:fs/promises';

import {
  cert,
  initializeApp,
} from 'firebase-admin/app';

import {
  getAuth,
} from 'firebase-admin/auth';

import {
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';


const PROJECT_ID =
  'nuvora-b197f';

const SERVICE_ACCOUNT_PATH =
  './serviceAccountKey.json';

const SEED_SOURCE =
  'historical-demo-v1';


/*
 * ------------------------------------------------------------
 * FIREBASE ADMIN SETUP
 * ------------------------------------------------------------
 */

const serviceAccount =
  JSON.parse(
    await readFile(
      SERVICE_ACCOUNT_PATH,
      'utf8'
    )
  );

initializeApp({
  credential:
    cert(serviceAccount),

  projectId:
    PROJECT_ID,
});

const auth =
  getAuth();

const db =
  getFirestore();


/*
 * ------------------------------------------------------------
 * SYNTHETIC PROGRESS PROFILES
 * ------------------------------------------------------------
 *
 * These are demo/testing values only.
 *
 * Each user receives a slightly different usage history so the
 * accounts do not all appear artificially identical.
 */

const PROFILES = [
  {
    stepsCompleted: 24,

    strategyUses: {
      start: 8,
      big: 5,
      energy: 3,
      reset: 6,
      support: 2,
    },
  },

  {
    stepsCompleted: 18,

    strategyUses: {
      start: 4,
      big: 7,
      energy: 5,
      reset: 3,
      support: 1,
    },
  },

  {
    stepsCompleted: 31,

    strategyUses: {
      start: 10,
      big: 6,
      energy: 4,
      reset: 8,
      support: 3,
    },
  },

  {
    stepsCompleted: 14,

    strategyUses: {
      start: 3,
      big: 4,
      energy: 6,
      reset: 5,
      support: 2,
    },
  },
];


/*
 * ------------------------------------------------------------
 * SEED ONE USER
 * ------------------------------------------------------------
 *
 * IMPORTANT:
 *
 * Nuvora's real store.js reads stats from:
 *
 * users/{uid}
 *
 * The stats are therefore a FIELD on the main user document,
 * not a document inside users/{uid}/stats/.
 */

async function seedUser(
  user,
  profile,
  index
) {
  const userRef =
    db
      .collection('users')
      .doc(user.uid);

  const updatedAt =
    Timestamp.fromDate(
      new Date(
        `2026-09-${String(
          10 + (index % 6)
        ).padStart(
          2,
          '0'
        )}T18:00:00+01:00`
      )
    );

  await userRef.set(
    {
      stats: {
        stepsCompleted:
          profile.stepsCompleted,

        strategyUses: {
          start:
            profile.strategyUses.start,

          big:
            profile.strategyUses.big,

          energy:
            profile.strategyUses.energy,

          reset:
            profile.strategyUses.reset,

          support:
            profile.strategyUses.support,
        },
      },

      /*
       * Metadata describing only the synthetic seed.
       *
       * These fields are outside stats because sanitizeStats()
       * intentionally accepts only the actual Progress fields.
       */
      syntheticProgress:
        true,

      progressSeedSource:
        SEED_SOURCE,

      progressSeedUpdatedAt:
        updatedAt,
    },
    {
      merge: true,
    }
  );

  console.log(
    `\nUpdated: ${
      user.email ??
      user.uid
    }`
  );

  console.log(
    `✓ Small steps taken: ${
      profile.stepsCompleted
    }`
  );

  console.log(
    '✓ Strategies used:'
  );

  console.log(
    `  Start: ${
      profile.strategyUses.start
    }`
  );

  console.log(
    `  Break it down: ${
      profile.strategyUses.big
    }`
  );

  console.log(
    `  Low-energy: ${
      profile.strategyUses.energy
    }`
  );

  console.log(
    `  Reset: ${
      profile.strategyUses.reset
    }`
  );

  console.log(
    `  Support: ${
      profile.strategyUses.support
    }`
  );

  console.log(
    `✓ Written to: users/${user.uid}`
  );
}


/*
 * ------------------------------------------------------------
 * SEED ALL FIREBASE AUTH USERS
 * ------------------------------------------------------------
 */

async function seedAllUsers() {
  let pageToken;

  let userIndex = 0;

  do {
    const result =
      await auth.listUsers(
        1000,
        pageToken
      );

    for (
      const user of
      result.users
    ) {
      const profile =
        PROFILES[
          userIndex %
          PROFILES.length
        ];

      await seedUser(
        user,
        profile,
        userIndex
      );

      userIndex++;
    }

    pageToken =
      result.pageToken;

  } while (
    pageToken
  );


  console.log(
    '\n--------------------------------'
  );

  console.log(
    'Progress stats seed complete.'
  );

  console.log(
    `Users updated: ${userIndex}`
  );

  console.log(
    `Seed source: ${SEED_SOURCE}`
  );

  console.log(
    'Stats location: users/{uid}.stats'
  );

  console.log(
    '--------------------------------\n'
  );
}


seedAllUsers()
  .then(() => {
    process.exit(0);
  })

  .catch(error => {
    console.error(
      '\nProgress stats seed failed:',
      error
    );

    process.exit(1);
  });