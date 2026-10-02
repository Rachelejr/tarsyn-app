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
  text: '#3A2F1F',
  muted: '#8A7B6C',
  border: '#F0E4D6',
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
  const [resetNotice, setResetNotice] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // The Stripe routes identify the organizer from this token, never from a uid in the URL.
  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  };

  const loadStatus = async (_currentUid: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe-connect/status', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load status');
      setStatus(data);
      if (data.reset) setResetNotice(true);
    } catch (e: any) {
      setError(String(e?.message || '') || 'Could not check your payment setup status.');
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
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({}),
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

  const cardStyle = { background: C.blanc, borderRadius: 16, border: '1px solid #F0E4D6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
  const smallLabel = { fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase' as const, letterSpacing: 0.8 };
  const statusLabel = loading ? 'Checking...' : fullyConnected ? 'Connected' : partiallyConnected ? 'Setup incomplete' : 'Not connected';
  const statusColor = loading ? C.muted : fullyConnected ? C.success : partiallyConnected ? C.warning : '#C62828';
  const statusBg = loading ? '#F3EEE7' : fullyConnected ? C.successBg : partiallyConnected ? C.warningBg : '#FFEBEE';
  const steps = [
    { label: 'Stripe account created', done: !!status?.connected },
    { label: 'Business & identity details submitted', done: !!status?.detailsSubmitted },
    { label: 'Card payments enabled', done: !!status?.chargesEnabled },
    { label: 'Payouts to your bank enabled', done: !!status?.payoutsEnabled },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const yesNo = (v?: boolean) => loading ? '-' : v ? 'Yes' : 'No';

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 900px) { .ps-grid { grid-template-columns: 1fr !important; } .ps-how { grid-template-columns: 1fr !important; } }
        .ps-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .ps-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .ps-head { display: flex; align-items: center; gap: 11px; }
        .ps-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .ps-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .ps-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .ps-back:hover { background: #FBEEDD; }
        .ps-submit { transition: transform 0.15s ease, filter 0.15s ease; }
        .ps-submit:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer { 0% { background-position: 0% center; } 100% { background-position: -200% center; } }
      `}</style>
      <div style={{ flex: 1 }}>

      <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start' }} />
        <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Connect Payments</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Let members pay you directly through UNIMUNITY.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="ps-back">Back to Dashboard</button>
        </div>

        {cameFromStripe && loading && (
          <div style={{ background: C.warningBg, color: C.warning, borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 600, marginBottom: 12, border: '1px solid #EBD9A8' }}>
            Checking your latest status with Stripe...
          </div>
        )}
        {resetNotice && (
          <div style={{ background: C.warningBg, color: C.warning, borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 600, marginBottom: 12, border: '1px solid #EBD9A8' }}>
            Your previous Stripe connection could no longer be reached, so it was reset. Click "Connect Your Bank Account" to set it up again.
          </div>
        )}
        {error && (
          <div style={{ background: '#FFEBEE', color: '#C62828', borderRadius: 14, padding: '12px 18px', fontSize: 13, fontWeight: 600, marginBottom: 12, border: '1px solid #F5C6CB' }}>{error}</div>
        )}

        <div className="ps-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>

            {/* Status + checklist */}
            <div className="ps-card" style={{ ...cardStyle, padding: '16px 20px' }}>
              <div className="ps-head" style={{ marginBottom: 12, paddingBottom: 9, borderBottom: '1px solid #F3E6D8' }}>
                <span className="ps-ico" style={{ background: 'linear-gradient(135deg,#66BB6A,#2E7D32)' }}>{'\u{1F3E6}'}</span>
                <h2 className="ps-title">Bank Account Connection</h2>
                <span style={{ marginLeft: 'auto', background: statusBg, color: statusColor, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>{statusLabel}</span>
              </div>

              {loading ? (
                <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>Checking your payment setup...</p>
              ) : (
                <>
                  <p style={{ fontSize: 13.5, color: C.text, margin: '0 0 14px', lineHeight: 1.6 }}>
                    {fullyConnected
                      ? 'Your bank account is connected. Members can pay their contributions directly, and funds go straight to your bank account through Stripe.'
                      : partiallyConnected
                        ? 'You started connecting your bank account, but Stripe still needs a bit more information before payments can be enabled (usually identity verification or bank details).'
                        : 'You have not connected a bank account yet. Once connected, members can pay their contributions by card directly through UNIMUNITY, and the money goes straight to your own bank account. UNIMUNITY never holds your funds.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 14 }}>
                    {steps.map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: s.done ? C.successBg : '#FBF6EF', border: '1px solid ' + (s.done ? '#C8E6C8' : '#F0E4D6') }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: s.done ? C.success : '#E5D9C8', color: C.blanc, flexShrink: 0 }}>{s.done ? '\u2713' : ''}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: s.done ? C.success : C.muted }}>{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {!fullyConnected && (
                    <button onClick={handleConnect} disabled={starting} className="ps-submit"
                      style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: C.blanc, border: 'none', borderRadius: 12, padding: '11px 24px', fontSize: 14, fontWeight: 800, cursor: starting ? 'not-allowed' : 'pointer', opacity: starting ? 0.7 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
                      {starting ? 'Loading...' : partiallyConnected ? 'Complete Setup' : 'Connect Your Bank Account'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* How it works */}
            <div className="ps-card" style={{ ...cardStyle, padding: '16px 20px' }}>
              <div className="ps-head" style={{ marginBottom: 12, paddingBottom: 9, borderBottom: '1px solid #F3E6D8' }}>
                <span className="ps-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F4A1}'}</span>
                <h2 className="ps-title">How it works</h2>
              </div>
              <div className="ps-how" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { n: '1', t: 'Connect', d: 'Create your Stripe account and link your bank in a few minutes.' },
                  { n: '2', t: 'Members pay', d: 'Members pay their contribution by card from their UNIMUNITY account.' },
                  { n: '3', t: 'You receive', d: 'Stripe sends the money directly to your bank. UNIMUNITY never holds it.' },
                ].map(s => (
                  <div key={s.n} style={{ background: C.creme, borderRadius: 12, padding: '12px 14px', border: '1px solid ' + C.orLight }}>
                    <span style={{ display: 'inline-flex', width: 24, height: 24, borderRadius: '50%', background: C.bordeaux, color: C.blanc, fontSize: 12, fontWeight: 800, alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                    <p style={{ fontSize: 13.5, fontWeight: 800, color: C.bordeauxDark, margin: '8px 0 3px' }}>{s.t}</p>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.5 }}>{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="ps-card" style={{ ...cardStyle, padding: '22px', position: 'sticky' as const, top: 24 }}>
            <div style={{ textAlign: 'center' as const, margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '16px 16px 0 0', borderBottom: '1px solid #F0E4D6' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>Stripe Connect</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase' as const, letterSpacing: 1.2 }}>Payment Summary</p>
            </div>
            {[
              { label: 'Status', value: statusLabel, color: statusColor },
              { label: 'Account email', value: email || '-' },
              { label: 'Details submitted', value: yesNo(status?.detailsSubmitted) },
              { label: 'Card payments', value: yesNo(status?.chargesEnabled) },
              { label: 'Payouts', value: yesNo(status?.payoutsEnabled) },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{item.label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: item.color || C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'linear-gradient(135deg,#FBEEDD,#F6E3C4)', borderRadius: 12, border: '1px solid ' + C.orLight, textAlign: 'center' as const }}>
              <p style={{ ...smallLabel, fontSize: 10.5, margin: 0 }}>Setup Progress</p>
              <p style={{ fontSize: 18, color: C.bordeauxDark, margin: '2px 0 6px', fontWeight: 800 }}>{loading ? '-' : doneCount + ' / ' + steps.length}</p>
              <div style={{ height: 6, background: '#EFE2CC', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: (loading ? 0 : (doneCount / steps.length) * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#E9C77B,#3F7D5C)', transition: 'width .4s' }} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: '12px 0 0', lineHeight: 1.5 }}>{'\u{1F512}'} Payments are processed securely by Stripe. UNIMUNITY never sees or stores card numbers.</p>
          </div>
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
