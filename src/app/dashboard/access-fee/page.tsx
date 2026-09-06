'use client';
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';

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
        headers: { 'Content-Type': 'application/json' },
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
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
      if (!stripe || cancelled || !paymentElementRef.current) return;
      const elements = stripe.elements({ clientSecret });
      const paymentElement = elements.create('payment');
      paymentElement.on('ready', () => { if (!cancelled) setFormReady(true); });
      paymentElement.mount(paymentElementRef.current);
      stripeRef.current = stripe;
      elementsRef.current = elements;
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
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
            {error}
          </div>
        )}
        {success ? (
          <div style={{ background: '#EFF9F0', border: '1px solid #BEE3C1', borderRadius: '10px', padding: '14px', color: '#1E7A34', fontSize: '13.5px', fontWeight: 700 }}>
            Payment received! Activating your account...
          </div>
        ) : (
          <div style={{ textAlign: 'left' }}>
            {!clientSecret && (
              <button onClick={handleStart} disabled={starting || !uid}
                style={{ width: '100%', padding: '14px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: starting ? 'not-allowed' : 'pointer', opacity: starting ? 0.7 : 1 }}>
                {starting ? 'Loading secure payment form...' : 'Continue to payment'}
              </button>
            )}
            <div ref={paymentElementRef} style={{ marginBottom: clientSecret ? 18 : 0 }} />
            {clientSecret && !formReady && (
              <p style={{ color: C.muted, fontSize: '12.5px', textAlign: 'center', margin: '0 0 18px' }}>Loading secure payment form...</p>
            )}
            {clientSecret && (
              <button onClick={handleConfirm} disabled={confirming || !formReady}
                style={{ width: '100%', padding: '14px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: (confirming || !formReady) ? 'not-allowed' : 'pointer', opacity: (confirming || !formReady) ? 0.7 : 1 }}>
                {confirming ? 'Processing...' : 'Pay $25 and activate my account'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
