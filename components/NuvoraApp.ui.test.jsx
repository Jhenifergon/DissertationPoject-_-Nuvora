import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import NuvoraApp from './NuvoraApp';

beforeEach(() => {
  // Seed an explicit blank state rather than relying on localStorage.clear()
  // (which now falls back to the richer demo seed added for a more
  // realistic first look at the app) — tests that need "no check-in yet"
  // depend on this being genuinely empty, not just absent from storage.
  localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({ tasks: [], checkins: [], reflections: [], settings: {}, stats: {} }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function seedCompletedCheckin() {
  localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
    tasks: [],
    checkins: [{ id: '1', answers: {}, risk: { score: 42, band: 'Moderate', factors: { workload: 50, taskInitiation: 50, focus: 50, rest: 50, confidence: 50 }, message: 'x' }, createdAt: new Date().toISOString() }],
    reflections: [],
    settings: {},
    stats: {},
  }));
}

describe('support-summary copying', () => {
  it('shows an accessible success status when the clipboard write succeeds', async () => {
    seedCompletedCheckin();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Support' }));
    await screen.findByText('A summary you control');
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }));

    const status = await screen.findByText('Copied to your clipboard.');
    expect(status).toHaveAttribute('role', 'status');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('moderate'));
  });

  it('shows an accessible error status when the clipboard write fails, without crashing', async () => {
    seedCompletedCheckin();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Support' }));
    await screen.findByText('A summary you control');
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }));

    const status = await screen.findByText("We couldn't copy that automatically. You can select and copy the text above instead.");
    expect(status).toHaveAttribute('role', 'alert');
  });

  it('disables the copy button until a check-in has been completed', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Support' }));
    await screen.findByText('A summary you control');
    expect(screen.getByRole('button', { name: 'Copy summary' })).toBeDisabled();
    expect(screen.getByText('Complete a check-in to prepare a short support summary.')).toBeInTheDocument();
  });
});

describe('error handling', () => {
  it('shows an accessible error and preserves answers when saving a check-in fails', async () => {
  render(<NuvoraApp />);

  await screen.findByText('How are things feeling, there?');

  fireEvent.click(
    screen.getByText('Check in when it would help')
  );

  /*
   * Complete the five check-in questions.
   *
   * We deliberately choose the third option each time so that the
   * pressure calculation itself succeeds. The failure we want to test
   * happens during persistence, not calculation.
   */
  for (let i = 0; i < 5; i++) {
    const group = await screen.findByRole('radiogroup');

    fireEvent.click(
      within(group).getAllByRole('radio')[2]
    );

    /*
     * Before the final answer is submitted, force local persistence to
     * fail. In demo/local mode saveCheckin ultimately writes through
     * localStorage, so this simulates a storage/persistence failure.
     */
    if (i === 4) {
      vi.spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Unable to save');
        });
    }

    fireEvent.click(
      screen.getByRole('button', { name: /Continue/ })
    );
  }

  /*
   * The user should receive an accessible error rather than being sent
   * to a successful pressure-result screen.
   */
  const error = await screen.findByText(
    /We couldn't save your check-in just now/
  );

  expect(error).toHaveAttribute('role', 'alert');

  /*
   * The check-in should remain on screen so that the user's answers
   * are not silently discarded after the save failure.
   */
  expect(
    screen.getByRole('radiogroup')
  ).toBeInTheDocument();

  /*
   * Critically, the pressure result must NOT be displayed because the
   * check-in was not successfully persisted.
   */
  expect(
    screen.queryByText(/WORKLOAD PRESSURE/i)
  ).not.toBeInTheDocument();
});
});

describe('live status messages carry the correct ARIA role', () => {
  it('status-tone messages use role="status" (polite, non-interrupting)', async () => {
    seedCompletedCheckin();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Support' }));
    await screen.findByText('A summary you control');
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Copied to your clipboard.');
  });

  it('error-tone messages use role="alert" (assertive, interrupting)', async () => {
    seedCompletedCheckin();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Support' }));
    await screen.findByText('A summary you control');
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary' }));
    const status = await screen.findByRole('alert');
    expect(status).toHaveTextContent(/couldn't copy/);
  });
});

describe('offline banner', () => {
  it('does not show when navigator.onLine is unknown (e.g. stubbed without it) — assumes online', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    expect(screen.queryByText(/You’re offline/)).not.toBeInTheDocument();
  });

  it('shows when the browser goes offline, and hides again when back online', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    expect(screen.queryByText(/You’re offline/)).not.toBeInTheDocument();

    fireEvent(window, new Event('offline'));
    await screen.findByText(/You’re offline\. Some saves may wait until you reconnect\. Keep this page open — offline data is not stored between browser sessions\./);

    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.queryByText(/You’re offline/)).not.toBeInTheDocument());
  });
});

