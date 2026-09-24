import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { fakeDb, fakeTimestamp, resetFakeDb } from '@/test/fakeFirestore';

// Firebase-mode journeys through the real lib/store.js Firestore branch
// (only the Firestore SDK itself is replaced, by test/fakeFirestore.js).
// In Firestore mode the task-update functions resolve to nothing — unlike
// local demo mode, which returns the updated task — so every screen that
// used that return value either crashed (it replaced the task with
// `undefined`) or said "Saved" while still showing the old state.

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (authObj, cb) => { cb({ uid: 'student-1', email: 's@example.com' }); return () => {}; },
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ firebaseEnabled: true, auth: {}, db: {}, reauthenticate: vi.fn(), deleteAccount: vi.fn() }));
vi.mock('firebase/firestore', async () => (await import('@/test/fakeFirestore')).firestoreModule);

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function seed({ settings = {}, stats = { stepsCompleted: 4, strategyUses: { start: 1, big: 0, energy: 0, reset: 0, support: 0 } } } = {}) {
  resetFakeDb();
  fakeDb.collections.set('users/student-1/tasks', new Map([['task-1', {
    title: 'Write methods section', module: 'Dissertation', due: tomorrowIso(), priority: 'high', bucket: 'today', done: false, taskType: 'general',
    currentStep: { id: 'step-1', text: 'Open the document and write one heading.', done: false, completedAt: null },
    createdAt: fakeTimestamp(Date.now() - 86400000),
  }]]));
  fakeDb.collections.set('users', new Map([['student-1', { settings, stats }]]));
}

const storedTask = () => fakeDb.collections.get('users/student-1/tasks').get('task-1');
const nav = name => fireEvent.click(within(document.querySelector('nav')).getByRole('button', { name }));

async function renderApp() {
  const NuvoraApp = (await import('./NuvoraApp')).default;
  render(<NuvoraApp />);
}

beforeEach(() => {
  localStorage.setItem('nuvora-onboarding-seen', '1');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Firebase mode: task updates show immediately', () => {
  it('Tasks: saving an edit keeps the task on screen with its new title', async () => {
    seed();
    await renderApp();
    await screen.findByText('How are things feeling, there?');
    nav('Tasks');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Write methods section' }));
    fireEvent.change(screen.getByLabelText('Task name'), { target: { value: 'Write the methods section' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('heading', { name: 'Write the methods section' })).toBeInTheDocument();
    expect(storedTask().title).toBe('Write the methods section');
  });

  it('Today: "Mark this step done" shows the step as complete straight away', async () => {
    seed();
    await renderApp();
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: /Mark this step done/ }));

    expect(await screen.findByText('Step complete')).toBeInTheDocument();
    expect(storedTask().currentStep.done).toBe(true);

    // The "small steps taken" count on Progress updates without a reload.
    nav('Progress');
    const steps = (await screen.findByText('SMALL STEPS TAKEN')).closest('article');
    expect(within(steps).getByText('5')).toBeInTheDocument();
  });

  it('Today: editing the step shows the new text straight away', async () => {
    seed();
    await renderApp();
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
    fireEvent.change(screen.getByLabelText('Edit this step'), { target: { value: 'Write two sentences.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Step updated.');
    expect(screen.getAllByText('Write two sentences.').length).toBeGreaterThan(0);
  });

  it('Learn: "I did the current step" saves without breaking the app, and Today reflects it', async () => {
    seed();
    await renderApp();
    await screen.findByText('How are things feeling, there?');
    nav('Learn');
    fireEvent.click(await screen.findByRole('button', { name: /I have very low energy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'I did the current step' }));
    await screen.findByText('Saved. That step is done — the assignment stays open.');

    nav('Today');
    expect(await screen.findByText('Step complete')).toBeInTheDocument();
  });

  it('Overwhelmed Mode: "I opened it" is reflected on Today', async () => {
    seed();
    await renderApp();
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: /feeling overwhelmed/ }));
    fireEvent.click(await screen.findByRole('radio', { name: 'I do not know where to start' }));
    fireEvent.click(screen.getByRole('button', { name: 'I opened it' }));
    await screen.findByText('One step down.');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Today' }));

    expect(await screen.findByText('Step complete')).toBeInTheDocument();
  });
});

describe('Firebase mode: data controls and failed saves', () => {
  it('Privacy: "Delete all my data" also clears the Progress counts on screen', async () => {
    seed();
    await renderApp();
    await screen.findByText('How are things feeling, there?');
    nav('Progress');
    expect(within(await screen.findByText('SMALL STEPS TAKEN').then(n => n.closest('article'))).getByText('4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByText('Privacy & data'));
    fireEvent.click(screen.getByText('Delete your data'));
    fireEvent.change(screen.getAllByPlaceholderText('Type DELETE to confirm')[0], { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: /Delete all my data/ }));
    await screen.findByText('All your Nuvora data has been deleted.');

    // Privacy was opened from Progress, so its back button returns there.
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    const steps = (await screen.findByText('SMALL STEPS TAKEN')).closest('article');
    expect(within(steps).getByText('0')).toBeInTheDocument();
  });

  it('Calm Mode: "Stop for now" does not say the place is saved when saving failed', async () => {
    seed({ settings: { calmMode: true } });
    await renderApp();
    await screen.findByText('YOUR NEXT SMALL STEP');
    fakeDb.failWrites = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Stop for now' }));

    expect(await screen.findByText('That did not save. Please try again in a moment.')).toBeInTheDocument();
    expect(screen.queryByText('You can stop here.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop for now' })).toBeInTheDocument();
  });
});
