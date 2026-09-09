'use client';
import Footer from '@/components/Footer';

const C = { bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38', creme: '#FBEEDD', muted: '#6b7280', border: '#EAD9BE' };

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Information We Collect',
    body: 'When you create an account, we collect your name, email address, and password (stored securely by Firebase Authentication - we never see or store your raw password). When you organize or join a group, we collect the group and financial data you and your members enter: contributions, payout schedules, member lists, and receipts. When you pay a subscription or a one-time access fee, your card details are entered directly into Stripe\'s secure payment form and are never stored on UNIMUNITY\'s own servers.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your information to operate your account and groups, calculate rotations and contributions, generate receipts and reports, send you email notifications (payment reminders, payout notices, weekly summaries), process payments through Stripe, and provide customer support.',
  },
  {
    title: '3. Data Isolation Between Groups',
    body: 'Each group\'s data lives in its own isolated space. Members and organizers can only see the data of groups they belong to - no group can ever see another group\'s members, contributions, or financial records.',
  },
  {
    title: '4. Third-Party Services',
    body: 'UNIMUNITY relies on a small number of trusted service providers to operate: Firebase (Google) for authentication, database, and hosting of your account and group data; Stripe for payment processing (Stripe never shares your full card number with us); and an email delivery provider to send account and group notifications. Each of these providers only receives the data required to perform its function.',
  },
  {
    title: '5. Data Retention and Deletion',
    body: 'We keep your account and group data for as long as your account is active. If you would like your account and associated data deleted, contact us at the address below and we will process your request, subject to any records we are required to retain for financial or legal purposes.',
  },
  {
    title: '6. Your Rights',
    body: 'You can review and update your account information at any time from your dashboard. You may request a copy of your data or ask that it be deleted by contacting us directly.',
  },
  {
    title: '7. Contact Us',
    body: 'Questions about this Privacy Policy can be sent to our support team through the app, or by email to the address associated with your UNIMUNITY account manager.',
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: C.creme, padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
        <a href="/" style={{ display: 'inline-block' }}>
          <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '48px' }} />
        </a>
        <a href="/" style={{ color: C.bordeaux, fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Back to Home</a>
      </nav>

      <div style={{ flex: 1, maxWidth: '760px', margin: '0 auto', padding: '56px 24px 80px' }}>
        <h1 style={{ color: C.bordeaux, fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: C.muted, fontSize: '13px', marginBottom: '40px' }}>Last updated: September 2026</p>

        <p style={{ color: C.bordeauxDark, fontSize: '15px', lineHeight: 1.8, marginBottom: '36px' }}>
          This Privacy Policy explains what information UNIMUNITY collects, how it is used, and how it is protected. By using UNIMUNITY, you agree to the practices described here.
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
