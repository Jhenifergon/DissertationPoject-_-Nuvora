import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app';

import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  deleteUser as firebaseDeleteUser,
} from 'firebase/auth';

import {
  getFirestore,
} from 'firebase/firestore';

const config = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  config.apiKey &&
  config.projectId
);

const app = firebaseEnabled
  ? (
      getApps().length
        ? getApp()
        : initializeApp(config)
    )
  : null;

export const auth = app
  ? getAuth(app)
  : null;

/*
 * Firestore Web uses an in-memory cache by default.
 *
 * Nuvora intentionally does NOT enable persistent IndexedDB caching
 * automatically because check-ins and workload-support information may be
 * sensitive when the application is used on a shared computer.
 *
 * This means:
 * - active-session caching is still available through Firestore;
 * - persistent browser storage is not enabled by this configuration;
 * - closing the browser should not be described as guaranteed offline
 *   persistence;
 * - a future "trusted device" preference could explicitly enable persistent
 *   caching after informed user consent.
 *
 * This design prioritises privacy and data minimisation over persistent
 * offline storage for the current dissertation artefact.
 */
export const db = app
  ? getFirestore(app)
  : null;

/*
 * Re-authenticate the currently signed-in user using their password.
 *
 * Account deletion deliberately performs this check BEFORE deleting stored
 * Firestore information. This prevents the known
 * `auth/requires-recent-login` case from being discovered only after user
 * data has already been deleted.
 *
 * Re-authentication does not make the complete deletion process atomic,
 * because Firebase Authentication and Firestore are separate services.
 */
export async function reauthenticate(
  password
) {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error(
      'Not signed in.'
    );
  }

  if (!user.email) {
    throw new Error(
      'The signed-in account does not have an email address available for re-authentication.'
    );
  }

  const credential =
    EmailAuthProvider.credential(
      user.email,
      password
    );

  await reauthenticateWithCredential(
    user,
    credential
  );
}

/*
 * Delete the Firebase Authentication account.
 *
 * The Privacy screen is responsible for the surrounding sequence:
 *
 * 1. reauthenticate()
 * 2. delete the user's Firestore data
 * 3. deleteAccount()
 *
 * The previous implementation could begin deleting Firestore information
 * before confirming that Firebase Authentication considered the session
 * recent enough to delete the account.
 *
 * Performing re-authentication first removes that known
 * `requires-recent-login` failure mode before destructive data work begins.
 *
 * However, the full operation is still NOT transactional across Firestore
 * and Firebase Authentication. A later network or service failure could
 * theoretically interrupt the sequence after some data has already been
 * deleted. The dissertation should therefore describe this as a risk
 * reduction rather than as guaranteed atomic deletion.
 */
export async function deleteAccount() {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error(
      'Not signed in.'
    );
  }

  await firebaseDeleteUser(
    user
  );
}