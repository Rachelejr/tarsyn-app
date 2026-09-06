'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const C = { bordeaux: '#6B2D4E', creme: '#FBEEDD', dore: '#E9C77B', text: '#4A1F38', muted: '#8A7B6C' };

export default function AccessFeePage() {
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUid(u.uid); setEmail(u.email || ''); }
    });
    return () => unsub();
  }, []);

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/create-access-fee-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'organizer', uid, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Could not start checkout. Please try again.');
        setLoading(false);
      }
    } catch (e) {
      setError('Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '44px 40px', maxWidth: '440px', width: '100%', boxShadow: '0 8px 40px rgba(107,45,78,0.12)', textAlign: 'center' }}>
        <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', marginBottom: '20px' }} />
        <h1 style={{ color: C.bordeaux, fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>One more step to activate your account</h1>
        <p style={{ color: C.muted, fontSize: '14px', lineHeight: 1.6, margin: '0 0 8px' }}>
          UNIMUNITY charges a one-time <strong style={{ color: C.text }}>$25</strong> lifetime access fee for new organizer accounts.
        </p>
        <p style={{ color: C.muted, fontSize: '12.5px', lineHeight: 1.6, margin: '0 0 26px' }}>
          This is separate from your subscription plan and is charged only once, ever.
        </p>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        <button onClick={handlePay} disabled={loading || !uid}
          style={{ width: '100%', padding: '14px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Redirecting to secure payment...' : 'Pay $25 and activate my account'}
        </button>
      </div>
    </div>
  );
}
