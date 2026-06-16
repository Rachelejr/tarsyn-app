'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    members: '10 members',
    groups: '1 group',
    features: ['Basic dashboard', 'Member management', 'Invite members'],
    color: '#7A5068',
    priceId: null,
    popular: false,
  },
  {
    name: 'Starter',
    price: '$9.99',
    period: '/month',
    members: '20 members',
    groups: '1 group',
    features: ['Everything in Free', 'Reminders', 'Document Center', 'Email support'],
    color: '#6B2D4E',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
    popular: false,
  },
  {
    name: 'Growth',
    price: '$19.99',
    period: '/month',
    members: '50 members',
    groups: '3 groups',
    features: ['Everything in Starter', 'Multiple groups', 'Advanced reports', 'Priority support'],
    color: '#4A2D5E',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH,
    popular: true,
  },
  {
    name: 'Pro',
    price: '$39.99',
    period: '/month',
    members: 'Unlimited members',
    groups: 'Unlimited groups',
    features: ['Everything in Growth', 'Unlimited groups', 'API access', 'Dedicated support'],
    color: '#2C1A3E',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    popular: false,
  },
];

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF0E6' }}>
    <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading...</p>
  </div>
);

function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      const userDoc = await getDoc(doc(db, 'users', u.uid));
      if (userDoc.exists()) {
        setSubscription(userDoc.data()?.subscription);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSubscribe = async (priceId: string, planName: string) => {
    if (!priceId || !user) return;
    setCheckoutLoading(planName);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          email: user.email,
        }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      console.error(e);
    }
    setCheckoutLoading(null);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#6B2D4E', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/')} style={{ color: '#D4AF7A', fontWeight: 800, fontSize: '18px', cursor: 'pointer' }}>
          TARSYN
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(212,175,122,0.5)', color: '#D4AF7A', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        {success && (
          <div style={{ background: '#E8F5E9', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', color: '#2E7D32', fontWeight: 600 }}>
            🎉 Subscription activated! Welcome to TARSYN Pro.
          </div>
        )}
        {canceled && (
          <div style={{ background: '#FFF3E0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', color: '#E65100', fontWeight: 600 }}>
            ❌ Checkout canceled. You can try again anytime.
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ color: '#6B2D4E', fontSize: '32px', fontWeight: 800, margin: '0 0 8px' }}>Choose your plan</h1>
          <p style={{ color: '#7A5068', fontSize: '16px', margin: 0 }}>First month free on all paid plans 🎁</p>
        </div>

        {(subscription?.status === 'active' || subscription?.status === 'trialing') && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#2E7D32', fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>
              ✅ {subscription.status === 'trialing' ? '🎁 Free Trial Active' : 'Subscription Active'}
            </p>
            <p style={{ color: '#7A5068', fontSize: '14px', margin: 0 }}>
              {subscription.status === 'trialing'
                ? `Trial ends: ${new Date(subscription.trialEnd).toLocaleDateString()}`
                : `Renews: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '20px' }}>
          {PLANS.map((plan) => (
            <div key={plan.name} style={{
              background: 'white', borderRadius: '20px', padding: '28px',
              boxShadow: plan.popular ? '0 8px 32px rgba(107,45,78,0.2)' : '0 2px 12px rgba(0,0,0,0.06)',
              border: plan.popular ? '2px solid #6B2D4E' : '2px solid transparent',
              position: 'relative',
            }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6B2D4E', color: '#D4AF7A', padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                  MOST POPULAR
                </div>
              )}
              <h3 style={{ color: plan.color, fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>{plan.name}</h3>
              <div style={{ margin: '0 0 4px' }}>
                <span style={{ color: '#2C1A3E', fontSize: '32px', fontWeight: 800 }}>{plan.price}</span>
                <span style={{ color: '#7A5068', fontSize: '14px' }}>{plan.period}</span>
              </div>
              {plan.priceId && (
                <p style={{ color: '#2E7D32', fontSize: '12px', fontWeight: 600, margin: '0 0 16px' }}>🎁 First month FREE</p>
              )}
              <div style={{ margin: '0 0 16px' }}>
                <p style={{ color: '#6B2D4E', fontSize: '13px', fontWeight: 700, margin: '0 0 4px' }}>👥 {plan.members}</p>
                <p style={{ color: '#6B2D4E', fontSize: '13px', fontWeight: 700, margin: 0 }}>🏘️ {plan.groups}</p>
              </div>
              <ul style={{ padding: '0 0 0 16px', margin: '0 0 20px', color: '#7A5068', fontSize: '13px' }}>
                {plan.features.map(f => <li key={f} style={{ marginBottom: '6px' }}>{f}</li>)}
              </ul>
              {plan.priceId ? (
                <button
                  onClick={() => handleSubscribe(plan.priceId!, plan.name)}
                  disabled={checkoutLoading === plan.name}
                  style={{
                    width: '100%', background: plan.color, color: '#FAF0E6',
                    padding: '12px', borderRadius: '12px', border: 'none',
                    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                    opacity: checkoutLoading === plan.name ? 0.6 : 1,
                  }}>
                  {checkoutLoading === plan.name ? 'Loading...' : `Get ${plan.name} →`}
                </button>
              ) : (
                <button
                  onClick={() => router.push('/dashboard')}
                  style={{ width: '100%', background: '#FAF0E6', color: '#6B2D4E', padding: '12px', borderRadius: '12px', border: '1px solid #6B2D4E', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  Current Plan ✓
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SubscriptionContent />
    </Suspense>
  );
}