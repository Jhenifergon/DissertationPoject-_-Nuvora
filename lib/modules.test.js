import { describe, expect, it } from 'vitest';
import { availableModules, moduleColor } from './modules';

describe('availableModules', () => {
  it('returns the starter set for a brand-new account with no tasks', () => {
    expect(availableModules([])).toEqual(['Dissertation', 'Other']);
  });

  it('includes module names the user has actually used', () => {
    const modules = availableModules([{ module: 'Database Systems' }, { module: 'Web Development' }]);
    expect(modules).toContain('Database Systems');
    expect(modules).toContain('Web Development');
  });

  it('does not duplicate a module name that repeats across tasks', () => {
    const modules = availableModules([{ module: 'Database Systems' }, { module: 'Database Systems' }]);
    expect(modules.filter(m => m === 'Database Systems')).toHaveLength(1);
  });

  it('keeps "Other" at the end as a catch-all rather than a real module', () => {
    const modules = availableModules([{ module: 'Custom Module' }]);
    expect(modules[modules.length - 1]).toBe('Other');
  });

  it('ignores tasks with no module set', () => {
    expect(availableModules([{ module: '' }, { module: undefined }])).toEqual(['Dissertation', 'Other']);
  });
});

describe('moduleColor', () => {
  it('gives the four named modules from the original design their intended colours', () => {
    expect(moduleColor('Dissertation')).toBe('amber');
    expect(moduleColor('Database Systems')).toBe('purple');
    expect(moduleColor('HCI Group Project')).toBe('teal');
    expect(moduleColor('Web Development')).toBe('blue');
  });

  it('gives a custom module name a stable colour from the palette', () => {
    const first = moduleColor('Marine Biology');
    const second = moduleColor('Marine Biology');
    expect(first).toBe(second);
    expect(['purple', 'teal', 'amber', 'blue']).toContain(first);
  });
});