describe('privacy: offline storage is explained clearly', () => {
  it('explains that signed-in mode does not persist an offline browser cache by default', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByText('Privacy & data'));
    await screen.findByRole('heading', { name: 'Privacy & data' });

    fireEvent.click(screen.getByText('Offline storage'));
    expect(screen.getByText(/Signed-in Firebase mode does not enable persistent browser caching by default/)).toBeInTheDocument();
  });
});

describe('navigation: every screen reachable without the bottom nav must have a way back', () => {
  // Regression test: Settings had no way back to Today at all — the
  // bottom nav is deliberately hidden on it (like Check-in, Overwhelmed
  // Mode, Reflection, and Privacy), but unlike those screens it had no
  // "back" button either, making it a genuine dead end reachable only by
  // reloading the page. Every screen in this hidden-from-nav list must
  // have a working way back.
  const screensToCheck = [
    { openVia: 'Accessibility settings', arriveAt: 'Calm accessibility settings' },
    { openVia: 'Privacy & data', arriveAt: 'Privacy & data' },
  ];

  for (const { openVia, arriveAt } of screensToCheck) {
    it(`${openVia}: has a working way back to Today`, async () => {
      render(<NuvoraApp />);
      await screen.findByText('How are things feeling, there?');
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      fireEvent.click(await screen.findByText(openVia));
      await screen.findByText(arriveAt, { selector: 'h1' });

      const backButton = screen.getByRole('button', { name: /Today/ });
      fireEvent.click(backButton);
      await screen.findByText('How are things feeling, there?');
    });
  }
});


describe('task modal keyboard accessibility', () => {
  it('moves focus into Add task, traps Tab, closes on Escape, and returns focus to the trigger', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');

    const addButton = screen.getByRole('button', { name: 'Add task' });
    addButton.focus();
    fireEvent.click(addButton);

    const dialog = await screen.findByRole('dialog', { name: 'Add task' });
    const taskName = within(dialog).getByLabelText('Task name');
    expect(taskName).toHaveFocus();

    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add task' })).not.toBeInTheDocument());
    expect(addButton).toHaveFocus();
  });

  it('returns focus to the specific Edit button that opened the dialog', async () => {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [{ id: 't1', title: 'Draft chapter 2', module: 'Dissertation', due: '', priority: 'normal', done: false, bucket: 'today', currentStep: { id: 's1', text: 'Open the document.', done: false, completedAt: null } }],
      checkins: [], reflections: [], settings: {}, stats: {},
    }));

    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');

    const editButton = screen.getByRole('button', { name: 'Edit Draft chapter 2' });
    editButton.focus();
    fireEvent.click(editButton);

    const dialog = await screen.findByRole('dialog', { name: 'Edit Draft chapter 2' });
    expect(within(dialog).getByLabelText('Task name')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Draft chapter 2' })).not.toBeInTheDocument());
    expect(editButton).toHaveFocus();
  });
});

