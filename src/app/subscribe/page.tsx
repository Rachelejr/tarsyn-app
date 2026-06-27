'use client';

import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

const C = {
  gold: '#C9941F',
  goldDark: '#9C7314',
  bg: '#FAF3E6',
  surface: '#FFFFFF',
  border: '#E8D9BC',
  textDark: '#3A2E1A',
  textGris: '#7A6E58',
};

const PLANS = [
  { name: 'Monthly', price: '$9.99', period: '/month', highlight: false },
  { name: 'Yearly', price: '$89.99', period: '/year', highlight: true, savings: 'Save 25%' },
];

export default function SubscribePage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ maxWidth: '700px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏰</div>
          <h1 style={{ color: C.goldDark, fontSize: '26px', fontWeight: 800, margin: '0 0 8px' }}>Your Free Trial Has Ended</h1>
          <p style={{ color: C.textGris, fontSize: '14px', margin: 0 }}>
            Subscribe to continue using TARSYN for your community.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '24px' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: C.surface,
              borderRadius: '20px',
              padding: '28px 24px',
              border: plan.highlight ? `2px solid ${C.gold}` : `1.5px solid ${C.border}`,
              boxShadow: plan.highlight ? '0 12px 32px rgba(201,148,31,0.18)' : '0 4px 16px rgba(0,0,0,0.04)',
              position: 'relative',
            }}>
              {plan.highlight && (
                <span style={{ position: 'absolute', top: '-12px', right: '20px', background: C.gold, color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>
                  {plan.savings}
                </span>
              )}
              <h3 style={{ color: C.textDark, fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>{plan.name}</h3>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ color: C.goldDark, fontSize: '32px', fontWeight: 800 }}>{plan.price}</span>
                <span style={{ color: C.textGris, fontSize: '14px' }}>{plan.period}</span>
              </div>
              <button
                style={{ width: '100%', padding: '13px', background: plan.highlight ? C.gold : 'white', color: plan.highlight ? 'white' : C.goldDark, border: `1.5px solid ${C.gold}`, borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'none', border: 'none', color: C.textGris, fontSize: '13px', textDecoration: 'underline', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
