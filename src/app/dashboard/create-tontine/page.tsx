'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const C = {
  bordeaux:   '#6B2D4E',
  dore:       '#D4AF7A',
  creme:      '#FAF0E6',
  roseClair:  '#EDD9E5',
  roseMoyen:  '#D9C0CC',
  texteFonce: '#2C1A24',
  texteGris:  '#7A5068',
};

const REGIONS = [
  // North America
  { region: 'United States',        flag: '🇺🇸', name: 'Sou-Sou / Rotating Savings' },
  { region: 'Canada',               flag: '🇨🇦', name: 'Sou-Sou / Rotating Savings' },
  // Europe
  { region: 'United Kingdom',       flag: '🇬🇧', name: 'Pardner' },
  { region: 'France',               flag: '🇫🇷', name: 'Tontine' },
  { region: 'Belgium',              flag: '🇧🇪', name: 'Tontine' },
  { region: 'Switzerland',          flag: '🇨🇭', name: 'Tontine' },
  // Africa
  { region: 'West Africa',          flag: '🌍', name: 'Tontine' },
  { region: 'Cameroon',             flag: '🇨🇲', name: 'Njangi' },
  { region: 'Congo (DRC)',          flag: '🇨🇩', name: 'Likelemba' },
  { region: 'Ghana',                flag: '🇬🇭', name: 'Susu' },
  { region: 'Nigeria',              flag: '🇳🇬', name: 'Ajo / Esusu' },
  { region: 'Senegal',              flag: '🇸🇳', name: 'Tontine' },
  { region: 'Ivory Coast',          flag: '🇨🇮', name: 'Tontine' },
  { region: 'Kenya',                flag: '🇰🇪', name: 'Chama' },
  { region: 'Ethiopia',             flag: '🇪🇹', name: 'Iqub' },
  // Caribbean & Antilles
  { region: 'Haiti',                flag: '🇭🇹', name: 'Sol' },
  { region: 'Dominican Republic',   flag: '🇩🇴', name: 'San / Mutualidad' },
  { region: 'Jamaica',              flag: '🇯🇲', name: 'Partner' },
  { region: 'Trinidad & Tobago',    flag: '🇹🇹', name: 'Sou-Sou' },
  { region: 'Barbados',             flag: '🇧🇧', name: 'Meeting Turn' },
  { region: 'Guyana',               flag: '🇬🇾', name: 'Box Hand' },
  { region: 'Suriname',             flag: '🇸🇷', name: 'Kasmoni' },
  { region: 'Cuba',                 flag: '🇨🇺', name: 'Cundina' },
  { region: 'Puerto Rico',          flag: '🇵🇷', name: 'Cundina' },
  { region: 'Guadeloupe',           flag: '🇬🇵', name: 'Sou-Sou' },
  { region: 'Martinique',           flag: '🇲🇶', name: 'Sou-Sou' },
  { region: 'French Guiana',        flag: '🇬🇫', name: 'Sou-Sou' },
  { region: 'Saint Lucia',          flag: '🇱🇨', name: 'Sou-Sou' },
  { region: 'Saint Vincent',        flag: '🇻🇨', name: 'Sou-Sou' },
  { region: 'Antigua & Barbuda',    flag: '🇦🇬', name: 'Meeting Turn' },
  // Latin America
  { region: 'Mexico',               flag: '🇲🇽', name: 'Tanda' },
  { region: 'Guatemala',            flag: '🇬🇹', name: 'Cundina' },
  { region: 'Honduras',             flag: '🇭🇳', name: 'Cundina' },
  { region: 'El Salvador',          flag: '🇸🇻', name: 'Cundina' },
  { region: 'Colombia',             flag: '🇨🇴', name: 'Natillera' },
  { region: 'Peru',                 flag: '🇵🇪', name: 'Pandero' },
  { region: 'Bolivia',              flag: '🇧🇴', name: 'Pasanaku' },
  { region: 'Ecuador',              flag: '🇪🇨', name: 'Pandero' },
  // Asia
  { region: 'India',                flag: '🇮🇳', name: 'Chit Fund' },
  { region: 'Philippines',          flag: '🇵🇭', name: 'Paluwagan' },
  { region: 'Vietnam',              flag: '🇻🇳', name: 'Hui' },
  { region: 'China',                flag: '🇨🇳', name: 'Hui' },
  { region: 'South Korea',          flag: '🇰🇷', name: 'Gye' },
  { region: 'Japan',                flag: '🇯🇵', name: 'Ko' },
  // General
  { region: 'Other / General',      flag: '🌍', name: 'Rotating Savings' },
];

