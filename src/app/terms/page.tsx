'use client';
import Footer from '@/components/Footer';

const C = { bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38', creme: '#FBEEDD', muted: '#6b7280', border: '#EAD9BE' };

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Your Account',
    body: 'You must provide accurate information when creating an account and are responsible for keeping your login credentials secure. You must be old enough to enter into a binding agreement in your country of residence to create an account.',
  },
  {
    title: '2. Pricing and Fees',
    body: 'New organizer accounts include a 10-day free trial, no credit card required. After the trial, using UNIMUNITY as an organizer requires a one-time $24.99 lifetime access fee and an active subscription plan (currently $9.99/month or $89.99/year). Members who are required to pay an access fee to join a group pay a one-time $9.99 fee. There is no free-forever plan. Prices are shown in USD and may change; you will be notified of any pricing change before it applies to you.',
  },
  {
    title: '3. Organizer Commission on Payouts',
    body: 'Each group\'s organizer may configure a commission structure for that group. When configured, the commission is deducted automatically from a member\'s payout before it is sent, and members are shown the applicable rates and must accept them before contributing. UNIMUNITY does not set a single platform-wide commission - rates are defined per group by that group\'s organizer.',
  },
  {
    title: '4. Payments and Billing',
    body: 'Subscription and access-fee payments are processed securely by Stripe. Subscriptions renew automatically at the end of each billing period until cancelled. You can cancel your subscription at any time from your dashboard; cancellation takes effect at the end of the current billing period.',
  },
  {
    title: '5. Refunds',
    body: 'Refund requests are reviewed on a case-by-case basis. Contact our support team if you believe you were charged in error.',
  },
  {
    title: '6. Acceptable Use',
    body: 'UNIMUNITY is a tool for organizing group savings, contributions, and community activities. You agree not to use it for any unlawful purpose, and you are responsible for the accuracy of the financial records you and your group members enter.',
  },
  {
    title: '7. Data and Groups',
    body: 'You retain ownership of the data you and your group enter into UNIMUNITY. Each group\'s data is kept isolated from other groups, as described in our Privacy Policy.',
  },
  {
    title: '8. Changes to These Terms',
    body: 'We may update these Terms from time to time. Continued use of UNIMUNITY after an update means you accept the revised Terms.',
  },
  {
    title: '9. Contact Us',
    body: 'Questions about these Terms can be sent to our support team through the app.',
  },
];

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: C.creme, padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
        <a href="/" style={{ display: 'inline-block' }}>
          <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '48px' }} />
        </a>
        <a href="/" style={{ color: C.bordeaux, fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Back to Home</a>
      </nav>

      <div style={{ flex: 1, maxWidth: '760px', margin: '0 auto', padding: '56px 24px 80px' }}>
        <h1 style={{ color: C.bordeaux, fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Terms of Service</h1>
        <p style={{ color: C.muted, fontSize: '13px', marginBottom: '40px' }}>Last updated: September 2026</p>

        <p style={{ color: C.bordeauxDark, fontSize: '15px', lineHeight: 1.8, marginBottom: '36px' }}>
          These Terms govern your use of UNIMUNITY. By creating an account, you agree to them.
        </p>

        {SECTIONS.map((s) => (
          <div key={s.title} style={{ marginBottom: '30px' }}>
            <h2 style={{ color: C.bordeaux, fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>{s.title}</h2>
            <p style={{ color: C.bordeauxDark, fontSize: '14.5px', lineHeight: 1.8 }}>{s.body}</p>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}
