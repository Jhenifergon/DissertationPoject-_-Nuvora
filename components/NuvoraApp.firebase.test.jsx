import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// These tests exercise Firebase-mode-specific UI (login/signup, account
// deletion, load-failure recovery) that never runs in local/demo mode —
// the mode this project's other test files all use, since no real
// Firebase project is configured in the test environment. Firebase itself
// (both the 'firebase/auth' package and this project's lib/firebase.js
// wrapper) is mocked rather than hitting a real project.

const mockOnAuthStateChanged = vi.fn();
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockSignOut = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
  signInWithEmailAndPassword: (...args) => mockSignIn(...args),
  createUserWithEmailAndPassword: (...args) => mockSignUp(...args),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
  signOut: (...args) => mockSignOut(...args),
}));

const mockReauthenticate = vi.fn();
const mockDeleteAccount = vi.fn();

vi.mock('@/lib/firebase', () => ({
  firebaseEnabled: true,
  auth: {},
  db: {},
  reauthenticate: (...args) => mockReauthenticate(...args),
  deleteAccount: (...args) => mockDeleteAccount(...args),
}));

const mockLoadData = vi.fn();
const mockDeleteAllData = vi.fn();

vi.mock('@/lib/store', async () => {
  const actual = await vi.importActual('@/lib/store');
  return { ...actual, loadData: (...args) => mockLoadData(...args), deleteAllData: (...args) => mockDeleteAllData(...args) };
});

const FAKE_USER = { uid: 'test-uid', email: 'test@example.com' };

function signedOut() {
  mockOnAuthStateChanged.mockImplementation((authObj, cb) => { cb(null); return () => {}; });
}
function signedIn() {
  mockOnAuthStateChanged.mockImplementation((authObj, cb) => { cb(FAKE_USER); return () => {}; });
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
});

describe('Firebase mode: login/signup error mapping', () => {
  it('maps a login failure to a specific, non-revealing message', async () => {
    signedOut();
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);
    await screen.findByText('Welcome to your calm study space');

    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
    const form = document.querySelector('form');
    fireEvent.click(within(form).getByRole('button', { name: 'Log in' }));

    await screen.findByText("The email or password doesn't match. Please check and try again.");
  });

  it('maps a signup email-already-in-use failure distinctly', async () => {
    signedOut();
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);
    await screen.findByText('Welcome to your calm study space');
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    mockSignUp.mockRejectedValue({ code: 'auth/email-already-in-use' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await screen.findByText(/Try logging in instead/);
  });
});

describe('Firebase mode: forgot password', () => {
  it('shows the same reassuring message whether or not the account exists', async () => {
    signedOut();
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);
    await screen.findByText('Welcome to your calm study space');
    fireEvent.click(screen.getByText('Forgot password?'));
    await screen.findByText('Reset your password');

    mockSendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset email' }));
    const message1 = await screen.findByText(/instructions have been sent/);

    // Now simulate a real account — same message either way.
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'real@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset email' }));
    const message2 = await screen.findByText(/instructions have been sent/);

    expect(message1.textContent).toBe(message2.textContent);
  });

  it('does show a distinct message for a genuine, non-enumeration error', async () => {
    signedOut();
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);
    await screen.findByText('Welcome to your calm study space');
    fireEvent.click(screen.getByText('Forgot password?'));
    await screen.findByText('Reset your password');

    mockSendPasswordResetEmail.mockRejectedValue({ code: 'auth/network-request-failed' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset email' }));
    await screen.findByText(/hasn't been changed/);
  });
});

describe('Firebase mode: load failure and retry', () => {
  it('shows a calm recoverable error instead of an indefinite frozen splash', async () => {
    signedIn();
    mockLoadData.mockRejectedValue(new Error('permission-denied'));
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);

    await screen.findByText('We couldn’t load your study space.');
    expect(screen.getByText('Your data hasn’t been changed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('recovers when the student presses Try again and the retry succeeds', async () => {
    signedIn();
    mockLoadData
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ tasks: [], checkins: [], reflections: [], settings: {}, stats: {} });
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);

    await screen.findByText('We couldn’t load your study space.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('How are things feeling, there?');
    expect(mockLoadData).toHaveBeenCalledTimes(2);
  });

  it('Sign out is available from the error screen without needing a successful load first', async () => {
    signedIn();
    mockLoadData.mockRejectedValue(new Error('down'));
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);

    await screen.findByText('We couldn’t load your study space.');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe('Firebase mode: account deletion order', () => {
  beforeEach(() => {
    signedIn();
    mockLoadData.mockResolvedValue({ tasks: [], checkins: [], reflections: [], settings: {}, stats: {} });
    mockDeleteAllData.mockResolvedValue(undefined);
  });

  async function openDeleteAccountPanel() {
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByText('Privacy & data'));
    await screen.findByText('Privacy & data', { selector: 'h1' });
    // "Type DELETE to confirm" appears in both the "delete all data" and
    // "delete my account" panels — the account panel's is the last one.
    const confirmInputs = screen.getAllByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(confirmInputs[confirmInputs.length - 1], { target: { value: 'DELETE' } });
    fireEvent.change(screen.getByLabelText('Confirm your password'), { target: { value: 'mypassword' } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  }

  it('reauthenticates before touching any data — proving the fix for the old unsafe order', async () => {
    await openDeleteAccountPanel();
    mockReauthenticate.mockResolvedValue(undefined);
    mockDeleteAccount.mockResolvedValue(undefined);
    const callOrder = [];
    mockReauthenticate.mockImplementation(async () => { callOrder.push('reauthenticate'); });
    mockDeleteAccount.mockImplementation(async () => { callOrder.push('deleteAccount'); });

    fireEvent.click(screen.getByRole('button', { name: /Delete my account/ }));
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled());

    expect(callOrder).toEqual(['reauthenticate', 'deleteAccount']);
  });

  it('never deletes the account if reauthentication fails — no data is touched', async () => {
    await openDeleteAccountPanel();
    mockReauthenticate.mockRejectedValue({ code: 'auth/wrong-password' });

    fireEvent.click(screen.getByRole('button', { name: /Delete my account/ }));
    await screen.findByText("The email or password doesn't match. Please check and try again.");

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('requires a password before attempting deletion at all', async () => {
    const NuvoraApp = (await import('./NuvoraApp')).default;
    render(<NuvoraApp />);
    await screen.findByText('How are things feeling, there?');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(await screen.findByText('Privacy & data'));
    await screen.findByText('Privacy & data', { selector: 'h1' });
    const confirmInputs = screen.getAllByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(confirmInputs[confirmInputs.length - 1], { target: { value: 'DELETE' } });
    // No password entered.
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/ }));

    await screen.findByText('Enter your password to confirm.');
    expect(mockReauthenticate).not.toHaveBeenCalled();
  });
});
