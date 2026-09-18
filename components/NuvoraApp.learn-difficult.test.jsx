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
    expect(screen.queryByText('Focus Sprint')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show more study tools' }));

    expect(await screen.findByText('Focus Sprint')).toBeInTheDocument();
    expect(screen.getByText('Distraction Parking Lot')).toBeInTheDocument();
    expect(screen.getByText('If–Then Plan')).toBeInTheDocument();
    expect(screen.getByText('Visual Step Map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide study tools' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('connects getting-started support to the real priority task', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /I can’t start/i }));

    const heading = await screen.findByText('Make the start obvious, not ambitious.');
    const panel = heading.closest('article');
    expect(panel).not.toBeNull();
    expect(within(panel).getByRole('button', { name: /Open .*Draft chapter 2/i })).toBeInTheDocument();
    expect(panel).toHaveTextContent(/When I open the work, I will find one place to continue\./i);
    expect(within(panel).getByText(/No timer is required/i)).toBeInTheDocument();
  });

  it('saves a smaller step without replacing the task object or breaking navigation', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /This feels too big/i }));

    fireEvent.click(await screen.findByRole('button', { name: /1 · Find the place/i }));
    await screen.findByText('Saved as your next step for this task.');

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');
    expect(screen.getByText('Open Draft chapter 2 and find the section you need next.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Draft chapter 2 as done' })).toBeInTheDocument();
  });

  it('provides an overstimulation reset where task work is explicitly not required', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /I’m overstimulated/i }));

    const resetHeading = await screen.findByText('Change one source of input first.');
    const resetPanel = resetHeading.closest('article');
    expect(resetPanel).not.toBeNull();
    const quiet = within(resetPanel).getByRole('button', { name: 'Move somewhere quieter' });
    fireEvent.click(quiet);
    expect(quiet).toHaveAttribute('aria-pressed', 'true');
    expect(within(resetPanel).queryByText('2:00')).not.toBeInTheDocument();
  });

  it('routes the three-question helper to a low-energy support option', async () => {
    seedTask();
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    fireEvent.click(screen.getByRole('button', { name: /I don’t know what I need/i }));

    fireEvent.change(screen.getByLabelText('My brain feels'), { target: { value: 'tired' } });
    fireEvent.change(screen.getByLabelText('My environment feels'), { target: { value: 'okay' } });
    fireEvent.change(screen.getByLabelText('The task feels'), { target: { value: 'clear' } });

    fireEvent.click(await screen.findByRole('button', { name: 'Try the low-energy version' }));
    expect(await screen.findByText('Choose the effort level you actually have.')).toBeInTheDocument();
    expect(screen.getByText('Tiny')).toBeInTheDocument();
    expect(screen.getByText('Enough')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
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
