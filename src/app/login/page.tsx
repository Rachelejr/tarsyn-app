'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectByRole = async (uid: string, uEmail: string) => {
    try {
      let role = null;

      const q1 = query(collection(db, 'members'), where('userId', '==', uid));
      const s1 = await getDocs(q1);
      if (!s1.empty) {
        role = s1.docs[0].data()?.role;
      } else {
        const q2 = query(collection(db, 'members'), where('email', '==', uEmail));
        const s2 = await getDocs(q2);
        if (!s2.empty) role = s2.docs[0].data()?.role;
      }

      if (role === 'admin' || role === 'superadmin' || role === 'organizer') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/member';
      }
    } catch {
      window.location.href = '/member';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await redirectByRole(result.user.uid, result.user.email!);
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'Aucun compte trouvé.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-email': 'Email invalide.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
      };
      setError(msg[err.code] || `Erreur: ${err.code}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      await redirectByRole(result.user.uid, result.user.email!);
    } catch (err: any) {
      setError(`Erreur Google: ${err.code}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>

        <div style={{ marginBottom: '2rem' }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: '1.4rem', color: '#6B2D4E' }}>TARSYN</p>
          <p style={{ margin: 0, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em' }}>YOUR COMMUNITY</p>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.25rem' }}>Sign In</h1>
        <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>Access your TARSYN account</p>

        {error && (
          <div style={{ background: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>Email</label>
            <input
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #E0D0C0', borderRadius: '10px', fontSize: '0.95rem', background: '#FAF0E6', color: '#333', outline: 'none', boxSizing: 'border-box' }}
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', border: '1.5px solid #E0D0C0', borderRadius: '10px', fontSize: '0.95rem', background: '#FAF0E6', color: '#333', outline: 'none', boxSizing: 'border-box' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '1.1rem', padding: 0 }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.85rem', background: '#6B2D4E', color: '#FAF0E6', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '1rem' }}
          >
            {loading ? 'Connexion...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '1rem 0', color: '#aaa', fontSize: '0.85rem' }}>or</div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{ width: '100%', padding: '0.85rem', background: '#FAF0E6', color: '#333', border: '2px solid #E0D0C0', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
        >
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#888' }}>
          Pas encore de compte ?{' '}
          <a href="/register" style={{ color: '#6B2D4E', fontWeight: 700, textDecoration: 'none' }}>
            Créer un compte
          </a>
        </div>
      </div>
    </div>
  );
}