import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('maps invalid-credential without revealing whether the account exists', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe("The email or password doesn't match. Please check and try again.");
  });

  it('gives the same message for wrong-password and user-not-found (no account-enumeration signal)', () => {
    const wrongPassword = authErrorMessage({ code: 'auth/wrong-password' });
    const userNotFound = authErrorMessage({ code: 'auth/user-not-found' });
    expect(wrongPassword).toBe(userNotFound);
  });

  it('maps email-already-in-use to a helpful, distinct message', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toContain('Try logging in instead');
  });

  it('maps invalid-email', () => {
    expect(authErrorMessage({ code: 'auth/invalid-email' })).toMatch(/written correctly/);
  });

  it('maps weak-password', () => {
    expect(authErrorMessage({ code: 'auth/weak-password' })).toMatch(/6 characters/);
  });

  it('maps network-request-failed and reassures nothing was changed', () => {
    expect(authErrorMessage({ code: 'auth/network-request-failed' })).toMatch(/hasn't been changed/);
  });

  it('maps too-many-requests', () => {
    expect(authErrorMessage({ code: 'auth/too-many-requests' })).toMatch(/try again shortly/);
  });

  it('never returns a raw Firebase code for an unknown error', () => {
    const message = authErrorMessage({ code: 'auth/some-new-error-firebase-just-added' });
    expect(message).not.toContain('auth/');
  });

  it('falls back to a generic supportive message for a non-Firebase error', () => {
    expect(authErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again in a moment.');
  });

  it('accepts a custom fallback message', () => {
    expect(authErrorMessage({}, 'Custom fallback')).toBe('Custom fallback');
  });
});
