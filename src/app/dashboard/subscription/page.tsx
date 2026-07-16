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
  icon: string;
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
    icon: '🎁',
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
    icon: '🚀',
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
    icon: '📈',
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
    icon: '👑',
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
    icon: '🏢',
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success) setShowSuccess(true);
    if (canceled) setShowCanceled(true);
    if (success || canceled) {
      router.replace('/dashboard/subscription');
    }
  }, [success, canceled, router]);

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 5000);
    return () => clearTimeout(t);
  }, [showSuccess]);

  useEffect(() => {
    if (!showCanceled) return;
    const t = setTimeout(() => setShowCanceled(false), 5000);
    return () => clearTimeout(t);
  }, [showCanceled]);

  useEffect(() => {
    if (!checkoutError) return;
    const t = setTimeout(() => setCheckoutError(null), 5000);
    return () => clearTimeout(t);
  }, [checkoutError]);

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
        .tarsyn-plan-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .tarsyn-plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(107,45,78,0.18) !important;
          border-color: #E9C77B !important;
        }
        .tarsyn-price-value {
          transition: opacity 0.2s ease;
        }
      `}</style>

      <nav style={{ background: '#6B2D4E', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <img src="/tarsyn-logo-white.svg" alt="TARSYN" style={{ height: '48px', width: 'auto', display: 'block' }} />
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: '#E9C77B', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </nav>

      <div className="tarsyn-page-container" style={{ maxWidth: '1300px', width: '92%', margin: '0 auto', padding: '40px 24px' }}>
        {showSuccess && (
          <div style={{ background: '#E8F5E9', borderRadius: '12px', padding: '12px 18px', marginBottom: '12px', color: '#2E7D32', fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span>Subscription activated successfully. Welcome to TARSYN.</span>
            <button onClick={() => setShowSuccess(false)} style={{ background: 'transparent', border: 'none', color: '#2E7D32', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>×</button>
          </div>
        )}
        {showCanceled && (
          <div style={{ background: '#FFF3E0', borderRadius: '12px', padding: '12px 18px', marginBottom: '12px', color: '#E65100', fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span>Checkout canceled. You can try again anytime.</span>
            <button onClick={() => setShowCanceled(false)} style={{ background: 'transparent', border: 'none', color: '#E65100', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>×</button>
          </div>
        )}
        {checkoutError && (
          <div style={{ background: '#FDECEA', borderRadius: '12px', padding: '12px 18px', marginBottom: '12px', color: '#C62828', fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span>{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} style={{ background: 'transparent', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>×</button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#4A1F38', fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Choose the Perfect Plan for Your Community
          </h1>
          <p style={{ color: '#6B2D4E', fontSize: '15px', margin: '0 0 16px' }}>
            Start for free and upgrade only when your organization grows.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#6B2D4E', fontWeight: 600 }}>
            <span>✔ 30-Day Free Trial</span>
            <span>✔ Cancel Anytime</span>
            <span>✔ Secure Payments</span>
          </div>
        </div>

        {(subscription?.status === 'active' || subscription?.status === 'trialing') && (
          <div style={{ background: 'white', borderRadius: '10px', padding: '8px 14px', marginBottom: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#2E7D32', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>
              {subscription.status === 'trialing' ? 'Free Trial Active' : 'Subscription Active'}
            </p>
            <p style={{ color: '#6B2D4E', fontSize: '11px', margin: 0 }}>
              {subscription.status === 'trialing'
                ? `Trial ends: ${new Date(subscription.trialEnd).toLocaleDateString()}`
                : `Renews: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', background: 'white', borderRadius: '12px', padding: '4px', boxShadow: '0 4px 16px rgba(107,45,78,0.10)' }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{
                padding: '10px 22px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700,
                background: billingPeriod === 'monthly' ? '#6B2D4E' : 'transparent',
                color: billingPeriod === 'monthly' ? '#FBEEDD' : '#6B2D4E',
                transition: 'all 0.2s ease',
              }}>
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              style={{
                padding: '10px 22px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                background: billingPeriod === 'annual' ? '#6B2D4E' : 'transparent',
                color: billingPeriod === 'annual' ? '#FBEEDD' : '#6B2D4E',
                transition: 'all 0.2s ease',
              }}>
              Annual
              <span style={{
                background: billingPeriod === 'annual' ? '#E9C77B' : '#E8F5E9',
                color: billingPeriod === 'annual' ? '#4A1F38' : '#2E7D32',
                fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '999px',
              }}>
                SAVE 17%
              </span>
            </button>
          </div>
        </div>

        <div className="tarsyn-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '18px', alignItems: 'stretch' }}>
          {PLANS.map((plan) => {
            const isCurrent = activePlanId === plan.id;
            const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
            const priceId = billingPeriod === 'monthly' ? plan.priceIdMonthly : plan.priceIdAnnual;
            const periodLabel = plan.priceMonthly === null ? '' : billingPeriod === 'monthly' ? '/month' : '/year';
            const hasActiveSub = subscription?.status === 'active' || subscription?.status === 'trialing';
            const annualSavings = plan.priceMonthly && plan.priceAnnual ? Math.round(plan.priceMonthly * 12 - plan.priceAnnual) : 0;

            return (
              <div key={plan.id} className="tarsyn-plan-card" style={{
                background: 'white', borderRadius: '22px', padding: '26px 20px',
                boxShadow: plan.badge ? '0 12px 40px rgba(107,45,78,0.16)' : '0 4px 20px rgba(0,0,0,0.05)',
                border: isCurrent ? '2px solid #2E7D32' : (plan.badge ? `2px solid ${plan.color}` : '2px solid #F0E4D0'),
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}>
                {plan.badge && !isCurrent && (
                  <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: plan.color, color: '#E9C77B', padding: '6px 16px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {plan.badge}
                  </div>
                )}

                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: '#2E7D32', color: 'white', padding: '6px 16px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    YOUR CURRENT PLAN
                  </div>
                )}

                <div style={{ fontSize: '32px', textAlign: 'center', margin: '4px 0 10px' }}>{plan.icon}</div>

                <h3 style={{ color: plan.color, fontSize: '18px', fontWeight: 800, margin: '0 0 2px', textAlign: 'center' }}>{plan.name}</h3>
                <p style={{ color: '#8A7A6D', fontSize: '11px', margin: '0 0 16px', textAlign: 'center', minHeight: '28px' }}>{plan.description}</p>

                <div style={{ margin: '0 0 4px', textAlign: 'center' }}>
                  {price === null ? (
                    <span className="tarsyn-price-value" style={{ color: '#4A1F38', fontSize: '30px', fontWeight: 800 }}>Custom</span>
                  ) : (
                    <>
                      <span className="tarsyn-price-value" style={{ color: '#4A1F38', fontSize: '34px', fontWeight: 800 }}>${price}</span>
                      <span style={{ color: '#8A7A6D', fontSize: '13px' }}>{periodLabel}</span>
                    </>
                  )}
                </div>
                <p style={{ color: '#8A7A6D', fontSize: '10px', margin: '0 0 16px', textAlign: 'center' }}>
                  {price === null
                    ? '\u00A0'
                    : billingPeriod === 'annual' && annualSavings > 0
                      ? `Save $${annualSavings}/year`
                      : billingPeriod === 'monthly'
                        ? 'Billed Monthly'
                        : '\u00A0'}
                </p>

                <div style={{ margin: '0 0 12px', textAlign: 'center' }}>
                  <p style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 700, margin: '0 0 2px' }}>{plan.members}</p>
                  <p style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 700, margin: 0 }}>{plan.groups}</p>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 6px', color: '#4A1F38', fontSize: '12px', flexGrow: 1 }}>
                  <li style={{ marginBottom: '7px', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                    <span style={{ color: '#1D9E75', fontWeight: 800, flexShrink: 0 }}>✔</span>{plan.reports}
                  </li>
                  <li style={{ marginBottom: '7px', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                    <span style={{ color: '#1D9E75', fontWeight: 800, flexShrink: 0 }}>✔</span>{plan.support}
                  </li>
                  {plan.additional.map((f) => (
                    <li key={f} style={{ marginBottom: '7px', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                      <span style={{ color: '#1D9E75', fontWeight: 800, flexShrink: 0 }}>✔</span>{f}
                    </li>
                  ))}
                </ul>

                {plan.scaling && (
                  <p style={{ color: '#8A7A6D', fontSize: '9px', margin: '0 0 8px', fontStyle: 'italic', textAlign: 'center' }}>
                    +{plan.scaling.membersIncrement} members = +${plan.scaling.priceIncrement}/mo
                  </p>
                )}

                {plan.ctaAction === 'checkout' && (
                  isCurrent ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
                      <button
                        disabled
                        style={{
                          width: '100%', height: '38px', background: '#FBEEDD', color: '#2E7D32',
                          borderRadius: '10px', border: '1px solid #2E7D32',
                          fontSize: '12px', fontWeight: 700, cursor: 'default',
                        }}>
                        Current Plan
                      </button>
                      {!subscription?.cancelAtPeriodEnd ? (
                        <button
                          onClick={handleCancelSubscription}
                          disabled={actionLoading === 'cancel'}
                          style={{
                            width: '100%', height: '30px', background: 'transparent', color: '#C62828',
                            borderRadius: '8px', border: '1px solid #C62828',
                            fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                            opacity: actionLoading === 'cancel' ? 0.6 : 1,
                          }}>
                          {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel subscription'}
                        </button>
                      ) : (
                        <p style={{ fontSize: '9px', color: '#C62828', textAlign: 'center', margin: 0 }}>
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
                        width: '100%', height: '38px', background: plan.color, color: '#FBEEDD',
                        borderRadius: '10px', border: 'none',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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
                    style={{ width: '100%', height: '38px', background: '#FBEEDD', color: '#6B2D4E', borderRadius: '10px', border: '1px solid #6B2D4E', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>
                    {isCurrent ? 'Current Plan' : 'Free Plan'}
                  </button>
                )}

                {plan.ctaAction === 'contact' && (
                  <button
                    className="tarsyn-cta-btn"
                    onClick={handleContactSales}
                    style={{
                      width: '100%', height: '38px', background: 'transparent', color: plan.color,
                      borderRadius: '10px', border: `1px solid ${plan.color}`,
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      marginTop: 'auto',
                    }}>
                    {plan.ctaLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '10px', background: 'white', borderRadius: '12px', padding: '10px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 800, margin: '0 0 2px' }}>Need Enterprise pricing?</h3>
          <p style={{ color: '#6B2D4E', fontSize: '10px', margin: '0 0 6px' }}>Contact TARSYN Sales Team</p>
          <button
            className="tarsyn-cta-btn"
            onClick={handleContactSales}
            style={{
              height: '30px', padding: '0 18px', background: '#6B2D4E', color: '#FBEEDD',
              borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              marginBottom: '8px',
            }}>
            Contact Us
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', color: '#6B2D4E', fontSize: '10px', fontWeight: 600 }}>
            <span>Cancel anytime</span>
            <span>No hidden fees</span>
            <span>Secure payments</span>
          </div>
        </div>

        {/* ===== PHASE 2: Feature comparison table ===== */}
        <div style={{ marginTop: '48px' }}>
          <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>Compare Plans</h2>
          <p style={{ color: '#8B5A73', fontSize: '13px', textAlign: 'center', margin: '0 0 24px' }}>See exactly what's included in each plan.</p>
          <div style={{ overflowX: 'auto', background: 'white', borderRadius: '14px', boxShadow: '0 2px 16px rgba(107,45,78,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EAD9BE' }}>
                  <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '12px', color: '#6B2D4E', fontWeight: 700 }}>Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} style={{ textAlign: 'center', padding: '14px 10px', fontSize: '12px', color: p.color, fontWeight: 800 }}>
                      {p.icon} {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Members', get: (p: PlanDef) => p.members },
                  { label: 'Groups', get: (p: PlanDef) => p.groups },
                  { label: 'Reports', get: (p: PlanDef) => p.reports },
                  { label: 'Support', get: (p: PlanDef) => p.support },
                  { label: 'Document Center', get: (p: PlanDef) => p.additional.some(a => a.includes('Document Center')) },
                  { label: 'Export tools', get: (p: PlanDef) => p.additional.some(a => a.includes('Export')) },
                  { label: 'API access', get: (p: PlanDef) => p.additional.some(a => a.includes('API')) },
                  { label: 'White label', get: (p: PlanDef) => p.additional.some(a => a.includes('White label')) },
                  { label: 'Dedicated onboarding', get: (p: PlanDef) => p.additional.some(a => a.includes('Dedicated onboarding')) },
                ].map((row, i) => (
                  <tr key={row.label} style={{ borderBottom: '1px solid #F5EBDC', background: i % 2 === 0 ? 'white' : '#FFFBF4' }}>
                    <td style={{ padding: '12px 16px', fontSize: '12.5px', color: '#4A1F38', fontWeight: 600 }}>{row.label}</td>
                    {PLANS.map((p) => {
                      const val = row.get(p);
                      return (
                        <td key={p.id} style={{ textAlign: 'center', padding: '12px 10px', fontSize: '12px', color: '#6B2D4E' }}>
                          {typeof val === 'boolean' ? (val ? <span style={{ color: '#3B8659', fontWeight: 800 }}>✓</span> : <span style={{ color: '#D9C0CC' }}>—</span>) : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== PHASE 3: Why Choose TARSYN ===== */}
        <div style={{ marginTop: '56px' }}>
          <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>Why Choose TARSYN</h2>
          <p style={{ color: '#8B5A73', fontSize: '13px', textAlign: 'center', margin: '0 0 24px' }}>Built specifically for community savings groups.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { icon: '🌍', title: 'Built for Communities', desc: 'Designed for tontines, sols, and sou-sous, with support for 25+ languages worldwide.' },
              { icon: '🔒', title: 'Bank-Level Security', desc: 'Your data is encrypted and protected, with secure Stripe-powered payments.' },
              { icon: '📊', title: 'Complete Transparency', desc: 'Automatic reports, audit logs, and full visibility for every member.' },
              { icon: '💬', title: 'Real Human Support', desc: 'Talk to a real person, not a bot, whenever you need help.' },
            ].map((f) => (
              <div key={f.title} style={{ background: 'white', borderRadius: '14px', padding: '20px 16px', textAlign: 'center', boxShadow: '0 2px 12px rgba(107,45,78,0.06)' }}>
                <div style={{ fontSize: '30px', marginBottom: '8px' }}>{f.icon}</div>
                <h3 style={{ color: '#6B2D4E', fontSize: '14px', fontWeight: 800, margin: '0 0 6px' }}>{f.title}</h3>
                <p style={{ color: '#8B5A73', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== PHASE 4a: Testimonials ===== */}
        <div style={{ marginTop: '56px' }}>
          <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>What Our Community Says</h2>
          <p style={{ color: '#8B5A73', fontSize: '13px', textAlign: 'center', margin: '0 0 24px' }}>Trusted by organizers around the world.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {[
              { name: 'Josephine M.', role: 'Tontine Organizer, Brooklyn', quote: 'TARSYN made it so easy to keep track of contributions. My members love the transparency.' },
              { name: 'Daniel K.', role: 'Church Treasurer, Miami', quote: 'The automatic reports save me hours every month. I recommend it to every organization I know.' },
              { name: 'Amara T.', role: 'Sou-Sou Coordinator, Toronto', quote: 'Finally a platform that understands how our community savings groups actually work.' },
            ].map((t) => (
              <div key={t.name} style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 12px rgba(107,45,78,0.06)' }}>
                <p style={{ color: '#4A1F38', fontSize: '13px', fontStyle: 'italic', margin: '0 0 14px', lineHeight: 1.6 }}>&ldquo;{t.quote}&rdquo;</p>
                <p style={{ color: '#6B2D4E', fontSize: '12.5px', fontWeight: 800, margin: 0 }}>{t.name}</p>
                <p style={{ color: '#8B5A73', fontSize: '11px', margin: 0 }}>{t.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== PHASE 4b: FAQ accordion ===== */}
        <div style={{ marginTop: '56px' }}>
          <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>Pricing Questions</h2>
          <p style={{ color: '#8B5A73', fontSize: '13px', textAlign: 'center', margin: '0 0 24px' }}>Everything you need to know about billing.</p>
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { q: 'Can I change plans later?', a: 'Yes, you can upgrade or downgrade your plan at any time from this page. Changes take effect immediately.' },
              { q: 'What happens if I exceed my member limit?', a: 'You can add more members for a small increment, shown on each plan card, or upgrade to the next tier.' },
              { q: 'Is there a free trial?', a: 'Yes, every new account starts with a 30-day free trial with access to Starter features.' },
              { q: 'Can I cancel anytime?', a: 'Yes, there are no long-term contracts. You can cancel your subscription at any time from this page.' },
              { q: 'Do you offer discounts for annual billing?', a: 'Yes, switching to annual billing saves you up to 17% compared to paying monthly.' },
            ].map((item, i) => (
              <div key={item.q} style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 6px rgba(107,45,78,0.06)', overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ color: '#4A1F38', fontSize: '13px', fontWeight: 700 }}>{item.q}</span>
                  <span style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 700 }}>{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <p style={{ color: '#8B5A73', fontSize: '12.5px', lineHeight: 1.6, margin: 0, padding: '0 18px 16px' }}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===== PHASE 4c: Payment badges ===== */}
        <div style={{ marginTop: '48px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ color: '#8B5A73', fontSize: '11px', fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Secure payments powered by Stripe</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {['Visa', 'Mastercard', 'Amex', 'PayPal'].map((name) => (
              <span key={name} style={{ background: 'white', border: '1px solid #EAD9BE', borderRadius: '8px', padding: '6px 14px', fontSize: '11.5px', fontWeight: 700, color: '#6B2D4E' }}>
                {name}
              </span>
            ))}
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