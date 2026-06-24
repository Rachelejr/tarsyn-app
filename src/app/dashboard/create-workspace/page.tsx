'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  gold:      '#C9941F',
  goldDark:  '#9C7314',
  bg:        '#FAF3E6',
  surface:   '#FFFFFF',
  border:    '#E8D9BC',
  textDark:  '#3A2E1A',
  textGris:  '#7A6E58',
};

const COUNTRIES = [
  'United States', 'Canada', 'Haiti', 'France', 'Belgium', 'Switzerland',
  'Senegal', 'Ivory Coast', 'Cameroon', 'Nigeria', 'Ghana', 'Kenya',
  'United Kingdom', 'Germany', 'Spain', 'Portugal', 'Brazil', 'Mexico',
  'Dominican Republic', 'Jamaica', 'Other',
];

const TIMEZONES = [
  'UTC-12:00', 'UTC-08:00 (Pacific)', 'UTC-07:00 (Mountain)', 'UTC-06:00 (Central)',
  'UTC-05:00 (Eastern)', 'UTC-04:00 (Atlantic / Haiti DST)', 'UTC+00:00 (GMT/London)',
  'UTC+01:00 (Paris/Berlin)', 'UTC+02:00', 'UTC+03:00', 'UTC+05:30 (India)',
  'UTC+08:00', 'UTC+09:00', 'UTC+10:00',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'HTG', 'XOF', 'NGN', 'GHS', 'BRL', 'MXN'];

const LANGUAGES = [
  'English', 'French', 'Haitian Creole', 'Antillean Creole', 'Spanish', 'Portuguese',
  'Arabic', 'Wolof', 'Bambara', 'Lingala', 'Swahili', 'Yoruba', 'Igbo', 'Hausa',
  'Amharic', 'Somali', 'Malagasy', 'Kinyarwanda', 'Hindi', 'Filipino',
  'Bahasa Indonesia', 'Vietnamese', 'Dutch', 'German', 'Italian',
  'Chinese', 'Japanese', 'Korean',
];

const ORG_TYPES = [
  'Community Group', 'Church / Faith', 'Association', 'Tontine / Sol',
  'Investment Group', 'Agriculture', 'Foundation', 'Cooperative',
  'Commerce', 'Organization', 'Education', 'Health', 'Youth Club', 'Sports', 'Other',
];

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');
  const [orgType, setOrgType] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = name.trim().length >= 2 && country && timezone && orgType;

  const handleContinue = () => {
    setError('');
    if (name.trim().length < 2) return setError('Organization name is required.');
    if (!country) return setError('Country is required.');
    if (!timezone) return setError('Timezone is required.');
    if (!orgType) return setError('Organization type is required.');

    setSaving(true);
    router.push('/workspace/select-module');
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <style>{`
        .gld-select, .gld-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .gld-select:focus, .gld-input:focus { border-color: ${C.gold} !important; box-shadow: 0 0 0 3px rgba(201,148,31,0.15); }
        .gld-continue { transition: background 0.15s ease, transform 0.1s ease; }
        .gld-continue:hover:not(:disabled) { background: ${C.goldDark} !important; transform: translateY(-1px); }
      `}</style>

      <div style={{ maxWidth: '950px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(201,148,31,0.30)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.6" />
              <path d="M3 12h18M12 3c2.5 2.5 3.5 6 0 18M12 3c-2.5 2.5-3.5 6 0 18" stroke="white" strokeWidth="1.4" />
              <circle cx="7" cy="7" r="1.4" fill="white" />
              <circle cx="17" cy="17" r="1.4" fill="white" />
              <circle cx="17" cy="7" r="1.1" fill="white" />
            </svg>
          </div>
          <h1 style={{ color: C.goldDark, fontSize: '26px', fontWeight: 800, margin: '0 0 6px' }}>Create Your Community Space</h1>
          <p style={{ color: C.textGris, fontSize: '14px', margin: 0 }}>Configure your organization before activating modules.</p>
        </div>

        <div style={{ background: C.surface, borderRadius: '24px', padding: '40px', boxShadow: '0 12px 40px rgba(156,115,20,0.10)', border: `1px solid ${C.border}` }}>

          {error && (
            <div style={{ background: '#FBEDED', border: '1px solid #E8C5C5', borderRadius: '10px', padding: '10px 14px', color: '#A14444', fontSize: '13px', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: C.textDark, marginBottom: '6px' }}>
              Organization Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input className="gld-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grace Community Church"
              style={{ width: '100%', padding: '13px 15px', border: `1.5px solid ${C.border}`, borderRadius: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
            <p style={{ fontSize: '11px', color: C.textGris, margin: '6px 0 0' }}>
              Examples: Grace Community Church · TARSYN Investment Club · Hope Cooperative · Youth Association
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: C.textDark, marginBottom: '6px' }}>
                Country <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select className="gld-select" value={country} onChange={e => setCountry(e.target.value)}
                style={{ width: '100%', padding: '13px 15px', border: `1.5px solid ${C.border}`, borderRadius: '12px', fontSize: '15px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                <option value="">Auto-detected — confirm or change</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: C.textDark, marginBottom: '6px' }}>
                Timezone <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select className="gld-select" value={timezone} onChange={e => setTimezone(e.target.value)}
                style={{ width: '100%', padding: '13px 15px', border: `1.5px solid ${C.border}`, borderRadius: '12px', fontSize: '15px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                <option value="">Auto-detected — confirm or change</option>
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: C.textDark, marginBottom: '6px' }}>Currency</label>
              <select className="gld-select" value={currency} onChange={e => setCurrency(e.target.value)}
                style={{ width: '100%', padding: '13px 15px', border: `1.5px solid ${C.border}`, borderRadius: '12px', fontSize: '15px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p style={{ fontSize: '11px', color: C.textGris, margin: '6px 0 0' }}>Auto-detected from country</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: C.textDark, marginBottom: '6px' }}>Default Language</label>
              <select className="gld-select" value={language} onChange={e => setLanguage(e.target.value)}
                style={{ width: '100%', padding: '13px 15px', border: `1.5px solid ${C.border}`, borderRadius: '12px', fontSize: '15px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <p style={{ fontSize: '11px', color: C.textGris, margin: '6px 0 0' }}>Preselected from your preference — change anytime</p>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: C.textDark, marginBottom: '6px' }}>
              Organization Type <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select className="gld-select" value={orgType} onChange={e => setOrgType(e.target.value)}
              style={{ width: '100%', padding: '13px 15px', border: `1.5px solid ${C.border}`, borderRadius: '12px', fontSize: '15px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
              <option value="">Select...</option>
              {ORG_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <button className="gld-continue" onClick={handleContinue} disabled={!isValid || saving}
            style={{
              width: '100%', height: '56px', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 700,
              background: isValid ? C.gold : C.border, color: isValid ? 'white' : C.textGris,
              cursor: isValid ? 'pointer' : 'not-allowed',
              boxShadow: isValid ? '0 8px 20px rgba(201,148,31,0.30)' : 'none',
            }}>
            {saving ? 'Creating workspace...' : 'Continue to Module Selection →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: C.textGris, marginTop: '16px' }}>
            You'll choose your modules next. Your plan determines how many you can activate.
          </p>
        </div>
      </div>
    </div>
  );
}