describe('Calm Mode extends beyond Today (Tasks, Learn, Progress)', () => {
  function seedRichState(calmMode) {
    const now = new Date();
    const inDays = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [
        { id: 't1', title: 'Today task', module: 'Other', due: inDays(0), priority: 'normal', done: false, bucket: 'today', currentStep: { id: 's1', text: 'A visible step preview', done: false, completedAt: null } },
        { id: 't2', title: 'Later task', module: 'Other', due: inDays(20), priority: 'normal', done: false, bucket: 'later', currentStep: { id: 's2', text: 'x', done: false, completedAt: null } },
      ],
      checkins: [{ id: 'c1', answers: {}, risk: { score: 40, band: 'Moderate', factors: { workload: 40, taskInitiation: 40, focus: 40, rest: 40, confidence: 40 }, message: 'x' }, createdAt: now.toISOString() }],
      reflections: [],
      settings: { calmMode },
      stats: { stepsCompleted: 2, strategyUses: { start: 1, big: 0, energy: 0, reset: 0, support: 0 } },
    }));
  }

  it('Tasks: hides the week/later tabs and each task\'s step preview by default, both reachable via a link', async () => {
    seedRichState(true);
    render(<NuvoraApp />);
    await screen.findByText('Calm Mode is on — only one thing is shown at a time.');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');

    expect(screen.queryByRole('button', { name: 'week' })).not.toBeInTheDocument();
    expect(screen.queryByText('A visible step preview')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Show week & later'));
    expect(screen.getByRole('button', { name: 'week' })).toBeInTheDocument();
  });

  it('Learn: shows only the first activity by default, with a link to see the rest', async () => {
    seedRichState(true);
    render(<NuvoraApp />);
    await screen.findByText('Calm Mode is on — only one thing is shown at a time.');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await screen.findByText('The 2-minute start');

    expect(screen.queryByText('Shrink the assignment')).not.toBeInTheDocument();
    expect(screen.queryByText('Reset Space')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Show other small resets'));
    expect(screen.getByText('Shrink the assignment')).toBeInTheDocument();
    expect(screen.getByText('Reset Space')).toBeInTheDocument();
  });

  it('Progress: collapses strategies and trend history behind one link', async () => {
    seedRichState(true);
    render(<NuvoraApp />);
    await screen.findByText('Calm Mode is on — only one thing is shown at a time.');
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    await screen.findByText('Progress, without pressure');

    expect(screen.queryByText('Helpful strategies')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent pressure patterns')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Show trends & strategies'));
    expect(screen.getByText('Helpful strategies')).toBeInTheDocument();
    expect(screen.getByText('Recent pressure patterns')).toBeInTheDocument();
  });

  it('none of this hides anything when Calm Mode is off — same screens show full detail by default', async () => {
    seedRichState(false);
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    expect(screen.getByRole('button', { name: 'week' })).toBeInTheDocument();
    expect(screen.getByText('A visible step preview')).toBeInTheDocument();
  });
});

describe('task-type step templates', () => {
  it('a new essay-type task gets the essay progression\'s first step, not the generic one', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    fireEvent.change(await screen.findByLabelText('Task name'), { target: { value: 'My essay' } });
    fireEvent.change(screen.getByLabelText('Task type'), { target: { value: 'essay' } });
    const buttons = screen.getAllByRole('button', { name: 'Add task' });
    fireEvent.click(buttons[buttons.length - 1]);
    await screen.findByText('My essay');

    expect(screen.getByText('Open a blank document and write only the title.')).toBeInTheDocument();
  });
});

describe('pattern insights on Progress', () => {
  it('shows a Patterns panel once there is enough check-in history to say something meaningful', async () => {
    const now = new Date();
    const daysAgo = n => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString(); };
    const heavy = { workload: 20, taskInitiation: 90, focus: 20, rest: 20, confidence: 20 };
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [],
      checkins: [0, 1, 2, 3].map(i => ({ id: `c${i}`, risk: { score: 50, factors: heavy, band: 'Moderate', message: 'x' }, createdAt: daysAgo(i) })),
      reflections: [], settings: {}, stats: { stepsCompleted: 0, strategyUses: {} },
    }));
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    await screen.findByText('Progress, without pressure');

    expect(screen.getByText(/Task initiation has been your largest contributor/)).toBeInTheDocument();
  });

  it('shows no Patterns panel at all with too little history (never overclaims from noise)', async () => {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [], checkins: [], reflections: [], settings: {}, stats: { stepsCompleted: 0, strategyUses: {} },
    }));
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    await screen.findByText('Progress, without pressure');

    expect(screen.queryByText('Patterns')).not.toBeInTheDocument();
  });
});

describe('barrier-history-aware Overwhelmed Mode ordering', () => {
  it('puts the most-used barrier first instead of the fixed default order', async () => {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [{ id: 't1', title: 'A task', module: 'Other', due: '', priority: 'normal', done: false, bucket: 'today', currentStep: { id: 's1', text: 'x', done: false, completedAt: null } }],
      checkins: [], reflections: [], settings: {},
      stats: { stepsCompleted: 0, strategyUses: { start: 0, big: 0, energy: 0, reset: 8, support: 0 } },
    }));
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('I’m feeling overwhelmed'));
    const group = await screen.findByRole('radiogroup', { name: 'What is making this difficult right now?' });
    const options = within(group).getAllByRole('radio');
    expect(options[0]).toHaveTextContent('I need a short reset');
  });

  it('keeps the original default order when there is no usage history', async () => {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [{ id: 't1', title: 'A task', module: 'Other', due: '', priority: 'normal', done: false, bucket: 'today', currentStep: { id: 's1', text: 'x', done: false, completedAt: null } }],
      checkins: [], reflections: [], settings: {},
      stats: { stepsCompleted: 0, strategyUses: {} },
    }));
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('I’m feeling overwhelmed'));
    const group = await screen.findByRole('radiogroup', { name: 'What is making this difficult right now?' });
    const options = within(group).getAllByRole('radio');
    expect(options[0]).toHaveTextContent('I do not know where to start');
  });
});


