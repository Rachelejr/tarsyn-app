'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AppPage from '@/components/assistants/AppPage';

type Lookup = { found: boolean; status?: string; firstName?: string; title?: string; organizerName?: string; email?: string; emailMasked?: string };

// Public page opened from the invitation email. The invited person creates
// their account (or signs in) with the invited email, then accepts.
export default function AcceptAssistantPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const [info, setInfo] = useState<Lookup | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    fetch('/api/assistants/lookup?token=' + encodeURIComponent(token))
      .then(r => r.json()).then(setInfo).catch(() => setInfo({ found: false }));
  }, [token]);
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); }), []);

  const invitedEmail = (info?.email || '').toLowerCase();
  const signedInAsOther = !!user && (user.email || '').toLowerCase() !== invitedEmail;
  const signedInAsInvited = !!user && !signedInAsOther;

  const accept = async (u: User) => {
    const idToken = await u.getIdToken(true);
    const res = await fetch('/api/assistants/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not accept the invitation.');
    setAccepted(true);
  };

  const submit = async () => {
    setError('');
    if (signedInAsInvited && user) {
      setBusy(true);
      try { await accept(user); } catch (e) { setError((e as Error).message); }
      setBusy(false);
      return;
    }
    if (password.length < 8) { setError('Your password must have at least 8 characters.'); return; }
    if (mode === 'create' && password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      let u: User;
      if (mode === 'create') {
        try {
          const r = await createUserWithEmailAndPassword(auth, invitedEmail, password);
          u = r.user;
          if (info?.firstName) await updateProfile(u, { displayName: info.firstName });
        } catch (e) {
          if ((e as { code?: string }).code === 'auth/email-already-in-use') {
            setMode('signin');
            setError('An account already exists with this email. Enter its password to continue.');
            setBusy(false);
            return;
          }
          throw e;
        }
      } else {
        u = (await signInWithEmailAndPassword(auth, invitedEmail, password)).user;
      }
      await accept(u);
    } catch (e) {
      const code = (e as { code?: string }).code || '';
      setError(code.includes('wrong-password') || code.includes('invalid-credential') ? 'Wrong password. Try again.' : (e as Error).message || 'Something went wrong.');
    }
    setBusy(false);
  };

  const card = (children: React.ReactNode) => (
    <div className="ap-card" style={{ maxWidth: 520, margin: '24px auto', padding: 0, overflow: 'hidden' }}>{children}</div>
  );

  let body: React.ReactNode;
  if (!info || !authReady) {
    body = card(<p style={{ padding: 30, margin: 0, textAlign: 'center', color: '#8A7B6C' }}>Loading...</p>);
  } else if (!info.found) {
    body = card(<p style={{ padding: '30px 28px', margin: 0, textAlign: 'center', color: '#3A2F1F', lineHeight: 1.6 }}>This invitation link is not valid. Ask the person who invited you to send a new one.</p>);
  } else if (accepted) {
    body = card(
      <div style={{ padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#E9C77B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>{'\u2713'}</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#4A1F38' }}>Welcome, {info.firstName}!</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#8A7B6C', lineHeight: 1.6 }}>
          You are now the <b style={{ color: '#4A1F38' }}>{info.title}</b> of <b style={{ color: '#4A1F38' }}>{info.organizerName}</b>.
          Sign in at <b style={{ color: '#4A1F38' }}>unimunity.com</b> with {info.email} to help with their groups.
        </p>
      </div>
    );
  } else if (info.status === 'accepted') {
    body = card(<p style={{ padding: '30px 28px', margin: 0, textAlign: 'center', color: '#3A2F1F', lineHeight: 1.6 }}>This invitation was already accepted. Sign in at unimunity.com with {info.emailMasked}.</p>);
  } else if (info.status !== 'invited') {
    body = card(<p style={{ padding: '30px 28px', margin: 0, textAlign: 'center', color: '#3A2F1F', lineHeight: 1.6 }}>This invitation has expired or was cancelled. Ask {info.organizerName} to send you a new one.</p>);
  } else {
    body = card(
      <>
        <div style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', padding: '20px 26px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, color: '#E9C77B', letterSpacing: 1.5, textTransform: 'uppercase' }}>Assistant invitation</p>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(251,238,221,.85)' }}>{info.organizerName} invites you to be their</p>
          <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>{info.title}</p>
        </div>
        <div style={{ padding: '20px 26px 24px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#3A2F1F', lineHeight: 1.6 }}>
            Hello {info.firstName}, you will help manage their groups with <b>your own account</b>. They can change or stop this access at any time.
          </p>
          {signedInAsOther ? (
            <div style={{ background: '#FBF2DC', border: '1px solid #E5CC8E', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#4A1F38' }}>You are signed in as <b>{user?.email}</b>. Sign out to accept with <b>{info.emailMasked}</b>.</p>
              <button className="ap-btn ap-soft" onClick={() => signOut(auth)}>Sign out</button>
            </div>
          ) : (
            <>
              <label className="ap-label">Email</label>
              <input className="ap-in" value={info.email || ''} readOnly style={{ background: '#F5F0EA', marginBottom: 10 }} />
              {!signedInAsInvited && (
                <>
                  <label className="ap-label">{mode === 'create' ? 'Create a password' : 'Your password'}</label>
                  <input className="ap-in" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} style={{ marginBottom: 10 }} />
                  {mode === 'create' && (
                    <>
                      <label className="ap-label">Confirm the password</label>
                      <input className="ap-in" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" style={{ marginBottom: 6 }} />
                      <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#A08B7D' }}>At least 8 characters.</p>
                    </>
                  )}
                </>
              )}
              {error && <p style={{ margin: '4px 0 10px', fontSize: 12.5, color: '#C62828', fontWeight: 600 }}>{error}</p>}
              <button className="ap-btn ap-primary" style={{ width: '100%' }} disabled={busy} onClick={submit}>
                {busy ? 'Please wait...' : signedInAsInvited ? 'Accept the invitation' : mode === 'create' ? 'Create my account and accept' : 'Sign in and accept'}
              </button>
              {!signedInAsInvited && (
                <p style={{ margin: '12px 0 0', fontSize: 12.5, textAlign: 'center', color: '#8A7B6C' }}>
                  {mode === 'create' ? 'Already have an account with this email? ' : 'No account yet? '}
                  <button onClick={() => { setMode(mode === 'create' ? 'signin' : 'create'); setError(''); }} style={{ background: 'none', border: 'none', color: '#6B2D4E', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 12.5 }}>
                    {mode === 'create' ? 'Sign in instead' : 'Create one'}
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  return <AppPage title="Assistant Invitation" subtitle="Help manage savings groups on UNIMUNITY.">{body}</AppPage>;
}
