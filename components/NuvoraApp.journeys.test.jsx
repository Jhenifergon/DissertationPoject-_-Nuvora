import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import NuvoraApp from './NuvoraApp';
import { calculatePressure } from '@/lib/risk';

// These tests drive the real app through the ten end-to-end journeys
// listed in the Phase 5 test matrix, in local/demo mode. /api/risk is
// mocked (there is no real Next.js server during a Vitest run) but the
// mock computes its answer with the same calculatePressure() the real
// route uses, rather than a hand-typed fake result, so the test still
// exercises the real scoring logic.

function mockFetch() {
  global.fetch = vi.fn(async (url, opts) => {
    if (url === '/api/risk') {
      const body = JSON.parse(opts.body);
      const result = calculatePressure(body);
      return { ok: true, json: async () => result };
    }
    throw new Error(`Unexpected fetch to ${url}`);
  });
}

beforeEach(() => {
  // Seed an explicit blank state rather than relying on localStorage.clear()
  // (which now falls back to the richer demo seed added for a more
  // realistic first look at the app) — these journeys specifically test a
  // genuine first-time flow (e.g. completing a check-in with none yet
  // saved), which needs a controlled, predictable starting point.
  localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({ tasks: [], checkins: [], reflections: [], settings: {}, stats: {} }));
  mockFetch();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

async function answerCheckin(answers) {
  // answers: array of 5 numbers (1-based option position, low to high) for
  // mood, sleep, focus, initiation, confidence. Selecting by position
  // rather than by visible label works whether a question renders as a
  // numbered scale or (like the first, "workload feeling" question)
  // descriptive text options — both render one radio per option, in order,
  // followed by "Not sure".
  for (const value of answers) {
    const group = await screen.findByRole('radiogroup');
    const radios = within(group).getAllByRole('radio');
    fireEvent.click(radios[value - 1]);
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
  }
}

async function addTaskViaUI(title, due) {
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
  fireEvent.change(await screen.findByLabelText('Task name'), { target: { value: title } });
  if (due) fireEvent.change(screen.getByLabelText('Due date'), { target: { value: due } });
  // Once the form is open, both the icon button and the form's submit
  // button are labelled "Add task" — the submit button is the one that
  // renders inside the form, later in DOM order.
  const buttons = screen.getAllByRole('button', { name: 'Add task' });
  fireEvent.click(buttons[buttons.length - 1]);
  await screen.findByText(title);
}

// A due date close to "today" so the task's calculated group
// (lib/dates.js effectiveBucket) stays on the "today" tab regardless of
// which real-world date these tests happen to run on.
function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe('check-in first question uses descriptive options', () => {
  it('shows plain-language workload options instead of bare numbers, and they score exactly as the old 1-4 scale did', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('Check in when it would help'));

    const group = await screen.findByRole('radiogroup', { name: 'How is your workload feeling today?' });
    expect(within(group).getByRole('radio', { name: 'Calm & in control' })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: 'Manageable' })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: 'Heavier than usual' })).toBeInTheDocument();

    // "Very overwhelming" is the 4th/highest option — same underlying value
    // (4) the old numbered scale's last button saved.
    fireEvent.click(within(group).getByRole('radio', { name: 'Very overwhelming' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await answerCheckin([3, 3, 3, 3]); // sleep, focus, initiation, confidence — mid-scale

    await screen.findByText('Moderate pressure');
    fireEvent.click(screen.getByText('Why this result?'));
    expect(screen.getByText('Workload feeling was the largest contributor today.')).toBeInTheDocument();
  });
});

