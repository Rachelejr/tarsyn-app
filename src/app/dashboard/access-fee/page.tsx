'use client';
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';
import { authHeaders } from '@/lib/authFetch';

const C = { bordeaux: '#6B2D4E', creme: '#FBEEDD', dore: '#E9C77B', text: '#4A1F38', muted: '#8A7B6C' };

export default function AccessFeePage() {
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [formReady, setFormReady] = useState(false);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const paymentElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUid(u.uid); setEmail(u.email || ''); }
    });
    return () => unsub();
  }, []);

  const handleStart = async () => {
    setError('');
    setStarting(true);
    try {
      const res = await fetch('/api/create-access-fee-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' , ...(await authHeaders('admin')) },
        body: JSON.stringify({ role: 'organizer', uid, email }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError(data.error || 'Could not start payment. Please try again.');
      }
    } catch (e) {
      setError('Could not start payment. Please try again.');
    }
    setStarting(false);
  };

  // Mounts the embedded Stripe Payment Element once we have a clientSecret -
  // the whole payment stays on this page, no redirect to Stripe. The
  // container div is always in the DOM (see JSX below) so the ref is
  // guaranteed to be attached before this effect runs, and we wait for
  // Stripe's own "ready" event before letting the user submit - clicking
  // Pay while the card fields are still loading is what was causing the
  // "no mounted Payment Element" error.
  useEffect(() => {
    if (!clientSecret || !paymentElementRef.current) return;
    let cancelled = false;
    setFormReady(false);
    (async () => {
      try {
        const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
        console.log('[Stripe pubkey active]', pk.slice(0, 20));
        if (!pk) {
          if (!cancelled) setError('The payment form could not load (missing payment configuration). Please contact support - error code: PK_MISSING.');
          return;
        }
        const stripe = await loadStripe(pk);
        if (cancelled) return;
        if (!stripe) {
          setError('The payment form could not load (invalid payment configuration). Please contact support - error code: PK_INVALID.');
          return;
        }
        if (!paymentElementRef.current) return;
        const elements = stripe.elements({ clientSecret });
        const paymentElement = elements.create('payment');
        paymentElement.on('ready', () => { if (!cancelled) setFormReady(true); });
        paymentElement.on('loaderror', (event: any) => { if (!cancelled) setError((event?.error?.message || 'The payment form failed to load.') + ' Please contact support - error code: LOAD_ERROR.'); });
        paymentElement.mount(paymentElementRef.current);
        stripeRef.current = stripe;
        elementsRef.current = elements;
      } catch (e: any) {
        if (!cancelled) setError('The payment form failed to load: ' + (e?.message || 'unknown error') + '. Please refresh and try again.');
      }
    })();
    return () => { cancelled = true; };
  }, [clientSecret]);

  const handleConfirm = async () => {
    if (!stripeRef.current || !elementsRef.current || !formReady) return;
    setConfirming(true);
    setError('');
    try {
      const { error: confirmError } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (confirmError) {
        setError(confirmError.message || 'Payment failed. Please check your card details and try again.');
        setConfirming(false);
        return;
      }
      setSuccess(true);
      // Poll briefly for the webhook to mark this account as paid, then do
      // a clean reload straight into the real dashboard.
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts += 1;
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists() && (snap.data() as any).orgAccessFeePaid) {
            clearInterval(interval);
            window.location.href = '/dashboard';
          }
        } catch (e) { /* ignore, will retry */ }
        if (attempts >= 8) clearInterval(interval);
      }, 1500);
    } catch (e: any) {
      setError(e?.message || 'Payment failed. Please try again.');
      setConfirming(false);
    }
  };

  const step = success ? 3 : clientSecret ? 2 : 1;
  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 860px) { .af-grid { grid-template-columns: 1fr !important; } }
        .af-card { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 18px; box-shadow: 0 2px 14px rgba(107,45,78,0.06); }
        .af-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .af-btn:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
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
          <div style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
            <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Activate Your Account</h1>
            <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>One more step before you can manage your groups.</p>
          </div>
          <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
        </div>

        <div style={{ maxWidth: 980, margin: '0 auto', padding: '20px 24px' }}>
          <div className="af-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

            <div className="af-card" style={{ padding: '16px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12, paddingBottom: 9, borderBottom: '1px solid #F3E6D8' }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: 'linear-gradient(135deg,#E9C77B,#C9974D)', boxShadow: '0 4px 10px rgba(74,31,56,0.18)' }}>{'\u{1F512}'}</span>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#4A1F38' }}>Secure Payment</h2>
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {['Start', 'Card details', 'Activated'].map((label, i) => {
                  const n = i + 1;
                  const done = step > n;
                  const active = step === n;
                  return (
                    <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: done ? '#EFF9F0' : active ? '#FBEEDD' : '#FBF6EF', border: '1px solid ' + (done ? '#BEE3C1' : active ? '#F0DCA8' : '#F0E4D6') }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: done ? '#2E7D32' : active ? C.bordeaux : '#E5D9C8', color: '#fff' }}>{done ? '\u2713' : n}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: done ? '#2E7D32' : active ? C.text : C.muted }}>{label}</span>
                    </div>
                  );
                })}
              </div>

              <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.6, margin: '0 0 14px' }}>
                UNIMUNITY charges a one-time <strong style={{ color: C.text }}>$24.99</strong> lifetime access fee for new organizer accounts. This is separate from your subscription plan and is charged only once, ever.
              </p>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 14 }}>
                  {error}
                </div>
              )}
              {success ? (
                <div style={{ background: '#EFF9F0', border: '1px solid #BEE3C1', borderRadius: 10, padding: 14, color: '#1E7A34', fontSize: 13.5, fontWeight: 700, textAlign: 'center' }}>
                  Payment received! Activating your account...
                </div>
              ) : (
                <div>
                  {!clientSecret && (
                    <button onClick={handleStart} disabled={starting || !uid} className="af-btn"
                      style={{ width: '100%', padding: 11, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14.5, fontWeight: 800, cursor: starting ? 'not-allowed' : 'pointer', opacity: starting ? 0.7 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
                      {starting ? 'Loading secure payment form...' : 'Continue to payment'}
                    </button>
                  )}
                  <div ref={paymentElementRef} style={{ marginBottom: clientSecret ? 16 : 0 }} />
                  {clientSecret && !formReady && (
                    <p style={{ color: C.muted, fontSize: 12.5, textAlign: 'center', margin: '0 0 16px' }}>Loading secure payment form...</p>
                  )}
                  {clientSecret && (
                    <button onClick={handleConfirm} disabled={confirming || !formReady} className="af-btn"
                      style={{ width: '100%', padding: 11, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14.5, fontWeight: 800, cursor: (confirming || !formReady) ? 'not-allowed' : 'pointer', opacity: (confirming || !formReady) ? 0.7 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
                      {confirming ? 'Processing...' : 'Pay $24.99 and activate my account'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="af-card" style={{ padding: 22 }}>
              <div style={{ textAlign: 'center', margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '18px 18px 0 0', borderBottom: '1px solid #F0E4D6' }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>Lifetime Access</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: 1.2 }}>Order Summary</p>
              </div>
              {[
                { label: 'Account', value: email || '-' },
                { label: 'Type', value: 'Organizer' },
                { label: 'Billing', value: 'One time' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                  <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{item.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'linear-gradient(135deg,#FBEEDD,#F6E3C4)', borderRadius: 12, border: '1px solid #F0DCA8', textAlign: 'center' }}>
                <p style={{ fontSize: 10.5, color: '#A08B7D', margin: 0, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Total</p>
                <p style={{ fontSize: 22, color: '#4A1F38', margin: '2px 0 0', fontWeight: 800 }}>$24.99</p>
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
