import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import NuvoraApp from './NuvoraApp';

beforeEach(() => {
  localStorage.clear();
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
  it('shows an accessible error, not a crash, when the check-in network request fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByText('Take your daily check-in'));

    const group = await screen.findByRole('radiogroup');
    for (let i = 0; i < 5; i++) {
      const g = await screen.findByRole('radiogroup');
      fireEvent.click(within(g).getByRole('radio', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    }

    const error = await screen.findByText(/We couldn't reach Nuvora just now/);
    expect(error).toHaveAttribute('role', 'alert');
    // The person's answers are not discarded after a failed submission —
    // they're still on the same question-flow, not silently reset.
    expect(group).toBeDefined();
  });

  it('shows an accessible error, not a crash, when adding a task fails', async () => {
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    await screen.findByText('My plan');

    // Force the underlying persistence call to fail (e.g. a full/blocked
    // localStorage) without touching the component's own code.
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota exceeded'); });

    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    fireEvent.change(await screen.findByLabelText('Task name'), { target: { value: 'Will fail to save' } });
    const buttons = screen.getAllByRole('button', { name: 'Add task' });
    fireEvent.click(buttons[buttons.length - 1]);

    const error = await screen.findByText('That did not save. Please try again in a moment.');
    expect(error).toHaveAttribute('role', 'alert');
    setItemSpy.mockRestore();
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
