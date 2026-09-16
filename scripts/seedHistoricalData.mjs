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


/*
 * ------------------------------------------------------------
 * CONFIG
 * ------------------------------------------------------------
 */

const PROJECT_ID = 'nuvora-b197f';

const SERVICE_ACCOUNT_PATH =
  './serviceAccountKey.json';

const SEED_SOURCE =
  'historical-demo-v1';


/*
 * ------------------------------------------------------------
 * FIREBASE ADMIN
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
 * HELPERS
 * ------------------------------------------------------------
 */

function timestamp(
  dateString,
  hour = 12
) {
  return Timestamp.fromDate(
    new Date(
      `${dateString}T${String(
        hour
      ).padStart(
        2,
        '0'
      )}:00:00+01:00`
    )
  );
}


function currentStep(
  id,
  text,
  done = false
) {
  return {
    id,
    text,
    done,

    completedAt:
      done
        ? timestamp(
            '2026-09-10',
            14
          )
        : null,
  };
}


/*
 * ------------------------------------------------------------
 * HISTORICAL TASKS
 * ------------------------------------------------------------
 */

const tasks = [
  {
    id: 'synthetic-task-01',
    title:
      'Review dissertation research notes',
    module:
      'Dissertation',
    due:
      '2026-08-05',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-01',
        'Open the research notes and highlight three useful findings.',
        true
      ),
  },

  {
    id: 'synthetic-task-02',
    title:
      'Update literature review references',
    module:
      'Dissertation',
    due:
      '2026-08-08',
    priority:
      'normal',
    bucket:
      'week',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-02',
        'Check five references against the required referencing style.',
        true
      ),
  },

  {
    id: 'synthetic-task-03',
    title:
      'Write prototype requirements',
    module:
      'Dissertation',
    due:
      '2026-08-11',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-03',
        'Write the first three functional requirements.',
        true
      ),
  },

  {
    id: 'synthetic-task-04',
    title:
      'Review accessibility requirements',
    module:
      'Dissertation',
    due:
      '2026-08-14',
    priority:
      'high',
    bucket:
      'week',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-04',
        'Review keyboard and colour-contrast requirements.',
        true
      ),
  },

  {
    id: 'synthetic-task-05',
    title:
      'Prepare ethics documentation',
    module:
      'Dissertation',
    due:
      '2026-08-17',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-05',
        'Review the participant information sheet.',
        true
      ),
  },

  {
    id: 'synthetic-task-06',
    title:
      'Build daily check-in screen',
    module:
      'Dissertation',
    due:
      '2026-08-20',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-06',
        'Create the first check-in question.',
        true
      ),
  },

  {
    id: 'synthetic-task-07',
    title:
      'Implement pressure scoring',
    module:
      'Dissertation',
    due:
      '2026-08-23',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-07',
        'Test the scoring formula with one example check-in.',
        true
      ),
  },

  {
    id: 'synthetic-task-08',
    title:
      'Improve Calm Mode layout',
    module:
      'Dissertation',
    due:
      '2026-08-26',
    priority:
      'normal',
    bucket:
      'week',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-08',
        'Reduce the number of visible actions on the Today screen.',
        true
      ),
  },

  {
    id: 'synthetic-task-09',
    title:
      'Test task management',
    module:
      'Dissertation',
    due:
      '2026-08-29',
    priority:
      'normal',
    bucket:
      'week',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-09',
        'Create, edit and complete one test task.',
        true
      ),
  },

  {
    id: 'synthetic-task-10',
    title:
      'Prepare baseline survey',
    module:
      'Research',
    due:
      '2026-09-02',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-10',
        'Review the first page of survey questions.',
        true
      ),
  },

  {
    id: 'synthetic-task-11',
    title:
      'Review participant consent flow',
    module:
      'Research',
    due:
      '2026-09-04',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-11',
        'Check that participants can decline consent.',
        true
      ),
  },

  {
    id: 'synthetic-task-12',
    title:
      'Improve Overwhelmed Mode',
    module:
      'Dissertation',
    due:
      '2026-09-06',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-12',
        'Test the I do not know where to start pathway.',
        true
      ),
  },

  {
    id: 'synthetic-task-13',
    title:
      'Review Firebase integration',
    module:
      'Dissertation',
    due:
      '2026-09-08',
    priority:
      'normal',
    bucket:
      'week',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-13',
        'Check that saved tasks reload correctly.',
        true
      ),
  },

  {
    id: 'synthetic-task-14',
    title:
      'Run accessibility tests',
    module:
      'Dissertation',
    due:
      '2026-09-10',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-14',
        'Run the automated accessibility test suite.',
        true
      ),
  },

  {
    id: 'synthetic-task-15',
    title:
      'Review dissertation implementation chapter',
    module:
      'Dissertation',
    due:
      '2026-09-12',
    priority:
      'high',
    bucket:
      'today',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-15',
        'Read the implementation chapter introduction.',
        true
      ),
  },

  {
    id: 'synthetic-task-16',
    title:
      'Prepare evaluation screenshots',
    module:
      'Dissertation',
    due:
      '2026-09-14',
    priority:
      'normal',
    bucket:
      'week',
    done:
      true,
    currentStep:
      currentStep(
        'synthetic-step-16',
        'Capture the Today and Progress screens.',
        true
      ),
  },

  {
    id: 'synthetic-task-17',
    title:
      'Check dissertation references',
    module:
      'Dissertation',
    due:
      '2026-09-15',
    priority:
      'normal',
    bucket:
      'week',
    done:
      false,
    currentStep:
      currentStep(
        'synthetic-step-17',
        'Review five references for missing publication details.'
      ),
  },

  {
    id: 'synthetic-task-18',
    title:
      'Update testing evidence',
    module:
      'Dissertation',
    due:
      '2026-09-16',
    priority:
      'high',
    bucket:
      'today',
    done:
      false,
    currentStep:
      currentStep(
        'synthetic-step-18',
        'Add the latest automated test result.'
      ),
  },

  {
    id: 'synthetic-task-19',
    title:
      'Review final application screenshots',
    module:
      'Dissertation',
    due:
      '2026-09-18',
    priority:
      'normal',
    bucket:
      'week',
    done:
      false,
    currentStep:
      currentStep(
        'synthetic-step-19',
        'Choose the clearest Progress dashboard screenshot.'
      ),
  },

  {
    id: 'synthetic-task-20',
    title:
      'Complete dissertation evaluation section',
    module:
      'Dissertation',
    due:
      '2026-09-21',
    priority:
      'high',
    bucket:
      'week',
    done:
      false,
    currentStep:
      currentStep(
        'synthetic-step-20',
        'Write one paragraph explaining the evaluation approach.'
      ),
  },

  {
    id: 'synthetic-task-21',
    title:
      'Proofread final dissertation',
    module:
      'Dissertation',
    due:
      '2026-09-24',
    priority:
      'high',
    bucket:
      'later',
    done:
      false,
    currentStep:
      currentStep(
        'synthetic-step-21',
        'Proofread the first five pages.'
      ),
  },

  {
    id: 'synthetic-task-22',
    title:
      'Prepare final submission files',
    module:
      'Dissertation',
    due:
      '2026-09-25',
    priority:
      'high',
    bucket:
      'later',
    done:
      false,
    currentStep:
      currentStep(
        'synthetic-step-22',
        'Create a folder containing the final report and evidence.'
      ),
  },
];