describe('Overwhelmed Mode priority-task consistency', () => {
  it('uses the same priority task as the shared recommendation logic rather than the first unfinished task in storage', async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const later = new Date(now);
    later.setDate(later.getDate() + 14);

    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [
        {
          id: 'later-task',
          title: 'Read optional article',
          module: 'Other',
          due: later.toISOString().slice(0, 10),
          priority: 'low',
          done: false,
          bucket: 'later',
          currentStep: { id: 'later-step', text: 'Open the article.', done: false, completedAt: null },
        },
        {
          id: 'urgent-task',
          title: 'Submit dissertation draft',
          module: 'Dissertation',
          due: tomorrow.toISOString().slice(0, 10),
          priority: 'high',
          done: false,
          bucket: 'today',
          currentStep: { id: 'urgent-step', text: 'Open the dissertation document.', done: false, completedAt: null },
        },
      ],
      checkins: [],
      reflections: [],
      settings: {},
      stats: { stepsCompleted: 0, strategyUses: {} },
    }));

    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');

    fireEvent.click(screen.getByText('I’m feeling overwhelmed'));
    fireEvent.click(screen.getByText('I do not know where to start'));

    expect(
      screen.getByText('Just open "Submit dissertation draft". Nothing else needed.')
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Just open "Read optional article". Nothing else needed.')
    ).not.toBeInTheDocument();
  });
});

describe('Overwhelmed Mode barrier panels', () => {
  it('the "I need a short reset" barrier renders a real reset instead of crashing', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('I’m feeling overwhelmed'));
    fireEvent.click(screen.getByText('I need a short reset'));

    expect(screen.getByText('A 2-minute breathing reset')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I’m ready to continue' }));
    await screen.findByText('How are things feeling, there?');
  });
});

describe('Small resets are tied to the student\'s actual current task', () => {
  function seedTask() {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [{ id: 't1', title: 'Draft chapter 2', module: 'Dissertation', due: '', priority: 'normal', done: false, bucket: 'today', currentStep: { id: 's1', text: 'Open the document.', done: false, completedAt: null } }],
      checkins: [], reflections: [], settings: {}, stats: { stepsCompleted: 0, strategyUses: {} },
    }));
  }

  it('references the real task title instead of a generic example', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await screen.findByText('The 2-minute start');

    expect(screen.getByText(/Don't finish "Draft chapter 2"/)).toBeInTheDocument();
    expect(screen.getByText(/Turn "Draft chapter 2" into/)).toBeInTheDocument();
    expect(screen.getByText(/The low-energy version of "Draft chapter 2"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open .Draft chapter 2. in my plan/ })).toBeInTheDocument();
  });

  it('falls back to the original generic wording when there is no open task', async () => {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({ tasks: [], checkins: [], reflections: [], settings: {}, stats: { stepsCompleted: 0, strategyUses: {} } }));
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await screen.findByText('The 2-minute start');

    expect(screen.getByText("Don't finish the task. Open it and identify only the first action.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open .* in my plan/ })).not.toBeInTheDocument();
  });

  it('"Use this as my next step" genuinely replaces the task\'s current step, not just a suggestion', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await screen.findByText('Shrink the assignment');
    fireEvent.click(screen.getByRole('button', { name: 'Use this as my next step' }));
    await screen.findByText('Saved as your next step for this task.');

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    expect(screen.getByText('Write one sentence about Draft chapter 2.')).toBeInTheDocument();
  });

  it('"I did this" on the low-energy version completes the step without completing the whole task', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await screen.findByText('Low-energy version');
    fireEvent.click(screen.getByRole('button', { name: 'I did this' }));
    await screen.findByText(/That step is done/);

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    expect(screen.getByRole('button', { name: 'Mark Draft chapter 2 as done' })).toBeInTheDocument();
  });

  it('removes the old redundant "Start activity" disclosure entirely', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await screen.findByText('The 2-minute start');
    expect(screen.queryByText('Start activity')).not.toBeInTheDocument();
  });
});

describe('final accessibility hardening', () => {
  it('exposes the header Calm Mode control as a real pressed-state toggle', async () => {
    render(<NuvoraApp />);

    await screen.findByText('How are things feeling, there?');

    const calmButton = screen.getByRole('button', {
      name: 'Turn Calm Mode on',
    });

    expect(calmButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(calmButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Turn Calm Mode off',
        })
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
