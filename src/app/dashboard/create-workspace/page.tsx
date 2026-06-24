
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bordeaux: '#6A2955',
  creme:    '#FAF0E6',
  dore:     '#D4AF7A',
  rose:     '#EDD9E5',
  texteGris:'#7A5068',
  texteFonce:'#2C1A24',
  border:   '#D9C0CC',
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

const LANGUAGES = ['English', 'French', 'Haitian Creole', 'Spanish', 'Portuguese', 'Arabic'];

const ORG_TYPES = [
  'Community Group', 'Nonprofit / Foundation', 'Religious Organization',
  'Business / Commerce', 'Cooperative', 'Educational Institution',
  'Investment Group', 'Other',
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
    if (name.trim().length < 2) return setError('Workspace name is required.');
    if (!country) return setError('Country is required.');
    if (!timezone) return setError('Timezone is required.');
    if (!orgType) return setError('Organization type is required.');

    setSaving(true);
    router.push('/workspace/select-module');
  };

  return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: C.bordeaux, color: C.dore, fontWeight: 800, fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>T</div>
          <h1 style={{ color: C.bordeaux, fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>Create Your Workspace</h1>
          <p style={{ color: C.texteGris, fontSize: '13px', margin: 0 }}>This is where your modules will live. You can adjust these later in Settings.</p>
        </div>

        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 8px 32px rgba(106,41,85,0.10)' }}>

          {error && (
            <div style={{ background: '#FBEDED', border: '1px solid #E8C5C5', borderRadius: '10px', padding: '10px 14px', color: '#A14444', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.texteFonce, marginBottom: '6px' }}>
              Workspace Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Hope Community"
              style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.texteFonce, marginBottom: '6px' }}>
                Country <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select value={country} onChange={e => setCountry(e.target.value)}
                style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                <option value="">Select...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.texteFonce, marginBottom: '6px' }}>
                Timezone <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)}
                style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                <option value="">Select...</option>
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.texteFonce, marginBottom: '6px' }}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.texteFonce, marginBottom: '6px' }}>Default Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.texteFonce, marginBottom: '6px' }}>
              Organization Type <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select value={orgType} onChange={e => setOrgType(e.target.value)}
              style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
              <option value="">Select...</option>
              {ORG_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <button onClick={handleContinue} disabled={!isValid || saving}
            style={{
              width: '100%', padding: '14px', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
              background: isValid ? C.bordeaux : C.rose, color: isValid ? 'white' : C.texteGris,
              cursor: isValid ? 'pointer' : 'not-allowed',
            }}>
            {saving ? 'Creating workspace...' : 'Continue to Module Selection →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '11px', color: C.texteGris, marginTop: '14px' }}>
            You'll choose your modules next. Your plan determines how many you can activate.
          </p>
        </div>
      </div>
    </div>
  );
}