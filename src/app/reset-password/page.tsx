'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';

  const [status, setStatus] = useState<'checking' | 'form' | 'success' | 'error'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid or expired link.');
      setStatus('error');
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setStatus('form');
      })
      .catch(() => {
        setError('This reset link is invalid or has expired. Please request a new one.');
        setStatus('error');
      });
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/expired-action-code': 'This link has expired. Please request a new one.',
        'auth/invalid-action-code': 'This link is invalid. Please request a new one.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
      };
      setError(msg[err.code] || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'checking') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ color: '#888', fontSize: '0.95rem' }}>Verifying link...</p>
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell>
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>🔑</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.5rem', textAlign: 'center' }}>
          Invalid Link
        </h1>
        <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
          {error}
        </p>
        <a href="/forgot-password" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '0.75rem', background: '#6B2D4E', color: '#FBEEDD', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}>
          Request New Link
        </a>
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <a href="/login" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Back to Sign In
          </a>
        </div>
      </Shell>
    );
  }

  if (status === 'success') {
    return (
      <Shell>
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>🔑</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.5rem', textAlign: 'center' }}>
          Password Updated
        </h1>
        <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
          Your password has been changed successfully. You can now sign in.
        </p>
        <a href="/login" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '0.75rem', background: '#6B2D4E', color: '#FBEEDD', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}>
          Back to Sign In
        </a>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>🔑</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.4rem', textAlign: 'center' }}>
        Reset Your Password
      </h1>
      <p style={{ color: '#888', margin: '0 0 1.25rem', fontSize: '0.88rem', textAlign: 'center' }}>
        for <strong style={{ color: '#6B2D4E' }}>{email}</strong>
      </p>

      {error && (
        <div style={{ background: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.9rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.35rem' }}>
            New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ width: '100%', padding: '0.65rem 3rem 0.65rem 0.9rem', border: '1.5px solid #E0D0C0', borderRadius: '10px', fontSize: '0.9rem', background: '#FBEEDD', color: '#333', outline: 'none', boxSizing: 'border-box' }}
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.8rem', padding: 0, fontWeight: 600 }}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.35rem' }}>
            Confirm New Password
          </label>
          <input
            style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1.5px solid #E0D0C0', borderRadius: '10px', fontSize: '0.9rem', background: '#FBEEDD', color: '#333', outline: 'none', boxSizing: 'border-box' }}
            type={showPassword ? 'text' : 'password'}
            placeholder="********"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '0.7rem', background: '#6B2D4E', color: '#FBEEDD', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Updating...' : 'Reset Password'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
        <a href="/login" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to Sign In
        </a>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '380px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>
        {children}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
