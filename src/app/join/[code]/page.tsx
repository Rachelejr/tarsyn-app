'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { memberAuth as auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  text: '#1a1a1a',
  muted: '#6b7280',
  border: '#e5e7eb',
  danger: '#B0525F',
  dangerBg: '#F5E4E6',
};

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid ' + C.border,
  fontSize: 14, color: C.text, background: C.blanc, outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
};

type LookupResult = {
  found: boolean;
  memberId?: string;
  fullName?: string;
  email?: string;
  groupId?: string;
  groupName?: string;
  tynId?: string;
  alreadyRegistered?: boolean;
};

function JoinContent() {
  const router = useRouter();
  const params = useParams();
  const code = (params?.code as string) || '';

  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch('/api/join-lookup?code=' + encodeURIComponent(code));
        const data = await res.json();
        setLookup(data);
        if (data?.email) setEmail(data.email);
      } catch (e) {
        setLookup({ found: false });
      }
      setLoading(false);
    })();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookup?.found || !lookup.memberId) return;
    setError('');

    if (mode === 'signup') {
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (!lookup.fullName && !fullName.trim()) { setError('Please enter your full name.'); return; }
    }
    if (!email) { setError('Email is required.'); return; }

    setSubmitting(true);
    try {
      let userId: string;
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const resolvedName = lookup.fullName || fullName.trim();
        await updateProfile(result.user, { displayName: resolvedName });
        userId = result.user.uid;
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        userId = result.user.uid;
      }

      const confirmRes = await fetch('/api/join-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: lookup.memberId, userId, name: lookup.fullName || fullName.trim(), email }),
      });
      if (!confirmRes.ok) {
        const data = await confirmRes.json().catch(() => ({}));
        throw new Error(data.error || 'Could not link your account to this group.');
      }

      setSuccess(true);
      setTimeout(() => router.push('/member'), 1500);
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        // A UNIMUNITY account can belong to members across several different
        // groups - this is expected, not an error. Switch straight to sign
        // in so joining a second (or third...) group with the same email
        // is one smooth step instead of a dead-end message.
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
        setError('You already have a UNIMUNITY account with this email. Sign in below to join this group too.');
        setSubmitting(false);
        return;
      }
      const msgs: Record<string, string> = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/user-not-found': 'No account found with this email. Try "Create account" instead.',
        'auth/invalid-credential': 'Incorrect email or password.',
      };
      setError(msgs[err?.code] || err?.message || 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: C.bordeaux, fontSize: 16, fontWeight: 600 }}>Loading your invitation...</p>
      </div>
    );
  }

  if (!lookup?.found) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 20 }}>
        <div style={{ background: C.blanc, borderRadius: 18, padding: '40px 32px', textAlign: 'center', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>Invitation not found</h2>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px', lineHeight: 1.6 }}>
            This invite link is invalid or may have expired. Please contact your organizer for a new invitation.
          </p>
          <a href="/login" style={{ display: 'inline-block', padding: '12px 24px', background: C.bordeaux, color: C.creme, borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  if (lookup.alreadyRegistered) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 20 }}>
        <div style={{ background: C.blanc, borderRadius: 18, padding: '40px 32px', textAlign: 'center', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>Already registered</h2>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px', lineHeight: 1.6 }}>
            This invitation has already been used to create an account. Please sign in instead.
          </p>
          <a href="/login" style={{ display: 'inline-block', padding: '12px 24px', background: C.bordeaux, color: C.creme, borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 20 }}>
        <div style={{ background: C.blanc, borderRadius: 18, padding: '40px 32px', textAlign: 'center', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26 }}>+</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>You're all set!</h2>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Taking you to your member portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.blanc, borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%', boxShadow: '0 8px 40px rgba(107,45,78,0.10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ width: 52, height: 52, background: C.bordeaux, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 22, color: C.or }}>+</div>
          <h1 style={{ color: C.bordeaux, fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>You're invited!</h1>
          <p style={{ color: C.text, fontSize: 14, margin: 0 }}>
            Join <strong>{lookup.groupName || 'your group'}</strong> on UNIMUNITY
          </p>
        </div>

        <div style={{ background: C.creme, borderRadius: 12, padding: '14px 16px', marginBottom: 22 }}>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Member</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{lookup.fullName || 'Member'}</p>
          {lookup.tynId && <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>TYN-ID: {lookup.tynId}</p>}
        </div>

        {error && (
          <div style={{ background: C.dangerBg, color: C.danger, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {!lookup.fullName && mode === 'signup' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>Full Name</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" style={inputStyle} />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>
              {mode === 'signup' ? 'Create a Password (8 characters minimum)' : 'Password'}
            </label>
            <div style={{ position: 'relative' as const }}>
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" style={{ ...inputStyle, paddingRight: 64 }} />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                style={{ position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.bordeaux, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: '4px 6px' }}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {mode === 'signup' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>Confirm Password</label>
              <div style={{ position: 'relative' as const }}>
                <input type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password" style={{ ...inputStyle, paddingRight: 64 }} />
                <button type="button" onClick={() => setShowConfirmPassword(s => !s)}
                  style={{ position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.bordeaux, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: '4px 6px' }}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting}
            style={{ width: '100%', padding: 13, background: C.bordeaux, color: C.creme, border: 'none', borderRadius: 10, fontSize: 14.5, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginBottom: 14 }}>
            {submitting ? 'Please wait...' : mode === 'signup' ? 'Create Account & Join' : 'Sign In & Join'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12.5, color: C.muted, margin: 0 }}>
          {mode === 'signup' ? (
            <>Already have a UNIMUNITY account? <span onClick={() => { setMode('signin'); setError(''); }} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Sign in instead</span></>
          ) : (
            <>New to UNIMUNITY? <span onClick={() => { setMode('signup'); setError(''); }} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Create an account</span></>
          )}
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
      <JoinContent />
    </Suspense>
  );
}
