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
      setError('Lien invalide ou expire.');
      setStatus('error');
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setStatus('form');
      })
      .catch(() => {
        setError('Ce lien de reinitialisation est invalide ou a expire. Demandez un nouveau lien.');
        setStatus('error');
      });
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/expired-action-code': 'Ce lien a expire. Demandez un nouveau lien.',
        'auth/invalid-action-code': 'Ce lien est invalide. Demandez un nouveau lien.',
        'auth/weak-password': 'Mot de passe trop faible. Utilisez au moins 6 caracteres.',
      };
      setError(msg[err.code] || 'Une erreur est survenue. Reessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'checking') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ color: '#888', fontSize: '0.95rem' }}>Verification du lien...</p>
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.5rem', textAlign: 'center' }}>
          Lien invalide
        </h1>
        <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
          {error}
        </p>
        <a href="/forgot-password" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '0.85rem', background: '#6B2D4E', color: '#FAF0E6', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}>
          Demander un nouveau lien
        </a>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/login" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none' }}>
            Retour a la connexion
          </a>
        </div>
      </Shell>
    );
  }

  if (status === 'success') {
    return (
      <Shell>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.5rem', textAlign: 'center' }}>
          Mot de passe modifie
        </h1>
        <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
          Votre mot de passe a ete mis a jour avec succes. Vous pouvez maintenant vous connecter.
        </p>
        <a href="/login" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '0.85rem', background: '#6B2D4E', color: '#FAF0E6', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}>
          Aller a la connexion
        </a>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: '1.4rem', color: '#6B2D4E' }}>TARSYN</p>
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em' }}>YOUR COMMUNITY</p>
      </div>

      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.25rem' }}>
        Reset your password
      </h1>
      <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
        for <strong style={{ color: '#6B2D4E' }}>{email}</strong>
      </p>

      {error && (
        <div style={{ background: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>
            New password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', border: '1.5px solid #E0D0C0', borderRadius: '10px', fontSize: '0.95rem', background: '#FAF0E6', color: '#333', outline: 'none', boxSizing: 'border-box' }}
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.85rem', padding: 0, fontWeight: 600 }}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>
            Confirm new password
          </label>
          <input
            style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #E0D0C0', borderRadius: '10px', fontSize: '0.95rem', background: '#FAF0E6', color: '#333', outline: 'none', boxSizing: 'border-box' }}
            type={showPassword ? 'text' : 'password'}
            placeholder="********"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '0.85rem', background: '#6B2D4E', color: '#FAF0E6', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Mise a jour...' : 'Reset password'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <a href="/login" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none' }}>
          Retour a la connexion
        </a>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>
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
