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

    expect(
      screen.queryByText(/You’re offline/)
    ).not.toBeInTheDocument();
  });

  it('shows when the browser goes offline, and hides again when back online', async () => {
    render(<NuvoraApp />);

    await screen.findByText('How are things feeling, there?');

    expect(
      screen.queryByText(/You’re offline/)
    ).not.toBeInTheDocument();

    fireEvent(window, new Event('offline'));

    await screen.findByText(
      /You’re offline\. Some saves may wait until you reconnect\./
    );

    fireEvent(window, new Event('online'));

    await waitFor(() =>
      expect(
        screen.queryByText(/You’re offline/)
      ).not.toBeInTheDocument()
    );
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

    expect(
      screen.getByText(
        /Signed-in Firebase mode does not enable persistent browser caching by default/
      )
    ).toBeInTheDocument();
  });
});

describe('navigation: every screen reachable without the bottom nav must have a way back', () => {
  // Regression test: Settings had no way back to Today at all —
  // the bottom nav is deliberately hidden on it (like Check-in,
  // Overwhelmed Mode, Reflection, and Privacy), but unlike those screens
  // it had no "back" button either, making it a genuine dead end reachable
  // only by reloading the page. Every screen in this hidden-from-nav list
  // must have a working way back.

  const screensToCheck = [
    {
      openVia: 'Accessibility settings',
      arriveAt: 'Calm accessibility settings',
    },
    {
      openVia: 'Privacy & data',
      arriveAt: 'Privacy & data',
    },
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

    const focusable = Array.from(
      dialog.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Add task' })
      ).not.toBeInTheDocument()
    );

    expect(addButton).toHaveFocus();
  });

  it('returns focus to the specific Edit button that opened the dialog', async () => {
    localStorage.setItem(
      'nuvora-demo-data-v1',
      JSON.stringify({
        tasks: [
          {
            id: 't1',
            title: 'Draft chapter 2',
            module: 'Dissertation',
            due: '',
            priority: 'normal',
            done: false,
            bucket: 'today',
            currentStep: {
              id: 's1',
              text: 'Open the document.',
              done: false,
              completedAt: null,
            },
          },
        ],
        checkins: [],
        reflections: [],
        settings: {},
        stats: {},
      })
    );

    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');

    const editButton = screen.getByRole('button', {
      name: 'Edit Draft chapter 2',
    });

    editButton.focus();
    fireEvent.click(editButton);

    const dialog = await screen.findByRole('dialog', {
      name: 'Edit Draft chapter 2',
    });

    expect(within(dialog).getByLabelText('Task name')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Edit Draft chapter 2' })
      ).not.toBeInTheDocument()
    );

    expect(editButton).toHaveFocus();
  });
});

