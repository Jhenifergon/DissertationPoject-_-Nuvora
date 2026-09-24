'use client';

import { useState } from 'react';
import { ChevronLeft, Download, Shield, Trash2 } from 'lucide-react';
import { deleteAccount, firebaseEnabled, reauthenticate } from '@/lib/firebase';
import { authErrorMessage } from '@/lib/authErrors';
import { defaultSettings, defaultStats, deleteAllData, deleteCheckinHistory, deleteCompletedTasks, exportAllData } from '@/lib/store';
import { GENERIC_ERROR } from '@/components/constants';
import { PageTitle } from '@/components/ui/PageTitle';
import { StatusMessage } from '@/components/ui/StatusMessage';

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Privacy & data: plain-language explanations first, then the controls.
// Each delete option removes exactly what its label says and nothing else,
// and every one asks for confirmation; the two "everything" options also
// require typing DELETE, because they cannot be undone.
//  • Export: downloads everything loadData returns as a JSON file. In
//    Firebase mode, timestamps appear as {seconds, nanoseconds} objects.
//  • Delete all my data: in Firebase mode this deletes the tasks, check-ins
//    and reflections collections and the users/{uid} document; this screen
//    then saves the default settings, which creates that document again
//    holding only default preferences. In demo mode the browser store is
//    replaced with an empty one (not removed, which would bring the sample
//    data back).
//  • Delete my account (Firebase only): the password is checked first, then
//    the data is deleted, then the sign-in account. Firestore and Firebase
//    Auth are separate services, so this is not a single atomic operation.
export function Privacy({ uid, data, setData, updateSettings, back }) {
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState({ text: '', tone: 'status' });
  const [confirmAll, setConfirmAll] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [password, setPassword] = useState('');

  function run(name, action, successText) {
    if (busy) return;
    setBusy(name);
    setStatus({ text: '', tone: 'status' });
    return action()
      .then(() => setStatus({ text: successText, tone: 'status' }))
      .catch(() => setStatus({ text: GENERIC_ERROR, tone: 'error' }))
      .finally(() => setBusy(null));
  }

  async function handleExport() {
    if (busy) return;
    setBusy('export');
    setStatus({ text: '', tone: 'status' });
    try {
      const exported = await exportAllData(uid);
      downloadJson(exported, `nuvora-data-export-${new Date().toISOString().slice(0, 10)}.json`);
      setStatus({ text: 'Your data has been downloaded as a JSON file.', tone: 'status' });
    } catch {
      setStatus({ text: GENERIC_ERROR, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  function handleDeleteCheckins() {
    if (!window.confirm('Delete all check-in and reflection history? This cannot be undone.')) return;
    run('checkins', async () => {
      await deleteCheckinHistory(uid);
      setData(d => ({ ...d, checkins: [], reflections: [] }));
    }, 'Check-in and reflection history deleted.');
  }

  function handleDeleteCompleted() {
    if (!window.confirm('Delete all completed tasks? This cannot be undone.')) return;
    run('completed', async () => {
      await deleteCompletedTasks(uid);
      setData(d => ({ ...d, tasks: d.tasks.filter(t => !t.done) }));
    }, 'Completed tasks deleted.');
  }

  function handleDeleteAll() {
    if (confirmAll.trim().toUpperCase() !== 'DELETE') {
      setStatus({ text: 'Type DELETE in the box to confirm.', tone: 'error' });
      return;
    }
    if (!window.confirm('This permanently deletes everything Nuvora has stored for you — tasks, check-ins, reflections, and settings. Continue?')) return;
    run('all', async () => {
      await deleteAllData(uid);
      setData(d => ({ ...d, tasks: [], checkins: [], reflections: [], stats: defaultStats }));
      await updateSettings(defaultSettings);
      setConfirmAll('');
    }, 'All your Nuvora data has been deleted.');
  }

  async function handleDeleteAccount() {
    if (confirmAccount.trim().toUpperCase() !== 'DELETE') {
      setStatus({ text: 'Type DELETE in the box to confirm.', tone: 'error' });
      return;
    }
    if (!password) {
      setStatus({ text: 'Enter your password to confirm.', tone: 'error' });
      return;
    }
    if (!window.confirm('This permanently deletes your account and all your data. This cannot be undone. Continue?')) return;
    if (busy) return;
    setBusy('account');
    setStatus({ text: '', tone: 'status' });
    try {
      // Reauthenticate first, unconditionally, before anything destructive
      // happens. This is the fix for the previous ordering, which deleted
      // Firestore data before finding out whether the account deletion
      // itself could even proceed — a student whose session had gone stale
      // could end up with their data gone but the account still there. If
      // this step fails (wrong password, expired session), nothing has
      // been touched yet.
      await reauthenticate(password);
      await deleteAllData(uid);
      setData(d => ({ ...d, tasks: [], checkins: [], reflections: [], stats: defaultStats }));
      await deleteAccount();
      // A successful deletion signs the student out; onAuthStateChanged
      // (in the top-level component) picks that up and returns to Auth
      // automatically — no manual navigation needed here.
    } catch (err) {
      setStatus({ text: authErrorMessage(err), tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return <>
    <button className="back" onClick={back.go}><ChevronLeft /> {back.label}</button>
    <PageTitle title="Privacy & data" tone="blue" icon={<Shield />} />

    <details className="panel"><summary>What Nuvora stores</summary>
      <p>Your tasks and their small steps, your daily check-in answers and the workload-pressure result calculated from them, any weekly reflections you write, your accessibility preferences, and a small count of how many steps you've completed and which support strategies you've used.</p>
    </details>

    <details className="panel"><summary>How your information is used</summary>
      <p>Only to run the features you're using — recommending a next step, showing your check-in trends, and remembering your settings. Nothing is used for any other purpose.</p>
    </details>

    <details className="panel"><summary>Who can see your information</summary>
      <p>{firebaseEnabled ? 'Only you. It’s stored in your Nuvora account on Firebase (Google Cloud), and the database is set up so only your signed-in account can read it.' : 'Nowhere but this browser. Nuvora is running in local demo mode: everything is stored in this browser’s local storage and never leaves this device. Clearing your browser data or using a different browser will lose it.'}</p>
      <p>Your data is <b>never automatically sent to tutors</b>, your university, or anyone else — the Support screen's "copy summary" only ever copies text to your own clipboard, for you to send yourself if you choose to.</p>
    </details>

    <details className="panel"><summary>Offline and shared devices</summary>
      <p>When you’re signed in, Nuvora doesn’t keep a lasting copy of your data in this browser, so it’s less likely to be left behind on a shared device. If you go offline, keep the app open so your changes can finish saving. Demo mode keeps its sample data in this browser only.</p>
    </details>

    <details className="panel"><summary>About the workload-pressure result</summary>
      <p>The workload-pressure band is <b>not a diagnosis</b> of ADHD, autism, burnout, or any condition — it's a supportive, rule-based estimate from your own answers, explained in full on the "Why this result?" details wherever it's shown.</p>
    </details>

    <details className="panel"><summary>Export your data</summary>
      <p>Download everything Nuvora has stored for you as a plain JSON file.</p>
      <button className="primary" disabled={!!busy} onClick={handleExport}><Download /> {busy === 'export' ? 'Preparing…' : 'Download my data'}</button>
    </details>

    <details className="panel"><summary>Delete your data</summary>
      <div className="panel" style={{ margin: '10px 0', boxShadow: 'none' }}>
        <h3>Check-in &amp; reflection history</h3>
        <p>Removes every check-in and reflection. Your tasks and settings are left untouched.</p>
        <button className="danger-btn" disabled={!!busy} onClick={handleDeleteCheckins}><Trash2 /> {busy === 'checkins' ? 'Deleting…' : 'Delete check-ins and reflections'}</button>
      </div>
      <div className="panel" style={{ margin: '10px 0', boxShadow: 'none' }}>
        <h3>Completed tasks</h3>
        <p>Removes tasks you've marked complete. Tasks still open are left untouched.</p>
        <button className="danger-btn" disabled={!!busy} onClick={handleDeleteCompleted}><Trash2 /> {busy === 'completed' ? 'Deleting…' : 'Delete completed tasks'}</button>
      </div>
      <div className="panel" style={{ margin: '10px 0', boxShadow: 'none' }}>
        <h3>Everything</h3>
        <p>Permanently removes every task, check-in, reflection, and setting. Type <b>DELETE</b> below to confirm.</p>
        <input type="text" value={confirmAll} disabled={busy === 'all'} onChange={e => setConfirmAll(e.target.value)} placeholder="Type DELETE to confirm" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginBottom: 10 }} />
        <button className="danger-btn" disabled={!!busy} onClick={handleDeleteAll}><Trash2 /> {busy === 'all' ? 'Deleting…' : 'Delete all my data'}</button>
      </div>
    </details>

    {firebaseEnabled && <details className="panel"><summary>Delete your account</summary>
      <p>Permanently deletes all your data and your Nuvora account itself. Type <b>DELETE</b> and confirm your password below.</p>
      <input type="text" value={confirmAccount} disabled={busy === 'account'} onChange={e => setConfirmAccount(e.target.value)} placeholder="Type DELETE to confirm" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginBottom: 10 }} />
      <label style={{ display: 'block', marginBottom: 10 }}>
        Confirm your password
        <input type="password" value={password} disabled={busy === 'account'} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginTop: 6 }} />
      </label>
      <button className="danger-btn" disabled={!!busy} onClick={handleDeleteAccount}><Trash2 /> {busy === 'account' ? 'Deleting…' : 'Delete my account'}</button>
    </details>}

    <StatusMessage text={status.text} tone={status.tone} />
  </>;
}
