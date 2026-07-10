'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

type BillingPeriod = 'monthly' | 'annual';

interface PlanDef {
  id: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise';
  name: string;
  color: string;
  badge?: string;
  description: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  priceIdMonthly: string | null;
  priceIdAnnual: string | null;
  members: string;
  groups: string;
  reports: string;
  support: string;
  additional: string[];
  ctaAction: 'checkout' | 'current' | 'contact';
  ctaLabel: string;
  scaling?: { membersIncrement: number; priceIncrement: number };
}

const SALES_EMAIL = 'sales@tarsyn-app.com';

const PRICE_ID_TO_PLAN: Record<string, PlanDef['id']> = {
  'price_1TipthJk3DYYTrgp7LEDrLgE': 'starter',
  'price_1Tiq1IJk3DYYTrgp2VmhXb6J': 'growth',
  'price_1Tiq3AJk3DYYTrgpuElHGRxd': 'pro',
  'price_1TjVjQJk3DYYTrgpEDu8Ofyl': 'starter',
  'price_1TjVjQJk3DYYTrgpEDu8OfyI': 'starter',
  'price_1TjVjQJk3DYYTrgpOaG0DWjU': 'starter',
  'price_1TjX5gJk3DYYTrgpw5ngPx4P': 'growth',
  'price_1TjX5gJk3DYYTrgp6xy976sv': 'growth',
  'price_1TjXA0Jk3DYYTrgpL0cf12Mw': 'pro',
  'price_1TjXA0Jk3DYYTrgp6shxK6SC': 'pro',
  'price_1TkzC7JBtj4UALaPm0ZOEB1T': 'starter',
  'price_1TkzC7JBtj4UALaPhySF1Nb1': 'starter',
  'price_1TkzC9JBtj4UALaPZZIBDCV3': 'growth',
  'price_1TkzC8JBtj4UALaPtELbrfO9': 'growth',
  'price_1TkzC3JBtj4UALaPFseCERie': 'pro',
  'price_1TkzC2JBtj4UALaPBvORrRyy': 'pro',
};