/*
 * ------------------------------------------------------------
 * HISTORICAL CHECK-INS
 * ------------------------------------------------------------
 */

const checkins = [
  {
    id:
      'synthetic-checkin-01',
    date:
      '2026-08-03',
    score:
      31,
    band:
      'Low',
    factors: {
      workload: 34,
      taskInitiation: 25,
      focus: 25,
      rest: 50,
      confidence: 25,
    },
  },

  {
    id:
      'synthetic-checkin-02',
    date:
      '2026-08-07',
    score:
      46,
    band:
      'Moderate',
    factors: {
      workload: 52,
      taskInitiation: 50,
      focus: 50,
      rest: 25,
      confidence: 50,
    },
  },

  {
    id:
      'synthetic-checkin-03',
    date:
      '2026-08-11',
    score:
      62,
    band:
      'Moderate',
    factors: {
      workload: 68,
      taskInitiation: 75,
      focus: 50,
      rest: 50,
      confidence: 50,
    },
  },

  {
    id:
      'synthetic-checkin-04',
    date:
      '2026-08-15',
    score:
      74,
    band:
      'Higher',
    factors: {
      workload: 82,
      taskInitiation: 75,
      focus: 75,
      rest: 50,
      confidence: 75,
    },
  },

  {
    id:
      'synthetic-checkin-05',
    date:
      '2026-08-19',
    score:
      66,
    band:
      'Moderate',
    factors: {
      workload: 68,
      taskInitiation: 75,
      focus: 75,
      rest: 50,
      confidence: 50,
    },
  },

  {
    id:
      'synthetic-checkin-06',
    date:
      '2026-08-23',
    score:
      55,
    band:
      'Moderate',
    factors: {
      workload: 55,
      taskInitiation: 50,
      focus: 75,
      rest: 50,
      confidence: 50,
    },
  },

  {
    id:
      'synthetic-checkin-07',
    date:
      '2026-08-27',
    score:
      43,
    band:
      'Moderate',
    factors: {
      workload: 40,
      taskInitiation: 50,
      focus: 50,
      rest: 50,
      confidence: 25,
    },
  },

  {
    id:
      'synthetic-checkin-08',
    date:
      '2026-08-31',
    score:
      37,
    band:
      'Moderate',
    factors: {
      workload: 34,
      taskInitiation: 50,
      focus: 25,
      rest: 50,
      confidence: 25,
    },
  },

  {
    id:
      'synthetic-checkin-09',
    date:
      '2026-09-04',
    score:
      69,
    band:
      'Higher',
    factors: {
      workload: 76,
      taskInitiation: 75,
      focus: 75,
      rest: 50,
      confidence: 50,
    },
  },

  {
    id:
      'synthetic-checkin-10',
    date:
      '2026-09-08',
    score:
      58,
    band:
      'Moderate',
    factors: {
      workload: 63,
      taskInitiation: 50,
      focus: 75,
      rest: 50,
      confidence: 50,
    },
  },

  {
    id:
      'synthetic-checkin-11',
    date:
      '2026-09-12',
    score:
      48,
    band:
      'Moderate',
    factors: {
      workload: 50,
      taskInitiation: 50,
      focus: 50,
      rest: 50,
      confidence: 25,
    },
  },

  {
    id:
      'synthetic-checkin-12',
    date:
      '2026-09-15',
    score:
      39,
    band:
      'Moderate',
    factors: {
      workload: 42,
      taskInitiation: 50,
      focus: 25,
      rest: 50,
      confidence: 25,
    },
  },
];


