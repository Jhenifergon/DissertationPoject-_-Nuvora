import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import NuvoraApp from './NuvoraApp';

function seedTask() {
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
      stats: { stepsCompleted: 0, strategyUses: {} },
    })
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.setItem(
    'nuvora-demo-data-v1',
    JSON.stringify({
      tasks: [],
      checkins: [],
      reflections: [],
      settings: {},
      stats: {},
    })
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('Learn / Difficult Moments support', () => {
  it('prioritises difficult-moment support and keeps extra study tools optional', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));

    expect(await screen.findByText('What would help right now?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I can’t start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /This feels too big/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I have very low energy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I’m overstimulated/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I need company/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I don’t know what I need/i })).toBeInTheDocument();

    expect(screen.getByText('Reset Space')).toBeInTheDocument();
    expect(screen.getByText('More study tools')).toBeInTheDocument();
    expect(screen.queryByText('The 2-minute start')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show more study tools' }));

    expect(await screen.findByText('The 2-minute start')).toBeInTheDocument();
    expect(screen.getByText('Shrink the assignment')).toBeInTheDocument();
    expect(screen.getByText('Low-energy version')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide study tools' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('connects getting-started support to the real priority task', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /I can’t start/i }));

    const heading = await screen.findByText('Only begin. Finishing is not required.');
    const panel = heading.closest('article');
    expect(panel).not.toBeNull();
    expect(within(panel).getByRole('button', { name: /Open .*Draft chapter 2.* in my plan/i })).toBeInTheDocument();
    expect(within(panel).getByText(/Opening it counts\. You can stop after two minutes\./i)).toBeInTheDocument();
  });

  it('saves a smaller step without replacing the task object or breaking navigation', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /This feels too big/i }));

    const smallerHeading = await screen.findByText(
  'Choose the version that feels possible.'
);

    const smallerPanel = smallerHeading.closest('article');

    expect(smallerPanel).not.toBeNull();

    fireEvent.click(
      within(smallerPanel).getByRole('button', {
        name: /Small/i,
      })
    );

    await screen.findByText(
      'Saved as your next step for this task.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    expect(screen.getByText('Add one bullet point to Draft chapter 2.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Draft chapter 2 as done' })).toBeInTheDocument();
  });

  it('provides an overstimulation reset where task work is explicitly not required', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /I’m overstimulated/i }));

    const resetHeading = await screen.findByText('No task work is required during this reset.');
    const resetPanel = resetHeading.closest('article');
    expect(resetPanel).not.toBeNull();
    expect(within(resetPanel).getByText(/reduce sound/i)).toBeInTheDocument();
    expect(within(resetPanel).getByText('2:00')).toBeInTheDocument();
  });

  it('routes the three-question helper to a low-energy support option', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /I don’t know what I need/i }));

    fireEvent.change(screen.getByLabelText('Can you focus right now?'), { target: { value: 'some' } });
    fireEvent.change(screen.getByLabelText('Does the task feel clear?'), { target: { value: 'yes' } });
    fireEvent.change(screen.getByLabelText('How much energy do you have?'), { target: { value: 'low' } });

    fireEvent.click(await screen.findByRole('button', { name: 'Try the low-energy version' }));
    expect(await screen.findByText('Lower the requirement, not your self-worth.')).toBeInTheDocument();
  });

  it('copies a body-doubling request without sending anything automatically', async () => {
    seedTask();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /I need company/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Copy a message asking someone to join me' }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toMatch(/while we both work quietly/i);
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
  });
});