const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'Free',
    color: '#6B2D4E',
    description: 'Trial and onboarding',
    priceMonthly: 0,
    priceAnnual: 0,
    priceIdMonthly: null,
    priceIdAnnual: null,
    members: 'Up to 15 Members',
    groups: '1 group',
    reports: 'Basic dashboard',
    support: 'Limited notifications',
    additional: ['Member invitations'],
    ctaAction: 'current',
    ctaLabel: 'Current Plan',
  },
  {
    id: 'starter',
    name: 'Starter',
    color: '#6B2D4E',
    badge: 'MOST CHOSEN',
    description: 'Families, small tontines, churches',
    priceMonthly: 14.99,
    priceAnnual: 149,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || 'price_STARTER_MONTHLY_REPLACE_ME',
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || 'price_STARTER_ANNUAL_REPLACE_ME',
    members: 'Up to 100 Members',
    groups: '2 groups',
    reports: 'Basic reports',
    support: 'Email support',
    additional: ['Everything in Free', 'Reminders', 'Document Center'],
    ctaAction: 'checkout',
    ctaLabel: 'Get Starter',
    scaling: { membersIncrement: 100, priceIncrement: 5 },
  },
  {
    id: 'growth',
    name: 'Growth',
    color: '#4A1F38',
    badge: 'MOST POPULAR - SAVE UP TO 17%',
    description: 'Growing organizations',
    priceMonthly: 29.99,
    priceAnnual: 299,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY || 'price_GROWTH_MONTHLY_REPLACE_ME',
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL || 'price_GROWTH_ANNUAL_REPLACE_ME',
    members: 'Up to 300 Members',
    groups: '10 groups',
    reports: 'Advanced reports',
    support: 'Priority support',
    additional: ['Everything in Starter', 'Export tools'],
    ctaAction: 'checkout',
    ctaLabel: 'Get Growth',
    scaling: { membersIncrement: 100, priceIncrement: 4 },
  },
  {
    id: 'pro',
    name: 'Pro',
    color: '#4A1F38',
    badge: 'BEST VALUE',
    description: 'Professional organizations',
    priceMonthly: 59.99,
    priceAnnual: 599,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_PRO_MONTHLY_REPLACE_ME',
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || 'price_PRO_ANNUAL_REPLACE_ME',
    members: 'Up to 1500 Members',
    groups: '50 groups',
    reports: 'Advanced administration',
    support: 'Dedicated support',
    additional: ['Everything in Growth', 'API access'],
    ctaAction: 'checkout',
    ctaLabel: 'Get Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    color: '#1A0F26',
    description: 'Large institutions',
    priceMonthly: null,
    priceAnnual: null,
    priceIdMonthly: null,
    priceIdAnnual: null,
    members: 'Unlimited Members',
    groups: 'Unlimited groups',
    reports: 'Advanced administration',
    support: 'SLA support',
    additional: ['White label', 'Dedicated onboarding'],
    ctaAction: 'contact',
    ctaLabel: 'Contact Sales',
  },
];

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD' }}>
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

  const rawPlan: string = subscription?.plan || '';
  const activePlanId: string = PRICE_ID_TO_PLAN[rawPlan] || 'free';

  const handleSubscribe = async (priceId: string | null, planName: string) => {
    if (!priceId || !user) return;
    if (priceId.includes('REPLACE_ME')) {
      setCheckoutError(`This plan (${planName}) is not fully configured yet. Please contact support.`);
      console.error('Blocked checkout: placeholder priceId not replaced by env var for', planName, priceId);
      return;
    }
    setCheckoutError(null);
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
      const data = await res.json();
      if (!res.ok || !data.url) {
        console.error('Checkout failed:', data);
        setCheckoutError(data.error || 'Could not start checkout. Please try again or contact support.');
        setCheckoutLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setCheckoutError('Could not start checkout. Please check your connection and try again.');
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your current billing period.')) return;
    setActionLoading('cancel');
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Your subscription has been canceled and will end at the end of the current billing period.');
        window.location.reload();
      } else {
        alert('Failed to cancel subscription. Please try again or contact support.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to cancel subscription. Please try again or contact support.');
    }
    setActionLoading(null);
  };

  const handleUpdateSubscription = async (newPriceId: string | null, planName: string) => {
    if (!newPriceId || !user) return;
    if (newPriceId.includes('REPLACE_ME')) {
      setCheckoutError(`This plan (${planName}) is not fully configured yet. Please contact support.`);
      return;
    }
    setCheckoutError(null);
    setActionLoading(planName);
    try {
      const res = await fetch('/api/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, newPriceId }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        console.error('Update subscription failed:', data);
        setCheckoutError(data.error || 'Failed to update subscription. Please try again or contact support.');
      }
    } catch (e) {
      console.error(e);
      setCheckoutError('Failed to update subscription. Please try again or contact support.');
    }
    setActionLoading(null);
  };

  const handleContactSales = () => {
    window.location.href = `mailto:${SALES_EMAIL}?subject=Enterprise%20plan%20inquiry%20-%20TARSYN`;
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @media (max-width: 860px) {
          .tarsyn-plans-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }
          .tarsyn-page-container {
            padding: 24px 16px !important;
          }
        }
        .tarsyn-cta-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .tarsyn-cta-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .tarsyn-cta-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <nav style={{ background: '#6B2D4E', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/')} style={{ color: '#E9C77B', fontWeight: 800, fontSize: '18px', cursor: 'pointer' }}>
          TARSYN
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: '#E9C77B', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </nav>

      <div className="tarsyn-page-container" style={{ maxWidth: '1300px', width: '92%', margin: '0 auto', padding: '40px 24px' }}>
        {success && (
          <div style={{ background: '#E8F5E9', borderRadius: '16px', padding: '20px 24px', marginBottom: '28px', color: '#2E7D32', fontWeight: 600, fontSize: '15px' }}>
            Subscription activated successfully. Welcome to TARSYN.
          </div>
        )}
        {canceled && (
          <div style={{ background: '#FFF3E0', borderRadius: '16px', padding: '20px 24px', marginBottom: '28px', color: '#E65100', fontWeight: 600, fontSize: '15px' }}>
            Checkout canceled. You can try again anytime.
          </div>
        )}
        {checkoutError && (
          <div style={{ background: '#FDECEA', borderRadius: '16px', padding: '20px 24px', marginBottom: '28px', color: '#C62828', fontWeight: 600, fontSize: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span>{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} style={{ background: 'transparent', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>Close</button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#6B2D4E', fontSize: '32px', fontWeight: 800, margin: '0 0 8px' }}>Choose your plan</h1>
          <p style={{ color: '#6B2D4E', fontSize: '16px', margin: 0 }}>30-day free trial on all paid plans</p>
        </div>

        {(subscription?.status === 'active' || subscription?.status === 'trialing') && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#2E7D32', fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>
              {subscription.status === 'trialing' ? 'Free Trial Active' : 'Subscription Active'}
            </p>
            <p style={{ color: '#6B2D4E', fontSize: '14px', margin: 0 }}>
              {subscription.status === 'trialing'
                ? `Trial ends: ${new Date(subscription.trialEnd).toLocaleDateString()}`
                : `Renews: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', background: 'white', borderRadius: '14px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{
                padding: '10px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: 700,
                background: billingPeriod === 'monthly' ? '#6B2D4E' : 'transparent',
                color: billingPeriod === 'monthly' ? '#FBEEDD' : '#6B2D4E',
                transition: 'all 0.2s ease',
              }}>
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              style={{
                padding: '10px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: 700,
                background: billingPeriod === 'annual' ? '#6B2D4E' : 'transparent',
                color: billingPeriod === 'annual' ? '#FBEEDD' : '#6B2D4E',
                transition: 'all 0.2s ease',
              }}>
              Annual <span style={{ color: billingPeriod === 'annual' ? '#E9C77B' : '#2E7D32', fontWeight: 700 }}>save up to 17%</span>
            </button>
          </div>
        </div>

        <div className="tarsyn-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', alignItems: 'stretch' }}>
          {PLANS.map((plan) => {
            const isCurrent = activePlanId === plan.id;
            const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
            const priceId = billingPeriod === 'monthly' ? plan.priceIdMonthly : plan.priceIdAnnual;
            const periodLabel = plan.priceMonthly === null ? '' : billingPeriod === 'monthly' ? '/month' : '/year';
            const hasActiveSub = subscription?.status === 'active' || subscription?.status === 'trialing';

            return (
              <div key={plan.id} style={{
                background: 'white', borderRadius: '20px', padding: '28px',
                boxShadow: plan.badge ? '0 8px 32px rgba(107,45,78,0.18)' : '0 2px 12px rgba(0,0,0,0.06)',
                border: isCurrent ? '2px solid #2E7D32' : (plan.badge ? `2px solid ${plan.color}` : '2px solid transparent'),
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}>
                {plan.badge && !isCurrent && (
                  <div style={{
                    position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                    background: plan.color, color: '#E9C77B', padding: '5px 14px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {plan.badge}
                  </div>
                )}

                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                    background: '#2E7D32', color: 'white', padding: '5px 14px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    YOUR CURRENT PLAN
                  </div>
                )}

                <h3 style={{ color: plan.color, fontSize: '20px', fontWeight: 800, margin: '10px 0 2px' }}>{plan.name}</h3>
                <p style={{ color: '#6B2D4E', fontSize: '12px', margin: '0 0 12px' }}>{plan.description}</p>

                <div style={{ margin: '0 0 16px' }}>
                  {price === null ? (
                    <span style={{ color: '#4A1F38', fontSize: '28px', fontWeight: 800 }}>Custom</span>
                  ) : (
                    <>
                      <span style={{ color: '#4A1F38', fontSize: '32px', fontWeight: 800 }}>${price}</span>
                      <span style={{ color: '#6B2D4E', fontSize: '14px' }}>{periodLabel}</span>
                    </>
                  )}
                </div>

                <div style={{ margin: '0 0 14px' }}>
                  <p style={{ color: '#6B2D4E', fontSize: '13px', fontWeight: 700, margin: '0 0 4px' }}>{plan.members}</p>
                  <p style={{ color: '#6B2D4E', fontSize: '13px', fontWeight: 700, margin: 0 }}>{plan.groups}</p>
                </div>

                <ul style={{ padding: '0 0 0 16px', margin: '0 0 8px', color: '#6B2D4E', fontSize: '13px', flexGrow: 1 }}>
                  <li style={{ marginBottom: '6px' }}>{plan.reports}</li>
                  <li style={{ marginBottom: '6px' }}>{plan.support}</li>
                  {plan.additional.map((f) => <li key={f} style={{ marginBottom: '6px' }}>{f}</li>)}
                </ul>

                {plan.scaling && (
                  <p style={{ color: '#6B2D4E', fontSize: '11px', margin: '0 0 16px', fontStyle: 'italic' }}>
                    +{plan.scaling.membersIncrement} members = +${plan.scaling.priceIncrement}/mo
                  </p>
                )}

                {plan.ctaAction === 'checkout' && (
                  isCurrent ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                      <button
                        disabled
                        style={{
                          width: '100%', height: '56px', background: '#FBEEDD', color: '#2E7D32',
                          borderRadius: '14px', border: '1px solid #2E7D32',
                          fontSize: '14px', fontWeight: 700, cursor: 'default',
                        }}>
                        Current Plan
                      </button>
                      {!subscription?.cancelAtPeriodEnd ? (
                        <button
                          onClick={handleCancelSubscription}
                          disabled={actionLoading === 'cancel'}
                          style={{
                            width: '100%', height: '40px', background: 'transparent', color: '#C62828',
                            borderRadius: '10px', border: '1px solid #C62828',
                            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            opacity: actionLoading === 'cancel' ? 0.6 : 1,
                          }}>
                          {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel subscription'}
                        </button>
                      ) : (
                        <p style={{ fontSize: '11px', color: '#C62828', textAlign: 'center', margin: 0 }}>
                          Cancels on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'period end'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      className="tarsyn-cta-btn"
                      onClick={() => {
                        if (hasActiveSub) {
                          handleUpdateSubscription(priceId, plan.name);
                        } else {
                          handleSubscribe(priceId, plan.name);
                        }
                      }}
                      disabled={checkoutLoading === plan.name || actionLoading === plan.name}
                      style={{
                        width: '100%', height: '56px', background: plan.color, color: '#FBEEDD',
                        borderRadius: '14px', border: 'none',
                        fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                        opacity: (checkoutLoading === plan.name || actionLoading === plan.name) ? 0.6 : 1,
                        marginTop: 'auto',
                      }}>
                      {checkoutLoading === plan.name || actionLoading === plan.name
                        ? 'Loading...'
                        : hasActiveSub
                          ? `Switch to ${plan.name}`
                          : plan.ctaLabel}
                    </button>
                  )
                )}

                {plan.ctaAction === 'current' && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    style={{ width: '100%', height: '56px', background: '#FBEEDD', color: '#6B2D4E', borderRadius: '14px', border: '1px solid #6B2D4E', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>
                    {isCurrent ? 'Current Plan' : 'Free Plan'}
                  </button>
                )}

                {plan.ctaAction === 'contact' && (
                  <button
                    className="tarsyn-cta-btn"
                    onClick={handleContactSales}
                    style={{
                      width: '100%', height: '56px', background: 'transparent', color: plan.color,
                      borderRadius: '14px', border: `1px solid ${plan.color}`,
                      fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                      marginTop: 'auto',
                    }}>
                    {plan.ctaLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '40px', background: 'white', borderRadius: '20px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 800, margin: '0 0 6px' }}>Need Enterprise pricing?</h3>
          <p style={{ color: '#6B2D4E', fontSize: '14px', margin: '0 0 18px' }}>Contact TARSYN Sales Team</p>
          <button
            className="tarsyn-cta-btn"
            onClick={handleContactSales}
            style={{
              height: '56px', padding: '0 32px', background: '#6B2D4E', color: '#FBEEDD',
              borderRadius: '14px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              marginBottom: '24px',
            }}>
            Contact Us
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', color: '#6B2D4E', fontSize: '13px', fontWeight: 600 }}>
            <span>Cancel anytime</span>
            <span>No hidden fees</span>
            <span>Secure payments</span>
          </div>
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