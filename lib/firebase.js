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

// Deletes the Firebase Auth account itself. Firebase requires a "recent"
// sign-in for this — if the session is older than a few minutes it throws
// `auth/requires-recent-login` instead of silently failing, so the caller
// (the Privacy screen) can catch that specific error and prompt for the
// student's password before retrying. This only ever runs after the
// caller has already deleted the user's Firestore data (see
// lib/store.js's deleteAllData), since deleting the auth user first would
// make the student unable to re-authenticate to clean up their own data.
export async function deleteAccount(password) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  try {
    await firebaseDeleteUser(user);
  } catch (err) {
    if (err.code !== 'auth/requires-recent-login') throw err;
    if (!password) {
      const needsPassword = new Error('Please re-enter your password to confirm account deletion.');
      needsPassword.code = 'auth/requires-recent-login';
      throw needsPassword;
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    await firebaseDeleteUser(user);
  }
}
