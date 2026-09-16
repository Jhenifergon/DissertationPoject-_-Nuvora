import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PRESSURE_LABELS,
  PRESSURE_WEIGHTS,
} from './pressureConfig';

const EXPECTED_FACTORS = [
  'workload',
  'taskInitiation',
  'focus',
  'rest',
  'confidence',
];

describe(
  'shared pressure-model configuration',
  () => {
    it(
      'contains exactly the five documented scoring factors',
      () => {
        expect(
          Object.keys(
            PRESSURE_WEIGHTS
          )
        ).toEqual(
          EXPECTED_FACTORS
        );

        expect(
          Object.keys(
            PRESSURE_LABELS
          )
        ).toEqual(
          EXPECTED_FACTORS
        );
      }
    );

    it(
      'weights sum to exactly 100% of the self-report score',
      () => {
        const total =
          Object.values(
            PRESSURE_WEIGHTS
          ).reduce(
            (
              sum,
              weight
            ) =>
              sum + weight,
            0
          );

        expect(
          total
        ).toBeCloseTo(
          1,
          10
        );
      }
    );

    it(
      'keeps the documented weight ordering',
      () => {
        expect(
          PRESSURE_WEIGHTS
        ).toEqual({
          workload: 0.30,
          taskInitiation: 0.25,
          focus: 0.20,
          rest: 0.15,
          confidence: 0.10,
        });
      }
    );

    it(
      'exports immutable configuration objects',
      () => {
        expect(
          Object.isFrozen(
            PRESSURE_WEIGHTS
          )
        ).toBe(true);

        expect(
          Object.isFrozen(
            PRESSURE_LABELS
          )
        ).toBe(true);
      }
    );
  }
);