const CURRENCIES = [
  { code: 'USD',  label: 'USD — US Dollar' },
  { code: 'HTG',  label: 'HTG — Haitian Gourde' },
  { code: 'EUR',  label: 'EUR — Euro' },
  { code: 'CAD',  label: 'CAD — Canadian Dollar' },
  { code: 'GBP',  label: 'GBP — British Pound' },
  { code: 'XOF',  label: 'XOF — CFA Franc' },
  { code: 'NGN',  label: 'NGN — Nigerian Naira' },
  { code: 'GHS',  label: 'GHS — Ghanaian Cedi' },
  { code: 'INR',  label: 'INR — Indian Rupee' },
  { code: 'MXN',  label: 'MXN — Mexican Peso' },
  { code: 'PHP',  label: 'PHP — Philippine Peso' },
  { code: 'DOP',  label: 'DOP — Dominican Peso' },
  { code: 'TTD',  label: 'TTD — T&T Dollar' },
  { code: 'JMD',  label: 'JMD — Jamaican Dollar' },
  { code: 'BTC',  label: 'BTC — Bitcoin' },
  { code: 'ETH',  label: 'ETH — Ethereum' },
  { code: 'USDT', label: 'USDT — Tether' },
  { code: 'USDC', label: 'USDC — USD Coin' },
];

const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Bi-annual', 'Annual'];
const COMMISSIONS = ['0.5%', '1%', '1.5%', '2%'];

const LANGUAGES = [
  'Afrikaans','Albanian','Amharic','Arabic','Armenian','Bengali','Bosnian',
  'Bulgarian','Burmese','Catalan','Chinese (Cantonese)','Chinese (Mandarin)',
  'Croatian','Czech','Danish','Dutch','English','Estonian','Filipino / Tagalog',
  'Finnish','French','Georgian','German','Greek','Gujarati','Haitian Creole',
  'Hausa','Hebrew','Hindi','Hungarian','Igbo','Indonesian','Italian','Japanese',
  'Kannada','Kazakh','Khmer','Kinyarwanda','Korean','Kurdish','Lao','Latvian',
  'Lithuanian','Macedonian','Malagasy','Malay','Malayalam','Maltese','Marathi',
  'Mongolian','Nepali','Norwegian','Persian (Farsi)','Polish',
  'Portuguese (Brazil)','Portuguese (Portugal)','Punjabi','Romanian','Russian',
  'Serbian','Shona','Slovak','Slovene','Somali','Spanish','Swahili','Swedish',
  'Tamil','Telugu','Thai','Turkish','Ukrainian','Urdu','Uzbek','Vietnamese',
  'Wolof','Xhosa','Yoruba','Zulu',
].sort();