describe('Adaptive Calm Mode — Phase A', () => {
  function seedRichState(calmMode) {
    const now = new Date();
    const inDays = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [
        { id: 't1', title: 'Today task', module: 'Other', due: inDays(-1), priority: 'high', done: false, bucket: 'today', currentStep: { id: 's1', text: 'A visible step preview', done: false, completedAt: null } },
        { id: 't2', title: 'Later task', module: 'Other', due: inDays(20), priority: 'normal', done: false, bucket: 'later', currentStep: { id: 's2', text: 'x', done: false, completedAt: null } },
      ],
      checkins: [{ id: 'c1', answers: {}, risk: { score: 40, band: 'Moderate', factors: { workload: 40, taskInitiation: 40, focus: 40, rest: 40, confidence: 40 }, message: 'x' }, createdAt: now.toISOString() }],
      reflections: [],
      settings: { calmMode },
      stats: { stepsCompleted: 2, strategyUses: { start: 1, big: 0, energy: 0, reset: 0, support: 0 } },
    }));
  }

  it('replaces the five-item navigation with only My step and Support', async () => {
    seedRichState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);

    expect(screen.getByRole('button', { name: 'My step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Support' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Tasks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Learn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Progress' })).not.toBeInTheDocument();
  });

  it('keeps the plan reachable from the single-step screen', async () => {
    seedRichState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    fireEvent.click(screen.getByRole('button', { name: 'Open my plan' }));

    await screen.findByText('My plan');
    expect(screen.getByText('Today task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Support' })).toBeInTheDocument();
  });

  it('hides deadline, priority and step-detail pressure cues in the Calm plan', async () => {
    seedRichState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    fireEvent.click(screen.getByRole('button', { name: 'Open my plan' }));
    await screen.findByText('My plan');

    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.queryByText(/Overdue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/High priority/i)).not.toBeInTheDocument();
    expect(screen.queryByText('A visible step preview')).not.toBeInTheDocument();
  });

  it('does not change the task data when Calm Mode hides pressure metadata', async () => {
    seedRichState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    fireEvent.click(screen.getByRole('button', { name: 'Open my plan' }));
    await screen.findByText('My plan');

    expect(screen.queryByText(/Overdue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/High priority/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode off' }));

    await waitFor(() => {
      expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
      expect(screen.getByText(/High priority/i)).toBeInTheDocument();
      expect(screen.getByText('A visible step preview')).toBeInTheDocument();
    });
  });

  it('returns to the single-step Today view when Calm Mode is enabled from Tasks', async () => {
    seedRichState(false);
    render(<NuvoraApp />);

    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');

    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));

    await screen.findByText(/Calm Mode is on/);
    expect(screen.queryByText('My plan')).not.toBeInTheDocument();
  });

  it('returns to the single-step Today view when Calm Mode is enabled from Learn', async () => {
    seedRichState(false);
    render(<NuvoraApp />);

    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    await screen.findByText('What would help right now?');

    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));

    await screen.findByText(/Calm Mode is on/);
    expect(screen.queryByText('What would help right now?')).not.toBeInTheDocument();
  });

  it('returns to the single-step Today view when Calm Mode is enabled from Progress', async () => {
    seedRichState(false);
    render(<NuvoraApp />);

    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    await screen.findByText('Progress, without pressure');

    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));

    await screen.findByText(/Calm Mode is on/);
    expect(screen.queryByText('Progress, without pressure')).not.toBeInTheDocument();
  });
});



