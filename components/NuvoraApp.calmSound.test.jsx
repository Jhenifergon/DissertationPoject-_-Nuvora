import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import NuvoraApp from './NuvoraApp';
import { startCalmSound, stopCalmSound } from '@/lib/calmSound';

// When Calm Mode's background sound starts and stops. The sound itself is
// tested in lib/calmSound.test.js; here it is replaced by spies.
vi.mock('@/lib/calmSound', () => ({
  startCalmSound: vi.fn(() => true),
  stopCalmSound: vi.fn(),
  isCalmSoundPlaying: vi.fn(() => false),
}));

function seed(settings = {}) {
  localStorage.setItem('nuvora-demo-data-v1', JSON.stringify({ tasks: [], checkins: [], reflections: [], settings, stats: {} }));
}

async function openApp(settings) {
  seed(settings);
  render(<NuvoraApp />);
  await screen.findByText(/How are things feeling|YOUR NEXT SMALL STEP|Calm Mode is on/);
}

beforeEach(() => {
  vi.mocked(startCalmSound).mockClear().mockReturnValue(true);
  vi.mocked(stopCalmSound).mockClear();
});

afterEach(() => {
  cleanup();
});

describe('Calm Mode background sound', () => {
  it('starts when Calm Mode is turned on, and a header button can stop it without leaving Calm Mode', async () => {
    await openApp();
    expect(screen.queryByRole('button', { name: /calming sound/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));
    expect(startCalmSound).toHaveBeenCalledTimes(1);

    const soundButton = await screen.findByRole('button', { name: 'Stop calming sound' });
    expect(soundButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(soundButton);
    expect(stopCalmSound).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Play calming sound' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Turn Calm Mode off' })).toBeInTheDocument();

    // …and can start it again.
    fireEvent.click(screen.getByRole('button', { name: 'Play calming sound' }));
    expect(startCalmSound).toHaveBeenCalledTimes(2);
  });

  it('keeps playing while moving between screens, and stops when Calm Mode is turned off', async () => {
    await openApp();
    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));
    await screen.findByRole('button', { name: 'Stop calming sound' });
    vi.mocked(stopCalmSound).mockClear();

    fireEvent.click(within(document.querySelector('nav')).getByRole('button', { name: 'Support' }));
    await screen.findByText('A summary you control');
    expect(stopCalmSound).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Stop calming sound' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode off' }));
    await screen.findByRole('button', { name: 'Turn Calm Mode on' });
    expect(stopCalmSound).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /calming sound/ })).not.toBeInTheDocument();
  });

  it('never starts by itself when the app opens with Calm Mode already on', async () => {
    await openApp({ calmMode: true });
    expect(startCalmSound).not.toHaveBeenCalled();
    // The student can still choose to play it.
    expect(screen.getByRole('button', { name: 'Play calming sound' })).toBeInTheDocument();
  });

  it('does not start automatically when switched off in Settings', async () => {
    await openApp({ calmTone: false });
    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));
    await screen.findByRole('button', { name: 'Turn Calm Mode off' });
    expect(startCalmSound).not.toHaveBeenCalled();
  });

  it('switching the setting off saves the choice and stops a sound that is playing', async () => {
    await openApp();
    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));
    await screen.findByRole('button', { name: 'Stop calming sound' });
    vi.mocked(stopCalmSound).mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(within(document.querySelector('.drawer')).getByRole('button', { name: /^Settings/ }));
    const toneSwitch = await screen.findByRole('switch', { name: /Play calming sound when Calm Mode starts/ });
    expect(toneSwitch).toBeChecked();
    fireEvent.click(toneSwitch);

    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('nuvora-demo-data-v1')).settings.calmTone).toBe(false));
    expect(stopCalmSound).toHaveBeenCalled();
  });

  it('stops when the app closes', async () => {
    await openApp();
    fireEvent.click(screen.getByRole('button', { name: 'Turn Calm Mode on' }));
    await screen.findByRole('button', { name: 'Stop calming sound' });
    vi.mocked(stopCalmSound).mockClear();
    cleanup();
    expect(stopCalmSound).toHaveBeenCalled();
  });
});
