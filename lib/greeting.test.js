import { describe, expect, it } from 'vitest';
import { avatarInitial, displayNameOrFallback, timeOfDayGreeting } from './greeting';

const at = hour => new Date(2026, 0, 1, hour, 0, 0);

describe('timeOfDayGreeting', () => {
  it('says good morning before midday', () => {
    expect(timeOfDayGreeting(at(8))).toBe('Good morning');
    expect(timeOfDayGreeting(at(11))).toBe('Good morning');
  });
  it('says good afternoon from midday to before 6pm', () => {
    expect(timeOfDayGreeting(at(12))).toBe('Good afternoon');
    expect(timeOfDayGreeting(at(17))).toBe('Good afternoon');
  });
  it('says good evening from 6pm onward', () => {
    expect(timeOfDayGreeting(at(18))).toBe('Good evening');
    expect(timeOfDayGreeting(at(23))).toBe('Good evening');
  });
});

describe('displayNameOrFallback', () => {
  it('uses the trimmed display name when set', () => {
    expect(displayNameOrFallback('  Jhenifer  ')).toBe('Jhenifer');
  });
  it('falls back to a neutral label rather than inventing a name', () => {
    expect(displayNameOrFallback('')).toBe('there');
    expect(displayNameOrFallback(undefined)).toBe('there');
    expect(displayNameOrFallback('   ')).toBe('there');
  });
});

describe('avatarInitial', () => {
  it('uses the first letter, uppercased', () => {
    expect(avatarInitial('jhenifer')).toBe('J');
  });
  it('falls back to a neutral mark when no name is set', () => {
    expect(avatarInitial('')).toBe('·');
    expect(avatarInitial(undefined)).toBe('·');
  });
});
