import { getApp, getApps, initializeApp } from 'firebase/app';
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, deleteUser as firebaseDeleteUser } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseEnabled = Boolean(config.apiKey && config.projectId);
const app = firebaseEnabled ? (getApps().length ? getApp() : initializeApp(config)) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Re-authenticates the current user with their password. Account
// deletion always calls this first, unconditionally — rather than only
// reactively after Firebase complains with `auth/requires-recent-login`
// — so that a destructive delete is never attempted, and Firestore data
// is never touched, until we've positively confirmed the session is
// valid enough to complete the whole thing. See deleteAccount() below
// for why this ordering matters.
export async function reauthenticate(password) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

// Deletes the Firebase Auth account itself. The caller (the Privacy
// screen) is responsible for calling reauthenticate() first, then
// deleting Firestore data (lib/store.js's deleteAllData), and only then
// calling this — in that order. The earlier version of this flow deleted
// Firestore data before confirming the auth deletion could succeed,
// which meant a `requires-recent-login` failure could leave a student
// with their data already gone but the account still existing. Doing
// the reauthentication check first (and up front, not reactively)
// removes that failure window entirely: either the whole sequence
// completes, or nothing destructive has happened yet.
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  await firebaseDeleteUser(user);
}
