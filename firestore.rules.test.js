import {
  describe,
  expect,
  it,
} from 'vitest';

import fs from 'node:fs';
import path from 'node:path';

const rulesPath =
  path.join(
    process.cwd(),
    'firestore.rules'
  );

const rules =
  fs.readFileSync(
    rulesPath,
    'utf8'
  );

describe(
  'Firestore security rules',
  () => {
    it(
      'requires authenticated ownership of the user branch',
      () => {
        expect(rules).toContain(
          'request.auth != null'
        );

        expect(rules).toContain(
          'request.auth.uid == userId'
        );
      }
    );

    it(
      'validates task writes instead of allowing arbitrary task documents',
      () => {
        expect(rules).toContain(
          'function validTask(data)'
        );

        expect(rules).toContain(
          'validTask('
        );

        expect(rules).toContain(
          'request.resource.data'
        );
      }
    );

    it(
      'restricts task priority to known Nuvora values',
      () => {
        expect(rules).toContain(
          "data.priority in ["
        );

        expect(rules).toContain(
          "'low'"
        );

        expect(rules).toContain(
          "'normal'"
        );

        expect(rules).toContain(
          "'high'"
        );
      }
    );

    it(
      'validates check-in and pressure-result writes',
      () => {
        expect(rules).toContain(
          'function validCheckin(data)'
        );

        expect(rules).toContain(
          'function validRisk(data)'
        );

        expect(rules).toContain(
          "'Low'"
        );

        expect(rules).toContain(
          "'Moderate'"
        );

        expect(rules).toContain(
          "'Higher'"
        );
      }
    );

    it(
      'validates reflections and the settings/stats fields on users/{uid}',
      () => {
        expect(rules).toContain(
          'match /reflections/{reflectionId}'
        );

        expect(rules).toContain(
          'function validReflection(data)'
        );

        // Settings and stats are fields on users/{uid}, not
        // sub-collections, so they are validated on that document.
        expect(rules).toContain(
          'function validUserDoc(data)'
        );

        expect(rules).not.toContain(
          'match /settings/{settingId}'
        );

        expect(rules).not.toContain(
          'match /stats/{statsId}'
        );
      }
    );

    it(
      'caps the stored pressure score at 100, matching the app',
      () => {
        expect(rules).toContain(
          'data.risk.score <= 100'
        );

        expect(rules).not.toContain(
          'data.risk.score <= 120'
        );
      }
    );

    it(
      'uses an explicit default-deny fallback',
      () => {
        expect(rules).toContain(
          'match /{document=**}'
        );

        expect(rules).toContain(
          'allow read, write: if false;'
        );
      }
    );
  }
);