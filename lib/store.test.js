import { beforeEach, describe, expect, it } from 'vitest';
import { addTask, completeCurrentStep, defaultSettings, loadData, migrateTask, saveSettings, toggleTask } from './store';

// These tests exercise local/demo mode only (no Firebase env vars are set
// in the test environment, so `firebaseEnabled` is false and every store
// function takes its localStorage branch).

beforeEach(() => {
  // Start from a genuinely empty store rather than `localStorage.clear()`,
  // which would fall back to the seeded demo tasks and make task-count
  // assertions unreliable.
  localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({ tasks: [], checkins: [], settings: { ...defaultSettings } }));
});

describe('addTask (local demo mode)', () => {
  it('returns only the saved task, not the whole app data object', async () => {
    const saved = await addTask('demo', { title: 'Read chapter 2', module: 'Dissertation', due: '', bucket: 'today' });
    expect(saved).toHaveProperty('id');
    expect(saved).toHaveProperty('title', 'Read chapter 2');
    expect(saved).not.toHaveProperty('tasks');
    expect(saved).not.toHaveProperty('checkins');
  });

  it('gives the saved task a stable id and the required shape', async () => {
    const saved = await addTask('demo', { title: 'Email supervisor', module: 'Dissertation', due: '2026-09-10', bucket: 'week' });
    expect(typeof saved.id).toBe('string');
    expect(saved.id.length).toBeGreaterThan(0);
    expect(saved.done).toBe(false);
    expect(saved.currentStep).toMatchObject({ done: false, completedAt: null });
    expect(typeof saved.currentStep.text).toBe('string');
  });

  it('does not duplicate the task in the persisted task list', async () => {
    await addTask('demo', { title: 'One task', module: 'Other', due: '', bucket: 'today' });
    const { tasks } = await loadData('demo');
    expect(tasks).toHaveLength(1);
  });

  it('persists the new task after reloading the store', async () => {
    const saved = await addTask('demo', { title: 'Persisted task', module: 'Other', due: '', bucket: 'today' });
    const { tasks } = await loadData('demo');
    expect(tasks.find(t => t.id === saved.id)).toBeTruthy();
  });
});

describe('migrateTask', () => {
  it('upgrades an old flat-step task into a currentStep object', () => {
    const legacy = { id: '1', title: 'Old task', step: 'Do the first small thing.', done: false };
    const migrated = migrateTask(legacy);
    expect(migrated.currentStep).toMatchObject({ text: 'Do the first small thing.', done: false, completedAt: null });
    expect(migrated).not.toHaveProperty('step');
  });

  it('leaves an already-migrated task unchanged', () => {
    const modern = { id: '1', title: 'New task', currentStep: { id: 'x', text: 'Go', done: true, completedAt: '2026-01-01' } };
    expect(migrateTask(modern)).toEqual(modern);
  });

  it('loadData migrates old flat-step tasks found in storage automatically', async () => {
    localStorage.setItem(
      'nuvora-demo-data-v1',
      JSON.stringify({ tasks: [{ id: '1', title: 'Legacy task', step: 'Open it.', done: false, bucket: 'today' }], checkins: [], settings: {} })
    );
    const { tasks } = await loadData('demo');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toHaveProperty('currentStep');
    expect(tasks[0].currentStep.text).toBe('Open it.');
  });
});

describe('micro-step vs full-task completion', () => {
  it('completing the current step does not mark the task done', async () => {
    const saved = await addTask('demo', { title: 'Big assignment', module: 'Dissertation', due: '', bucket: 'today' });
    const updated = await completeCurrentStep('demo', saved.id, true);
    expect(updated.currentStep.done).toBe(true);
    expect(updated.currentStep.completedAt).toBeTruthy();
    expect(updated.done).toBe(false);
  });

  it('completing the full task does not implicitly complete the current step', async () => {
    const saved = await addTask('demo', { title: 'Big assignment', module: 'Dissertation', due: '', bucket: 'today' });
    await toggleTask('demo', saved.id, true);
    const { tasks } = await loadData('demo');
    const task = tasks.find(t => t.id === saved.id);
    expect(task.done).toBe(true);
    expect(task.currentStep.done).toBe(false);
  });

  it('a step can be un-completed (deferred/skipped)', async () => {
    const saved = await addTask('demo', { title: 'Task', module: 'Other', due: '', bucket: 'today' });
    await completeCurrentStep('demo', saved.id, true);
    const reverted = await completeCurrentStep('demo', saved.id, false);
    expect(reverted.currentStep.done).toBe(false);
    expect(reverted.currentStep.completedAt).toBeNull();
  });

  it('the step completion outcome persists after reloading the store', async () => {
    const saved = await addTask('demo', { title: 'Task', module: 'Other', due: '', bucket: 'today' });
    await completeCurrentStep('demo', saved.id, true);
    const { tasks } = await loadData('demo');
    expect(tasks.find(t => t.id === saved.id).currentStep.done).toBe(true);
  });
});

describe('settings (local demo mode)', () => {
  it('returns sensible defaults when nothing has been saved', async () => {
    const { settings } = await loadData('demo');
    expect(settings).toEqual(defaultSettings);
  });

  it('saves and reloads settings', async () => {
    await saveSettings('demo', { calmMode: true, reducedMotion: true, textScale: 1.15 });
    const { settings } = await loadData('demo');
    expect(settings).toEqual({ calmMode: true, reducedMotion: true, textScale: 1.15 });
  });

  it('fills in missing fields with defaults on partial input', async () => {
    await saveSettings('demo', { calmMode: true });
    const { settings } = await loadData('demo');
    expect(settings).toEqual({ ...defaultSettings, calmMode: true });
  });

  it('does not silently drop unknown-but-present stored fields into a broken state', async () => {
    localStorage.setItem(
      'nuvora-demo-data-v1',
      JSON.stringify({ tasks: [], checkins: [], settings: { calmMode: true, textScale: 1.3 } })
    );
    const { settings } = await loadData('demo');
    expect(settings.calmMode).toBe(true);
    expect(settings.textScale).toBe(1.3);
    expect(settings.reducedMotion).toBe(false);
  });
});

describe('local demo mode data separation', () => {
  // Local/demo mode intentionally uses a single browser-local store (it is
  // not a multi-user backend); Firestore per-user separation is enforced
  // instead by `firestore.rules` (see security rules) and by every store
  // function being namespaced under `users/{uid}/...`. This test documents
  // that local mode's `uid` parameter does not create separate buckets,
  // so it should not be relied on for isolation outside Firebase mode.
  it('local demo storage is shared regardless of the uid passed in', async () => {
    await addTask('alice', { title: 'Alice task', module: 'Other', due: '', bucket: 'today' });
    const { tasks } = await loadData('bob');
    expect(tasks.some(t => t.title === 'Alice task')).toBe(true);
  });
});