describe('end-to-end journeys', () => {
  it('journeys 1-8: demo mode -> add task -> check-in -> explanation -> next action -> Overwhelmed Mode -> micro-step -> assignment stays open', async () => {
    render(<NuvoraApp />);

    // 1. Enter demo mode (no sign-up needed in local/demo mode)
    await screen.findByText('How are things feeling, there?');

    // 2. Add an assignment and deadline
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    await addTaskViaUI('Journey test assignment', tomorrowIso());

    // 3. Complete a check-in (high-pressure answers -> Higher band, so the
    // journey also naturally covers the Overwhelmed Mode suggestion)
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('Check in when it would help'));
    await answerCheckin([4, 1, 1, 1, 1]);

    // 4. View the workload-pressure explanation
    await screen.findByText('Higher pressure');
    fireEvent.click(screen.getByText('Why this result?'));
    expect(screen.getByText(/largest contributor/)).toBeInTheDocument();

    // 5. Receive one prioritised next action, back on Today
    fireEvent.click(screen.getByRole('button', { name: /Today/ }));
    await screen.findByText('One small next step');
    expect(screen.getByRole('button', { name: /Mark this step done/ })).toBeInTheDocument();

    // 6. Enter Overwhelmed Mode
    fireEvent.click(screen.getByText('I’m feeling overwhelmed'));
    await screen.findByRole('radiogroup', { name: 'What is making this difficult right now?' });
    fireEvent.click(screen.getByText('I do not know where to start'));
    const openItButton = await screen.findByRole('button', { name: 'I opened it' });

    // 7. Complete one micro-step
    fireEvent.click(openItButton);
    await screen.findByText('One step down.');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Today' }));

    // 8. Confirm that the full assignment remains open (with a blank
    // starting state, "Journey test assignment" — added in step 2 — is
    // the only task, so Overwhelmed Mode deterministically acts on it)
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    const taskRow = (await screen.findByText('Journey test assignment')).closest('article');
    expect(within(taskRow).getByRole('button', { name: 'Mark Journey test assignment as done' })).toBeInTheDocument();
  });

  it('journey 9: reload and confirm persistence', async () => {
    const { unmount } = render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    await addTaskViaUI('Persists across reload');

    // Simulate a full page reload: unmount and render a fresh instance.
    // localStorage (the underlying persistence) is untouched by this.
    unmount();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('Persists across reload');
  });

  it('weekly reflection: save -> navigate away -> return -> reload keeps it visible, newest first', async () => {
    // Five older entries already stored, so the new one must land on top
    // of a full "recent" list rather than being cut off by the limit.
    const older = [1, 2, 3, 4, 5].map(n => ({ id: `old-${n}`, manageable: `Older entry ${n}`, createdAt: new Date(Date.now() - n * 86400000).toISOString() }));
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({ tasks: [], checkins: [], reflections: older, settings: {}, stats: {} }));
    const openReflection = async () => {
      await screen.findByText('How are things feeling, there?');
      fireEvent.click(within(document.querySelector('nav')).getByRole('button', { name: 'Progress' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Weekly reflection' }));
      await screen.findByText('Past reflections');
    };
    const firstEntry = () => document.querySelector('article.panel').textContent;

    const { unmount } = render(<NuvoraApp />);
    await openReflection();
    fireEvent.change(screen.getByLabelText('What felt manageable this week?'), { target: { value: 'Local mode entry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    await screen.findByText('Saved. Thank you for taking a moment for this.');
    expect(firstEntry()).toContain('Local mode entry');

    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Weekly reflection' }));
    expect(firstEntry()).toContain('Local mode entry');

    unmount();
    render(<NuvoraApp />);
    await openReflection();
    expect(firstEntry()).toContain('Local mode entry');
    fireEvent.click(screen.getByRole('button', { name: 'Show older reflections (1)' }));
    expect(screen.getByText(/Older entry 5/)).toBeInTheDocument();
  });

  it('journey 10: delete the user\'s data', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    await addTaskViaUI('To be deleted');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByText('Privacy & data'));
    await screen.findByText('Privacy & data', { selector: 'h1' });
    fireEvent.click(screen.getByText('Delete your data'));

    const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: /Delete all my data/ }));
    await screen.findByText('All your Nuvora data has been deleted.');

    // Privacy was opened from Tasks, so its back button returns there.
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    expect(screen.queryByText('To be deleted')).not.toBeInTheDocument();
  });
});
