'use client';

import { useState } from 'react';
import { Leaf } from 'lucide-react';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authErrorMessage } from '@/lib/authErrors';
import { saveSettings } from '@/lib/store';
import { Mascot } from '@/components/ui/Mascot';
import { Logo } from '@/components/ui/Logo';
import { StatusMessage } from '@/components/ui/StatusMessage';

export function Auth() {
  const [mode, setMode] = useState('login'); // login | signup | reset
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState({ text: '', tone: 'status' });

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Optional and skippable, per the brief — no surname, student ID,
        // or anything else identifying is ever requested here.
        if (displayName.trim()) {
          await saveSettings(credential.user.uid, { displayName: displayName.trim() });
        }
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Deliberately shows the same calm message whether or not an account
  // exists for the entered email — Firebase's own reset flow can be used
  // to probe which emails are registered otherwise, and there's no reason
  // to hand that information out.
  async function submitReset(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResetStatus({ text: '', tone: 'status' });
    const REASSURING_MESSAGE = 'If an account exists for this email, password-reset instructions have been sent.';
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetStatus({ text: REASSURING_MESSAGE, tone: 'status' });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setResetStatus({ text: REASSURING_MESSAGE, tone: 'status' });
      } else {
        setResetStatus({ text: authErrorMessage(err), tone: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'reset') {
    return <main className="auth-shell"><section className="phone auth auth-phone">
      <div className="auth-brand-row">
        <Logo />
      </div>

      <div className="auth-hero auth-hero-reset">
        <div className="auth-cloud-wrap" aria-hidden="true">
          <Mascot size={76} mood="calm" />
        </div>
        <div>
          <small>ACCOUNT SUPPORT</small>
          <h1>Reset your password</h1>
          <p>Enter the email you signed up with, and we’ll send instructions if an account exists for it.</p>
        </div>
      </div>

      <div className="auth-card">
        <form onSubmit={submitReset}>
          <label>Email<input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required /></label>
          <StatusMessage text={resetStatus.text} tone={resetStatus.tone} />
          <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset email'}</button>
        </form>
        <button className="link auth-back-link" onClick={() => setMode('login')}>Back to log in</button>
      </div>
    </section></main>;
  }

  return <main className="auth-shell"><section className="phone auth auth-phone">
    <div className="auth-brand-row">
      <Logo />
    </div>

    <div className="auth-hero">
      <div className="auth-cloud-wrap" aria-hidden="true">
        <Mascot size={82} mood="calm" />
      </div>
      <div>
        <small>{mode === 'login' ? 'WELCOME BACK' : 'WELCOME TO NUVORA'}</small>
        <h1>Welcome to your calm study space</h1>
        <p>No shame. No pressure. One step at a time.</p>
      </div>
    </div>

    <div className="auth-card">
      <div className="tabs auth-tabs" aria-label="Account options">
        <button type="button" onClick={() => setMode('login')} className={mode === 'login' ? 'active' : ''}>Log in</button>
        <button type="button" onClick={() => setMode('signup')} className={mode === 'signup' ? 'active' : ''}>Sign up</button>
      </div>

      <form onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {mode === 'signup' && <label>What should Nuvora call you? (optional)<input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="You can skip this" /></label>}
        {mode === 'login' && <button type="button" className="link auth-forgot-link" onClick={() => { setResetEmail(email); setMode('reset'); }}>Forgot password?</button>}
        <StatusMessage text={error} tone="error" />
        <button className="primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : (mode === 'login' ? 'Log in' : 'Create account')}</button>
      </form>

      <div className="auth-note">
        <Leaf aria-hidden="true" />
        <span>Your study space stays focused on support, not judgement.</span>
      </div>
    </div>
  </section></main>;
}
