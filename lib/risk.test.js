import { describe, expect, it } from 'vitest';
import { bandFromScore, calculatePressure } from './risk';
describe('transparent pressure score',()=>{
 it('returns low for supportive answers',()=>expect(calculatePressure({mood:1,sleep:5,focus:5,initiation:5,confidence:5}).band).toBe('Low'));
 it('returns higher for overloaded answers',()=>expect(calculatePressure({mood:4,sleep:1,focus:1,initiation:1,confidence:1})).toMatchObject({score:100,band:'Higher'}));
 it('uses the documented weighting',()=>expect(calculatePressure({mood:2,sleep:3,focus:3,initiation:3,confidence:3}).score).toBe(45));
 it('rejects incomplete input',()=>expect(()=>calculatePressure({mood:1})).toThrow());
});

describe('minimum and maximum values', () => {
  it('the most supportive possible answers score exactly 0', () => {
    expect(calculatePressure({ mood: 1, sleep: 5, focus: 5, initiation: 5, confidence: 5 }).score).toBe(0);
  });
  it('the most overloaded possible answers score exactly 100', () => {
    expect(calculatePressure({ mood: 4, sleep: 1, focus: 1, initiation: 1, confidence: 1 }).score).toBe(100);
  });
});

describe('Low/Moderate and Moderate/Higher boundaries', () => {
  it('bandFromScore: 33 is Low, 34 is Moderate (exact boundary)', () => {
    expect(bandFromScore(33).band).toBe('Low');
    expect(bandFromScore(34).band).toBe('Moderate');
  });
  it('bandFromScore: 66 is Moderate, 67 is Higher (exact boundary)', () => {
    expect(bandFromScore(66).band).toBe('Moderate');
    expect(bandFromScore(67).band).toBe('Higher');
  });
  it('bandFromScore: 0 and 100 are the extremes of Low and Higher', () => {
    expect(bandFromScore(0).band).toBe('Low');
    expect(bandFromScore(100).band).toBe('Higher');
  });
});

describe('each individual factor', () => {
  // Holds every other answer at its most supportive value so the factor
  // under test is isolated as the only thing moving the score.
  const base = { mood: 1, sleep: 5, focus: 5, initiation: 5, confidence: 5 };

  it('workload (mood) alone moves the score, weighted at 30%', () => {
    const result = calculatePressure({ ...base, mood: 4 });
    expect(result.factors.workload).toBe(100);
    expect(result.score).toBe(30);
  });
  it('task initiation alone moves the score, weighted at 25%', () => {
    const result = calculatePressure({ ...base, initiation: 1 });
    expect(result.factors.taskInitiation).toBe(100);
    expect(result.score).toBe(25);
  });
  it('focus alone moves the score, weighted at 20%', () => {
    const result = calculatePressure({ ...base, focus: 1 });
    expect(result.factors.focus).toBe(100);
    expect(result.score).toBe(20);
  });
  it('rest (sleep) alone moves the score, weighted at 15%', () => {
    const result = calculatePressure({ ...base, sleep: 1 });
    expect(result.factors.rest).toBe(100);
    expect(result.score).toBe(15);
  });
  it('confidence alone moves the score, weighted at 10%', () => {
    const result = calculatePressure({ ...base, confidence: 1 });
    expect(result.factors.confidence).toBe(100);
    expect(result.score).toBe(10);
  });
});

describe('invalid input (distinct from merely incomplete input)', () => {
  it('rejects a value below the valid range', () => {
    expect(() => calculatePressure({ mood: 0, sleep: 3, focus: 3, initiation: 3, confidence: 3 })).toThrow();
  });
  it('rejects a value above the valid range', () => {
    expect(() => calculatePressure({ mood: 5, sleep: 3, focus: 3, initiation: 3, confidence: 3 })).toThrow();
  });
  it('rejects a non-integer value', () => {
    expect(() => calculatePressure({ mood: 2.5, sleep: 3, focus: 3, initiation: 3, confidence: 3 })).toThrow();
  });
  it('rejects a non-numeric value (e.g. the "unsure" sentinel reaching this function unconverted)', () => {
    expect(() => calculatePressure({ mood: 'unsure', sleep: 3, focus: 3, initiation: 3, confidence: 3 })).toThrow();
  });
  it('rejects null and undefined input entirely', () => {
    expect(() => calculatePressure(null)).toThrow();
    expect(() => calculatePressure(undefined)).toThrow();
  });
});