describe('Adaptive Calm Mode — Phase B temporary settings', () => {
  function seedCalmState(calmMode = true) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [
        {
          id: 't1',
          title: 'Calm test task',
          module: 'Dissertation',
          due: yesterday.toISOString().slice(0, 10),
          priority: 'high',
          done: false,
          bucket: 'today',
          currentStep: {
            id: 's1',
            text: 'Open the document and read the title.',
            done: false,
            completedAt: null,
          },
        },
      ],
      checkins: [],
      reflections: [],
      settings: { calmMode, reducedMotion: false, textScale: 1 },
      stats: {
        stepsCompleted: 3,
        strategyUses: { start: 1, big: 0, energy: 0, reset: 0, support: 0 },
      },
    }));
  }

  async function openCalmSettings() {
    const button = await screen.findByRole('button', { name: /Adjust calm settings/i });
    if (button.getAttribute('aria-expanded') !== 'true') {
      fireEvent.click(button);
    }
  }

  it('starts each Calm session with all temporary demand-reduction controls enabled', async () => {
    seedCalmState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    await openCalmSettings();

    expect(screen.getByRole('switch', { name: /Hide time pressure/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Hide progress numbers/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Reduce visual detail/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Reduce motion/i })).toBeChecked();
  });

  it('can reveal deadline and priority information without leaving Calm Mode', async () => {
    seedCalmState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    await openCalmSettings();

    fireEvent.click(screen.getByRole('switch', { name: /Hide time pressure/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Open my plan' }));

    await screen.findByText('My plan');
    expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/High priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My step' })).toBeInTheDocument();
  });

  it('can restore task detail and edit controls without turning Calm Mode off', async () => {
    seedCalmState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    await openCalmSettings();

    fireEvent.click(screen.getByRole('switch', { name: /Reduce visual detail/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Open my plan' }));

    await screen.findByText('My plan');
    expect(screen.getByText('Open the document and read the title.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Calm test task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Calm test task' })).toBeInTheDocument();
  });

  it('temporary Reduced Motion works independently of the saved accessibility setting', async () => {
    seedCalmState(true);
    const { container } = render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    expect(container.querySelector('main')).toHaveClass('reduced');

    await openCalmSettings();
    fireEvent.click(screen.getByRole('switch', { name: /Reduce motion/i }));

    expect(container.querySelector('main')).not.toHaveClass('reduced');
  });

  it('keeps the default Calm recommendation free from time pressure', async () => {
    seedCalmState(true);
    render(<NuvoraApp />);

    await screen.findByText('Calm Mode is on.');

    expect(screen.getByText('Calm test task')).toBeInTheDocument();
    expect(
      screen.getByText('Make one small update. You can stop whenever you need.')
    ).toBeInTheDocument();
    expect(screen.getByText('Nuvora is keeping things simple for now.')).toBeInTheDocument();
  });

  it('keeps temporary Calm preferences behind progressive disclosure', async () => {
    seedCalmState(true);
    render(<NuvoraApp />);

    await screen.findByText('Calm Mode is on.');

    expect(screen.getByText('4 temporary preferences')).toBeInTheDocument();
    expect(screen.getByText('Show +')).toBeInTheDocument();

    expect(
      screen.queryByText(
        'Hides deadlines, priority labels and timed wording while Calm Mode is active.'
      )
    ).not.toBeInTheDocument();

    await openCalmSettings();

    expect(
      screen.getByText(
        'Hides deadlines, priority labels and timed wording while Calm Mode is active.'
      )
    ).toBeVisible();
  });

  it('resets temporary Calm choices when Calm Mode is started again', async () => {
    seedCalmState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    await openCalmSettings();

    fireEvent.click(screen.getByRole('switch', { name: /Hide time pressure/i }));
    expect(screen.getByRole('switch', { name: /Hide time pressure/i })).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode off' }));
    await screen.findByText(/How are things feeling/i);

    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));
    await screen.findByText(/Calm Mode is on/);
    await openCalmSettings();

    expect(screen.getByRole('switch', { name: /Hide time pressure/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Reduce visual detail/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Reduce motion/i })).toBeChecked();
  });
});



describe('Adaptive Calm Mode — Phase C stop and restart memory', () => {
  function seedRestartState(calmMode = true, restartMemory = null) {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [{
        id: 'restart-task',
        title: 'Draft chapter 2',
        module: 'Dissertation',
        due: '',
        priority: 'high',
        done: false,
        bucket: 'today',
        currentStep: {
          id: 'restart-step',
          text: 'Open the document and read only the title.',
          done: false,
          completedAt: null,
        },
      }],
      checkins: [],
      reflections: [],
      settings: {
        calmMode,
        reducedMotion: false,
        textScale: 1,
        displayName: '',
        hideProgress: false,
        supportPersonName: '',
        supportPersonNote: '',
        restartMemory,
      },
      stats: { stepsCompleted: 0, strategyUses: {} },
    }));
  }

  it('Stop for now saves an exact restart point and removes further task pressure for the session', async () => {
    seedRestartState(true);
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    fireEvent.click(screen.getByRole('button', { name: 'Stop for now' }));

    await screen.findByText('You can stop here.');
    expect(screen.getByText('Your place is saved. Nuvora will not ask you to do anything else unless you choose to continue.')).toBeInTheDocument();
    expect(screen.getByText('Draft chapter 2')).toBeInTheDocument();
    expect(screen.getByText('Open the document and read only the title.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open my plan' })).not.toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem('nuvora-demo-data-v1'));
    expect(saved.settings.restartMemory).toMatchObject({
      taskId: 'restart-task',
      taskTitle: 'Draft chapter 2',
      stepText: 'Open the document and read only the title.',
    });
    expect(new Date(saved.settings.restartMemory.stoppedAt).toString()).not.toBe('Invalid Date');
  });

  it('shows the saved restart point again after a fresh render', async () => {
    const restartMemory = {
      taskId: 'restart-task',
      taskTitle: 'Draft chapter 2',
      stepText: 'Open the document and read only the title.',
      stoppedAt: '2026-09-17T20:00:00.000Z',
    };
    seedRestartState(true, restartMemory);

    render(<NuvoraApp />);

    await screen.findByText('WELCOME BACK');
    expect(screen.getByText('You already have a safe place to restart.')).toBeInTheDocument();
    expect(screen.getByText('Draft chapter 2')).toBeInTheDocument();
    expect(screen.getByText('Open the document and read only the title.')).toBeInTheDocument();
  });

  it('can resume the remembered step without inventing a new recovery flow', async () => {
    const restartMemory = {
      taskId: 'restart-task',
      taskTitle: 'Draft chapter 2',
      stepText: 'Open the document and read only the title.',
      stoppedAt: '2026-09-17T20:00:00.000Z',
    };
    seedRestartState(true, restartMemory);

    render(<NuvoraApp />);

    await screen.findByText('WELCOME BACK');
    fireEvent.click(screen.getByRole('button', { name: 'Continue from here' }));

    await screen.findByText(/Calm Mode is on/);
    expect(screen.getByText('Open the document and read only the title.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop for now' })).toBeInTheDocument();
  });

  it('lets the student dismiss a restart point without changing the task itself', async () => {
    const restartMemory = {
      taskId: 'restart-task',
      taskTitle: 'Draft chapter 2',
      stepText: 'Open the document and read only the title.',
      stoppedAt: '2026-09-17T20:00:00.000Z',
    };
    seedRestartState(false, restartMemory);

    render(<NuvoraApp />);

    await screen.findByText('Pick up where you left off');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() =>
      expect(screen.queryByText('Pick up where you left off')).not.toBeInTheDocument()
    );

    const saved = JSON.parse(localStorage.getItem('nuvora-demo-data-v1'));
    expect(saved.settings.restartMemory).toBeNull();
    expect(saved.tasks[0].title).toBe('Draft chapter 2');
    expect(saved.tasks[0].currentStep.text).toBe('Open the document and read only the title.');
  });
});



