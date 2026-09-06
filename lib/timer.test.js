import { describe, expect, it } from 'vitest';
import { formatSeconds } from './timer';

describe('formatSeconds', () => {
  it('formats whole minutes', () => expect(formatSeconds(120)).toBe('2:00'));
  it('pads single-digit seconds', () => expect(formatSeconds(65)).toBe('1:05'));
  it('formats under a minute', () => expect(formatSeconds(9)).toBe('0:09'));
  it('never goes negative', () => expect(formatSeconds(-5)).toBe('0:00'));
  it('rounds fractional seconds', () => expect(formatSeconds(59.6)).toBe('1:00'));
});
