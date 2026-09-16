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
      'has explicit owner-only rules for reflections, settings and stats',
      () => {
        expect(rules).toContain(
          'match /reflections/{reflectionId}'
        );

        expect(rules).toContain(
          'match /settings/{settingId}'
        );

        expect(rules).toContain(
          'match /stats/{statsId}'
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