describe('Adaptive Calm Mode — Phase D gentle exit', () => {
  function seedExitState(restartMemory = null) {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [{
        id: 'exit-task',
        title: 'Draft chapter 2',
        module: 'Dissertation',
        due: '',
        priority: 'normal',
        done: false,
        bucket: 'today',
        currentStep: {
          id: 'exit-step',
          text: 'Open the document.',
          done: false,
          completedAt: null,
        },
      }],
      checkins: [],
      reflections: [],
      settings: {
        calmMode: true,
        reducedMotion: false,
        textScale: 1,
        displayName: '',
        hideProgress: false,
        supportPersonName: '',
        supportPersonNote: '',
        restartMemory,
      },
      stats: { stepsCompleted: 0, strategyUses: {} },
    }));
  }

  it('does not drop the student straight into the full interface when leaving Calm Mode', async () => {
    seedExitState();
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    fireEvent.click(screen.getByRole('button', { name: 'Leave Calm Mode' }));

    await screen.findByText('How would you like to come back?');
    expect(screen.getByRole('button', { name: 'Return to Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show my tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay in Calm Mode' })).toBeInTheDocument();
  });

  it('can stay in Calm Mode without changing any task data', async () => {
    seedExitState();
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    fireEvent.click(screen.getByRole('button', { name: 'Leave Calm Mode' }));
    await screen.findByText('How would you like to come back?');

    fireEvent.click(screen.getByRole('button', { name: 'Stay in Calm Mode' }));

    await screen.findByText(/Calm Mode is on/);
    expect(screen.getByRole('button', { name: 'Stop for now' })).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem('nuvora-demo-data-v1'));
    expect(saved.tasks[0].done).toBe(false);
    expect(saved.tasks[0].currentStep.text).toBe('Open the document.');
  });

  it('can return directly to the normal Tasks view', async () => {
    seedExitState();
    render(<NuvoraApp />);

    await screen.findByText(/Calm Mode is on/);
    fireEvent.click(screen.getByRole('button', { name: 'Leave Calm Mode' }));
    await screen.findByText('How would you like to come back?');

    fireEvent.click(screen.getByRole('button', { name: 'Show my tasks' }));

    await screen.findByText('My plan');
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learn' })).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem('nuvora-demo-data-v1'));
    expect(saved.settings.calmMode).toBe(false);
  });

  it('preserves restart memory when leaving Calm Mode', async () => {
    const restartMemory = {
      taskId: 'exit-task',
      taskTitle: 'Draft chapter 2',
      stepText: 'Open the document.',
      stoppedAt: '2026-09-17T20:00:00.000Z',
    };
    seedExitState(restartMemory);
    render(<NuvoraApp />);

    await screen.findByText('WELCOME BACK');
    fireEvent.click(screen.getByRole('button', { name: 'Leave Calm Mode' }));
    await screen.findByText('How would you like to come back?');

    fireEvent.click(screen.getByRole('button', { name: 'Return to Today' }));

    await screen.findByText('Pick up where you left off');

    const saved = JSON.parse(localStorage.getItem('nuvora-demo-data-v1'));
    expect(saved.settings.restartMemory).toEqual(restartMemory);
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

    localStorage.setItem(
      'nuvora-demo-data-v1',
      JSON.stringify({
        tasks: [
          {
            id: 'later-task',
            title: 'Read optional article',
            module: 'Other',
            due: later.toISOString().slice(0, 10),
            priority: 'low',
            done: false,
            bucket: 'later',
            currentStep: {
              id: 'later-step',
              text: 'Open the article.',
              done: false,
              completedAt: null,
            },
          },
          {
            id: 'urgent-task',
            title: 'Submit dissertation draft',
            module: 'Dissertation',
            due: tomorrow.toISOString().slice(0, 10),
            priority: 'high',
            done: false,
            bucket: 'today',
            currentStep: {
              id: 'urgent-step',
              text: 'Open the dissertation document.',
              done: false,
              completedAt: null,
            },
          },
        ],
        checkins: [],
        reflections: [],
        settings: {},
        stats: {
          stepsCompleted: 0,
          strategyUses: {},
        },
      })
    );

    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');

    fireEvent.click(screen.getByText('I’m feeling overwhelmed'));
    fireEvent.click(screen.getByText('I do not know where to start'));

    expect(
      screen.getByText(
        'Just open "Submit dissertation draft". Nothing else needed.'
      )
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        'Just open "Read optional article". Nothing else needed.'
      )
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

describe('Learn tools are differentiated and tied to the student\'s real task', () => {
  function seedTask() {
    localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({
      tasks: [{ id: 't1', title: 'Draft chapter 2', module: 'Dissertation', due: '', priority: 'normal', done: false, bucket: 'today', currentStep: { id: 's1', text: 'Open the document.', done: false, completedAt: null } }],
      checkins: [], reflections: [], settings: {}, stats: { stepsCompleted: 0, strategyUses: {} },
    }));
  }

  it('shows one optional timer tool rather than repeating timers and soft-tone links across every tool', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show more study tools' }));

    expect(await screen.findByText('Focus Sprint')).toBeInTheDocument();
    expect(screen.getByText('Distraction Parking Lot')).toBeInTheDocument();
    expect(screen.getByText('If–Then Plan')).toBeInTheDocument();
    expect(screen.getByText('Visual Step Map')).toBeInTheDocument();
    expect(screen.queryByText('Play a soft tone (optional)')).not.toBeInTheDocument();
  });

  it('lets the student choose the Focus Sprint duration', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show more study tools' }));

    await screen.findByText('Focus Sprint');
    fireEvent.click(screen.getByRole('button', { name: '10 min' }));
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('parks a distraction without adding it to the task list', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show more study tools' }));

    fireEvent.click(await screen.findByText('Distraction Parking Lot'));
    fireEvent.change(screen.getByLabelText('Thought to park for later'), { target: { value: 'Reply to Sam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Park it' }));
    expect(screen.getByText('Reply to Sam')).toBeInTheDocument();
  });

  it('Visual Step Map uses the real task and can save its first step', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show more study tools' }));

    fireEvent.click(await screen.findByText('Visual Step Map'));
    expect(screen.getByText(/Open Draft chapter 2 and find the exact place you last stopped/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use step 1 as my next step' }));
    await screen.findByText('Saved as your next step for this task.');
  });

  it('keeps the old redundant "Start activity" disclosure removed', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show more study tools' }));
    await screen.findByText('Focus Sprint');
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

