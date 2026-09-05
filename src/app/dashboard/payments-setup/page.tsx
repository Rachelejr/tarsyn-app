'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';

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
  success: '#3F7D5C',
  successBg: '#E4F0E9',
  warning: '#9C7A2E',
  warningBg: '#FBF0D9',
};

type Status = {
  connected: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

function PaymentsSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cameFromStripe = searchParams.get('return') === 'true' || searchParams.get('refresh') === 'true';

  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadStatus = async (currentUid: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe-connect/status?uid=' + encodeURIComponent(currentUid));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load status');
      setStatus(data);
    } catch (e: any) {
      setError(e?.message || 'Could not check your payment setup status.');
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      setEmail(u.email || '');
      await loadStatus(u.uid);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleConnect = async () => {
    if (!uid) return;
    setStarting(true);
    setError('');
    try {
      const res = await fetch('/api/stripe-connect/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start onboarding');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || 'Could not start the connection process.');
      setStarting(false);
    }
  };

  if (!mounted) return null;

  const fullyConnected = !!status?.connected && !!status?.chargesEnabled && !!status?.payoutsEnabled;
  const partiallyConnected = !!status?.connected && !fullyConnected;

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' , display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
      <div style={{
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        rowGap: '10px',
      }}>
        <div>
          <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block' }} />
          <div style={{ color: '#C4748E', fontSize: '9px', letterSpacing: '2px', fontStyle: 'italic', marginTop: '2px' }}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <DateTimeWeather textColor="rgba(251,238,221,0.85)" />
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>

        <div style={{ marginBottom: 20 }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: 0 }}>
            Back to Dashboard
          </button>
        </div>

        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Payments Setup</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>Connect your bank account so members can pay you directly through UNIMUNITY.</p>
        </div>

        {cameFromStripe && loading && (
          <div style={{ background: C.warningBg, color: C.warning, borderRadius: 12, padding: '14px 18px', fontSize: 13, marginBottom: 18 }}>
            Checking your latest status with Stripe...
          </div>
        )}

        {error && (
          <div style={{ background: '#FFEBEE', color: '#C62828', borderRadius: 12, padding: '14px 18px', fontSize: 13, marginBottom: 18 }}>{error}</div>
        )}

        <div style={{ background: C.blanc, borderRadius: 16, padding: '28px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {loading ? (
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Checking your payment setup...</p>
          ) : fullyConnected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ background: C.successBg, color: C.success, padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700 }}>Connected</span>
              </div>
              <p style={{ fontSize: 14, color: C.text, margin: '0 0 6px', lineHeight: 1.6 }}>
                Your bank account is connected. Members will be able to pay their contributions directly, and funds go straight to your bank account through Stripe.
              </p>
              <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>
                Payouts and card payments are both enabled on your account.
              </p>
            </div>
          ) : partiallyConnected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ background: C.warningBg, color: C.warning, padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700 }}>Setup incomplete</span>
              </div>
              <p style={{ fontSize: 14, color: C.text, margin: '0 0 18px', lineHeight: 1.6 }}>
                You started connecting your bank account, but Stripe still needs a bit more information before payments can be enabled (usually identity verification or bank details).
              </p>
              <button onClick={handleConnect} disabled={starting}
                style={{ background: C.bordeaux, color: C.blanc, border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: starting ? 'not-allowed' : 'pointer', opacity: starting ? 0.7 : 1 }}>
                {starting ? 'Loading...' : 'Complete Setup'}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 14, color: C.text, margin: '0 0 18px', lineHeight: 1.6 }}>
                You have not connected a bank account yet. Once connected, members will be able to pay their contributions by card directly through UNIMUNITY, and the money goes straight to your own bank account - UNIMUNITY never holds your funds.
              </p>
              <button onClick={handleConnect} disabled={starting}
                style={{ background: C.bordeaux, color: C.blanc, border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: starting ? 'not-allowed' : 'pointer', opacity: starting ? 0.7 : 1 }}>
                {starting ? 'Loading...' : 'Connect Your Bank Account'}
              </button>
            </div>
          )}
        </div>

      </div>

      </div>
      <Footer />
    </div>
  );
}

export default function PaymentsSetupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
      <PaymentsSetupContent />
    </Suspense>
  );
}
