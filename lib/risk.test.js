import { describe, expect, it } from 'vitest';
import { calculatePressure } from './risk';
describe('transparent pressure score',()=>{
 it('returns low for supportive answers',()=>expect(calculatePressure({mood:1,sleep:5,focus:5,initiation:5,confidence:5}).band).toBe('Low'));
 it('returns higher for overloaded answers',()=>expect(calculatePressure({mood:4,sleep:1,focus:1,initiation:1,confidence:1})).toMatchObject({score:100,band:'Higher'}));
 it('uses the documented weighting',()=>expect(calculatePressure({mood:2,sleep:3,focus:3,initiation:3,confidence:3}).score).toBe(45));
 it('rejects incomplete input',()=>expect(()=>calculatePressure({mood:1})).toThrow());
});