export default function CreateTontinePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const [form, setForm] = useState({
    region:       '',
    customName:   '',
    numMembers:   '',
    contribution: '',
    currency:     'USD',
    frequency:    'Monthly',
    startDate:    '',
    commission:   '1%',
    rules:        '',
    confidential: false,
    language:     'English',
  });

  const [emailInput, setEmailInput] = useState('');
  const [emailList,  setEmailList]  = useState<string[]>([]);

  const selectedRegion = REGIONS.find(r => r.region === form.region);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addEmail = () => {
    const email = emailInput.trim();
    if (email && !emailList.includes(email)) {
      setEmailList([...emailList, email]);
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setEmailList(emailList.filter(e => e !== email));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.region) return setError('Please select a region.');
    if (!form.numMembers || parseInt(form.numMembers) < 2) return setError('Minimum 2 members required.');
    if (!form.contribution || parseFloat(form.contribution) <= 0) return setError('Invalid contribution amount.');
    if (!form.startDate) return setError('Please choose a start date.');

    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'tontines'), {
        region:       form.region,
        regionFlag:   selectedRegion?.flag || '🌍',
        regionalName: selectedRegion?.name || 'Rotating Savings',
        name:         form.customName || selectedRegion?.name || 'Tontine',
        numMembers:   parseInt(form.numMembers),
        contribution: parseFloat(form.contribution),
        currency:     form.currency,
        frequency:    form.frequency,
        startDate:    form.startDate,
        commission:   form.commission,
        rules:        form.rules,
        confidential: form.confidential,
        language:     form.language,
        inviteEmails: emailList,
        status:       'active',
        createdAt:    serverTimestamp(),
      });

      if (emailList.length > 0) {
        await fetch('/api/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails:       emailList,
            tontineName:  form.customName || selectedRegion?.name,
            region:       form.region,
            regionFlag:   selectedRegion?.flag || '🌍',
            contribution: form.contribution,
            currency:     form.currency,
            frequency:    form.frequency,
            startDate:    form.startDate,
            tontineId:    docRef.id,
          }),
        });
      }

      setSaved(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (e) {
      console.error(e);
      setError('Error creating tontine. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: `1.5px solid ${C.roseMoyen}`, borderRadius: '10px',
    fontSize: '14px', color: C.texteFonce, background: C.creme,
    boxSizing: 'border-box', outline: 'none',
  };

  const SectionTitle = ({ icon, text }: { icon: string; text: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', marginTop: '8px' }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: '12px', fontWeight: '600', color: C.bordeaux, textTransform: 'uppercase', letterSpacing: '1px' }}>{text}</span>
      <div style={{ flex: 1, height: '1px', background: C.roseClair }} />
    </div>
  );

  const Field = ({ icon, label, required, children }: { icon: string; label: string; required?: boolean; children: React.ReactNode }) => (
    <div style={{ marginBottom: '18px', flex: 1 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: C.texteFonce, marginBottom: '7px' }}>
        {icon} {label} {required && <span style={{ color: '#DC2626', fontSize: '12px' }}>*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: '720px' }}>

        <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.bordeaux}, ${C.dore}, ${C.bordeaux})`, borderRadius: '2px 2px 0 0' }} />

        <div style={{ background: '#fff', borderRadius: '0 0 20px 20px', border: `1px solid ${C.roseMoyen}`, borderTop: 'none', boxShadow: '0 8px 40px rgba(107,45,78,0.1)', overflow: 'hidden' }}>

          {/* Hero */}
          <div style={{ background: `linear-gradient(135deg, ${C.bordeaux} 0%, #8B3A6A 100%)`, padding: '32px 40px', position: 'relative' }}>
            <button onClick={() => router.push('/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dore, fontSize: '13px', fontWeight: '600', marginBottom: '16px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              ← Back to Dashboard
            </button>
            <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>✨ Create a Tontine</h1>
            <p style={{ color: C.roseClair, fontSize: '14px', margin: 0, opacity: 0.85 }}>Launch your community savings group in minutes</p>
            <
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', padding: '16px 40px', borderBottom: `1px solid ${C.roseClair}`, background: '#FDFAF8', alignItems: 'center' }}>
            {[{ n: 1, label: 'Group Info' }, { n: 2, label: 'Settings' }, { n: 3, label: 'Members' }].map((s, i) => (
              <div key={s.n} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', background: i === 0 ? C.bordeaux : C.roseClair, color: i === 0 ? 'white' : C.texteGris, flexShrink: 0 }}>
                    {s.n}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: i === 0 ? C.bordeaux : C.texteGris }}>{s.label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: '1px', background: C.roseMoyen, margin: '0 12px' }} />}
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ padding: '32px 40px' }}>

            <SectionTitle icon="🌍" text="Region & Identity" />

            <Field icon="📍" label="Region / Country" required>
              <select name="region" value={form.region} onChange={handleChange} style={inp}>
                <option value="">— Select a country or region —</option>
                {REGIONS.map(r => <option key={r.region} value={r.region}>{r.flag} {r.region} — {r.name}</option>)}
              </select>
              {selectedRegion && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: C.bordeaux, background: C.roseClair, padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                  {selectedRegion.flag} Regional name: <strong>{selectedRegion.name}</strong>
                </p>
              )}
            </Field>

            <div style={{ display: 'flex', gap: '16px' }}>
              <Field icon="✏️" label="Custom Name (optional)">
                <input type="text" name="customName" value={form.customName} onChange={handleChange} placeholder="e.g. My Sol 2026" style={inp} />
              </Field>
              <Field icon="🌐" label="Group Language">
                <select name="language" value={form.language} onChange={handleChange} style={inp}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
            </div>

            <SectionTitle icon="💰" text="Financial Settings" />

            <div style={{ display: 'flex', gap: '16px' }}>
              <Field icon="👥" label="Number of Members" required>
                <input type="number" name="numMembers" value={form.numMembers} onChange={handleChange} min={2} placeholder="e.g. 12" style={inp} />
              </Field>
              <Field icon="💵" label="Contribution Amount" required>
                <input type="number" name="contribution" value={form.contribution} onChange={handleChange} min={1} placeholder="e.g. 200" style={inp} />
              </Field>
              <Field icon="🏦" label="Currency">
                <select name="currency" value={form.currency} onChange={handleChange} style={inp}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: C.texteFonce, marginBottom: '10px' }}>
                🔄 Payment Frequency
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {FREQUENCIES.map(f => (
                  <button key={f} onClick={() => setForm(p => ({ ...p, frequency: f }))}
                    style={{ padding: '8px 18px', borderRadius: '20px', border: `2px solid ${form.frequency === f ? C.bordeaux : C.roseMoyen}`, background: form.frequency === f ? C.bordeaux : 'white', color: form.frequency === f ? 'white' : C.texteGris, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
              <Field icon="📅" label="Start Date" required>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} style={inp} />
              </Field>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: C.texteFonce, marginBottom: '10px' }}>
                  💼 Organizer Commission
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {COMMISSIONS.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, commission: c }))}
                      style={{ flex: 1, padding: '9px 0', borderRadius: '10px', border: `2px solid ${form.commission === c ? C.bordeaux : C.roseMoyen}`, background: form.commission === c ? C.bordeaux : 'white', color: form.commission === c ? 'white' : C.texteGris, cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Field icon="📜" label="Group Rules">
              <textarea name="rules" value={form.rules} onChange={handleChange} rows={3}
                placeholder="e.g. Payment before the 5th of the month. $10 penalty per late payment..."
                style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>

            <SectionTitle icon="👥" text="Members & Privacy" />

            <div onClick={() => setForm(p => ({ ...p, confidential: !p.confidential }))}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: form.confidential ? C.roseClair : '#FDFAF8', border: `1.5px solid ${form.confidential ? C.bordeaux : C.roseMoyen}`, borderRadius: '12px', marginBottom: '20px', cursor: 'pointer' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${form.confidential ? C.bordeaux : C.roseMoyen}`, background: form.confidential ? C.bordeaux : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', flexShrink: 0 }}>
                {form.confidential ? '✓' : ''}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: C.texteFonce }}>🔒 Confidential Mode</div>
                <div style={{ fontSize: '12px', color: C.texteGris, marginTop: '2px' }}>Members only see their TYN-ID, not each other's names</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: C.texteFonce, marginBottom: '10px' }}>
                📧 Invite Members by Email
              </label>
              <div style={{ background: C.creme, border: `1.5px dashed ${C.roseMoyen}`, borderRadius: '12px', padding: '16px' }}>
                {emailList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {emailList.map(email => (
                      <span key={email} style={{ background: C.roseClair, color: C.bordeaux, fontSize: '12px', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {email}
                        <button onClick={() => removeEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.bordeaux, fontSize: '14px', padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addEmail()}
                    placeholder="e.g. member@gmail.com"
                    style={{ ...inp, flex: 1, background: 'white' }} />
                  <button onClick={addEmail}
                    style={{ padding: '11px 18px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    + Add
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: C.texteGris, margin: '8px 0 0' }}>Press Enter or click Add — each member receives a personalized invitation</p>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#DC2626', fontSize: '14px', marginBottom: '20px' }}>
                ⚠️ {error}
              </div>
            )}

            {saved && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', color: '#16A34A', fontSize: '14px', marginBottom: '20px' }}>
                ✅ Tontine created! Invitations sent. Redirecting...
              </div>
            )}

            <button onClick={handleSubmit} disabled={saving || saved}
              style={{
                width: '100%', padding: '15px',
                background: saving || saved ? C.roseMoyen : C.bordeaux,
                color: saving || saved ? C.texteGris : 'white',
                border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: '700',
                cursor: saving || saved ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: saving || saved ? 'none' : `0 4px 20px rgba(107,45,78,0.35)`,
              }}>
              {saving ? '⏳ Creating...' : saved ? '✅ Created!' : '🚀 Create Tontine'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '12px', color: C.texteGris, marginTop: '16px' }}>
              TARSYN — Your Community. Your Power. 🌍
            </p>
          </div>
        </div>

        <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.bordeaux}, ${C.dore}, ${C.bordeaux})`, borderRadius: '0 0 2px 2px' }} />
      </div>
    </div>
  );
}