/*
 * ------------------------------------------------------------
 * HISTORICAL REFLECTIONS
 * ------------------------------------------------------------
 */

const reflections = [
  {
    id:
      'synthetic-reflection-01',
    date:
      '2026-08-05',
    text:
      'Breaking the work into one small action made it easier to begin.',
    barrier:
      'start',
  },

  {
    id:
      'synthetic-reflection-02',
    date:
      '2026-08-09',
    text:
      'I had too many things competing for attention today.',
    barrier:
      'big',
  },

  {
    id:
      'synthetic-reflection-03',
    date:
      '2026-08-13',
    text:
      'A short reset helped me return to the task without feeling as stuck.',
    barrier:
      'reset',
  },

  {
    id:
      'synthetic-reflection-04',
    date:
      '2026-08-17',
    text:
      'I managed more once I stopped trying to finish everything at once.',
    barrier:
      'big',
  },

  {
    id:
      'synthetic-reflection-05',
    date:
      '2026-08-22',
    text:
      'Energy was low, so doing a smaller version of the task helped.',
    barrier:
      'energy',
  },

  {
    id:
      'synthetic-reflection-06',
    date:
      '2026-08-27',
    text:
      'Knowing exactly which task to start removed some of the pressure.',
    barrier:
      'start',
  },

  {
    id:
      'synthetic-reflection-07',
    date:
      '2026-09-01',
    text:
      'Today felt manageable after reducing the number of visible tasks.',
    barrier:
      'reset',
  },

  {
    id:
      'synthetic-reflection-08',
    date:
      '2026-09-06',
    text:
      'I needed support wording before I felt comfortable asking for help.',
    barrier:
      'support',
  },

  {
    id:
      'synthetic-reflection-09',
    date:
      '2026-09-10',
    text:
      'The first step was much easier once it was specific and small.',
    barrier:
      'start',
  },

  {
    id:
      'synthetic-reflection-10',
    date:
      '2026-09-14',
    text:
      'There is still a lot to complete, but the workload feels more structured.',
    barrier:
      'big',
  },
];


