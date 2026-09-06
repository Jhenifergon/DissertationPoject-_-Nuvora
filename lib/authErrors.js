// Maps Firebase Auth error codes to calm, specific, supportive messages.
// A raw Firebase error code (or its default English message, which is
// written for developers, not students) is never shown directly.
//
// Login and signup deliberately use the SAME vague message for
// "wrong password" / "no such user" (auth/invalid-credential,
// auth/wrong-password, auth/user-not-found) rather than distinguishing
// them — confirming whether an email address has an account at all is
// an account-enumeration risk we don't need to take on. Signup's
// "email already in use" is the one deliberate exception: Firebase's own
// flow already reveals that regardless of our wording, so hiding it
// would only make the message less helpful without adding any real
// privacy protection.
const MESSAGES = {
  'auth/invalid-credential': "The email or password doesn't match. Please check and try again.",
  'auth/wrong-password': "The email or password doesn't match. Please check and try again.",
  'auth/user-not-found': "The email or password doesn't match. Please check and try again.",
  'auth/invalid-email': 'Check that your email address is written correctly.',
  'auth/email-already-in-use': 'An account already exists with this email. Try logging in instead.',
  'auth/weak-password': 'Choose a password with at least 6 characters.',
  'auth/too-many-requests': 'There have been several attempts. Please try again shortly.',
  'auth/network-request-failed': "We couldn't connect right now. Your information hasn't been changed.",
  'auth/requires-recent-login': 'Please re-enter your password to confirm.',
  'auth/user-mismatch': "That password doesn't match this account.",
  'auth/user-disabled': 'This account is no longer available. Contact support if this seems wrong.',
};

const DEFAULT_MESSAGE = 'Something went wrong. Please try again in a moment.';

export function authErrorMessage(error, fallback = DEFAULT_MESSAGE) {
  return MESSAGES[error?.code] || fallback;
}