/*
 * ------------------------------------------------------------
 * WRITE ONE USER
 * ------------------------------------------------------------
 */

async function seedUser(
  user
) {
  const userRef =
    db.collection(
      'users'
    ).doc(
      user.uid
    );

  console.log(
    `\nSeeding: ${
      user.email ??
      user.uid
    }`
  );


  /*
   * TASKS
   */
  for (
    const task of tasks
  ) {
    const {
      id,
      ...taskData
    } = task;

    await userRef
      .collection(
        'tasks'
      )
      .doc(id)
      .set(
        {
          ...taskData,

          synthetic:
            true,

          seedSource:
            SEED_SOURCE,
        },
        {
          merge:
            true,
        }
      );
  }


  /*
   * CHECK-INS
   */
  for (
    const item of checkins
  ) {
    await userRef
      .collection(
        'checkins'
      )
      .doc(
        item.id
      )
      .set(
        {
          answers: {
            syntheticHistory:
              true,
          },

          risk: {
            score:
              item.score,

            band:
              item.band,

            factors:
              item.factors,

            message:
              item.band ===
              'Higher'
                ? "It looks like you're carrying a lot. Let's shrink today to one small step."
                : item.band ===
                    'Moderate'
                  ? "Today's answers suggest that your workload may feel difficult to manage. Let's choose one manageable next step."
                  : 'Your workload feels manageable. Keep going at your own pace.',
          },

          createdAt:
            timestamp(
              item.date
            ),

          synthetic:
            true,

          seedSource:
            SEED_SOURCE,
        },
        {
          merge:
            true,
        }
      );
  }


  /*
   * REFLECTIONS
   */
  for (
    const reflection of reflections
  ) {
    await userRef
      .collection(
        'reflections'
      )
      .doc(
        reflection.id
      )
      .set(
        {
          text:
            reflection.text,

          barrier:
            reflection.barrier,

          createdAt:
            timestamp(
              reflection.date,
              18
            ),

          synthetic:
            true,

          seedSource:
            SEED_SOURCE,
        },
        {
          merge:
            true,
        }
      );
  }


  console.log(
    `✓ ${tasks.length} tasks`
  );

  console.log(
    `✓ ${checkins.length} check-ins`
  );

  console.log(
    `✓ ${reflections.length} reflections`
  );
}


/*
 * ------------------------------------------------------------
 * ALL FIREBASE AUTH USERS
 * ------------------------------------------------------------
 */

async function seedAllUsers() {
  let pageToken =
    undefined;

  let userCount =
    0;

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
      await seedUser(
        user
      );

      userCount++;
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
    `Historical seed complete.`
  );

  console.log(
    `Users updated: ${userCount}`
  );

  console.log(
    `Per user: ${tasks.length} tasks, ${checkins.length} check-ins, ${reflections.length} reflections`
  );

  console.log(
    `Seed source: ${SEED_SOURCE}`
  );

  console.log(
    '--------------------------------\n'
  );
}


seedAllUsers()
  .then(() =>
    process.exit(0)
  )
  .catch(error => {
    console.error(
      '\nSeed failed:',
      error
    );

    process.exit(1);
  });