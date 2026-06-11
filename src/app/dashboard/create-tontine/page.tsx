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
  { region: 'United States', flag: '🇺🇸', name: 'Sou-Sou / Rotating Savings' },
  { region: 'Canada', flag: '🇨🇦', name: 'Sou-Sou / Rotating Savings' },
  { region: 'United Kingdom', flag: '🇬🇧', name: 'Pardner' },
  { region: 'France', flag: '🇫🇷', name: 'Tontine' },
  { region: 'Belgium', flag: '🇧🇪', name: 'Tontine' },
  { region: 'Switzerland', flag: '🇨🇭', name: 'Tontine' },
  { region: 'West Africa', flag: '🌍', name: 'Tontine' },
  { region: 'Cameroon', flag: '🇨🇲', name: 'Njangi' },
  { region: 'Congo (DRC)', flag: '🇨🇩', name: 'Likelemba' },
  { region: 'Ghana', flag: '🇬🇭', name: 'Susu' },
  { region: 'Nigeria', flag: '🇳🇬', name: 'Ajo / Esusu' },
  { region: 'Senegal', flag: '🇸🇳', name: 'Tontine' },
  { region: 'Ivory Coast', flag: '🇨🇮', name: 'Tontine' },
  { region: 'Kenya', flag: '🇰🇪', name: 'Chama' },
  { region: 'Ethiopia', flag: '🇪🇹', name: 'Iqub' },
  { region: 'Haiti', flag: '🇭🇹', name: 'Sol' },
  { region: 'Dominican Republic', flag: '🇩🇴', name: 'San / Mutualidad' },
  { region: 'Jamaica', flag: '🇯🇲', name: 'Partner' },
  { region: 'Trinidad & Tobago', flag: '🇹🇹', name: 'Sou-Sou' },
  { region: 'Barbados', flag: '🇧🇧', name: 'Meeting Turn' },
  { region: 'Guyana', flag: '🇬🇾', name: 'Box Hand' },
  { region: 'Suriname', flag: '🇸🇷', name: 'Kasmoni' },
  { region: 'Cuba', flag: '🇨🇺', name: 'Cundina' },
  { region: 'Puerto Rico', flag: '🇵🇷', name: 'Cundina' },
  { region: 'Guadeloupe', flag: '🇬🇵', name: 'Sou-Sou' },
  { region: 'Martinique', flag: '🇲🇶', name: 'Sou-Sou' },
  { region: 'French Guiana', flag: '🇬🇫', name: 'Sou-Sou' },
  { region: 'Mexico', flag: '🇲🇽', name: 'Tanda' },
  { region: 'Colombia', flag: '🇨🇴', name: 'Natillera' },
  { region: 'Peru', flag: '🇵🇪', name: 'Pandero' },
  { region: 'Bolivia', flag: '🇧🇴', name: 'Pasanaku' },
  { region: 'India', flag: '🇮🇳', name: 'Chit Fund' },
  { region: 'Philippines', flag: '🇵🇭', name: 'Paluwagan' },
  { region: 'Vietnam', flag: '🇻🇳', name: 'Hui' },
  { region: 'China', flag: '🇨🇳', name: 'Hui' },
  { region: 'South Korea', flag: '🇰🇷', name: 'Gye' },
  { region: 'Japan', flag: '🇯🇵', name: 'Ko' },
  { region: 'Other / General', flag: '🌍', name: 'Rotating Savings' },
];

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'HTG', label: 'HTG — Haitian Gourde' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'XOF', label: 'XOF — CFA Franc' },
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'PHP', label: 'PHP — Philippine Peso' },
  { code: 'DOP', label: 'DOP — Dominican Peso' },
  { code: 'TTD', label: 'TTD — T&T Dollar' },
  { code: 'JMD', label: 'JMD — Jamaican Dollar' },
  { code: 'BTC', label: 'BTC — Bitcoin' },
  { code: 'ETH', label: 'ETH — Ethereum' },
  { code: 'USDT', label: 'USDT — Tether (Optional Premium)' },
  { code: 'USDC', label: 'USDC — USD Coin (Optional Premium)' },
];

const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Bi-annual', 'Annual'];
const COMMISSIONS = ['0.5%', '1%', '1.5%', '2%'];
const ROTATION_TYPES = ['Fixed', 'Random', 'Admin Managed'];
const PAYMENT_METHODS = ['Cash', 'Transfer', 'Mobile Money', 'Mixed'];
const POSITION_STRATEGIES = ['Manual', 'Automatic', 'Random'];
const PRIVACY_MODES = [
  { value: 'Private', desc: 'Only members can see the group' },
  { value: 'Invite Only', desc: 'Join by invitation only' },
  { value: 'Confidential', desc: 'Members see only TYN-IDs' },
  { value: 'Public', desc: 'Anyone can find and join' },
];
const RULES_TEMPLATES = [
  { label: 'Standard', text: 'Payment before the 5th of each month. $10 penalty per late payment. No withdrawal before cycle ends.' },
  { label: 'Strict', text: 'Payment on the 1st. $20 penalty after 3 days late. Replacement member required if missed 2 payments.' },
  { label: 'Flexible', text: 'Payment anytime during the month. No penalty for first late. Communication required for any delay.' },
  { label: 'Custom', text: '' },
];
const LANGUAGES = ['English','French','Spanish','Portuguese','Haitian Creole','Arabic','Hindi','Wolof','Swahili','Other'].sort();
const frequencyMonths: Record<string, number> = {
  'Weekly': 0.25, 'Bi-weekly': 0.5, 'Monthly': 1,
  'Quarterly': 3, 'Bi-annual': 6, 'Annual': 12
};

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: `1.5px solid #D9C0CC`, borderRadius: '10px',
  fontSize: '14px', color: '#2C1A24', background: '#FAF0E6',
  boxSizing: 'border-box', outline: 'none',
};

function SectionTitle({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', marginTop: '24px' }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#6B2D4E', textTransform: 'uppercase', letterSpacing: '1px' }}>{text}</span>
      <div style={{ flex: 1, height: '1px', background: '#EDD9E5' }} />
    </div>
  );
}

function FieldLabel({ icon, label, required }: { icon: string; label: string; required?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#2C1A24', marginBottom: '7px' }}>
      {icon} {label} {required && <span style={{ color: '#DC2626', fontSize: '12px' }}>*</span>}
    </label>
  );
}

export default function CreateTontinePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedGroup, setSavedGroup] = useState<any>(null);
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [copied, setCopied] = useState(false);

  const [region, setRegion] = useState('');
  const [customName, setCustomName] = useState('');
  const [language, setLanguage] = useState('English');
  const [numMembers, setNumMembers] = useState('');
  const [contribution, setContribution] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [frequency, setFrequency] = useState('Monthly');
  const [startDate, setStartDate] = useState('');
  const [commission, setCommission] = useState('1%');
  const [rotationType, setRotationType] = useState('Fixed');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [positionStrategy, setPositionStrategy] = useState('Manual');
  const [privacyMode, setPrivacyMode] = useState('Private');
  const [rulesTemplate, setRulesTemplate] = useState('Standard');
  const [rules, setRules] = useState(RULES_TEMPLATES[0].text);
  const [confidential, setConfidential] = useState(false);
  const [adminVisibility, setAdminVisibility] = useState('Show Organizer');
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);

  const selectedRegion = REGIONS.find(r => r.region === region);
  const numM = parseInt(numMembers) || 0;
  const contrib = parseFloat(contribution) || 0;
  const totalPool = numM * contrib;
  const commissionRate = parseFloat(commission) / 100;
  const organizerRevenue = totalPool * commissionRate;
  const cycleDuration = numM * (frequencyMonths[frequency] || 1);
  const isFormValid = !!(region && numMembers && parseInt(numMembers) >= 2 && contribution && parseFloat(contribution) > 0 && startDate);

  const generateCode = (prefix: string) => {
    const countryCode = region ? region.substring(0, 2).toUpperCase() : 'XX';
    const year = new Date().getFullYear();
    const seq = Date.now().toString().slice(-6);
    return `${prefix}-${countryCode}-${year}-${seq}`;
  };

  const addEmail = () => {
    const email = emailInput.trim();
    if (email && !emailList.includes(email)) {
      setEmailList(prev => [...prev, email]);
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => setEmailList(prev => prev.filter(e => e !== email));

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReview = () => {
    setError('');
    if (!region) return setError('Please select a region.');
    if (!numMembers || parseInt(numMembers) < 2) return setError('Minimum 2 members required.');
    if (parseInt(numMembers) > 500) return setError('Maximum 500 members allowed.');
    if (!contribution || parseFloat(contribution) <= 0) return setError('Contribution amount must be greater than 0.');
    if (!startDate) return setError('Please choose a start date.');
    if (new Date(startDate) <= new Date()) return setError('Start date must be in the future.');
    setShowReview(true);
  };

  const handleSubmit = async () => {
    setShowReview(false);
    setSaving(true);
    try {
      const tontineCode = generateCode('TTN');
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      const inviteLink = `https://tarsyn-app.com/join/${inviteCode}`;

      const docRef = await addDoc(collection(db, 'tontines'), {
        tontineCode, region,
        regionFlag: selectedRegion?.flag || '🌍',
        regionalName: selectedRegion?.name || 'Rotating Savings',
        name: customName || selectedRegion?.name || 'Tontine',
        numMembers: parseInt(numMembers),
        contribution: parseFloat(contribution),
        currency, frequency, startDate, commission,
        rotationType, paymentMethod, positionStrategy,
        privacyMode, adminVisibility,
        rulesTemplate, rules, confidential, language,
        inviteCode, inviteLink,
        inviteEmails: emailList,
        estimatedPool: totalPool,
        estimatedDuration: cycleDuration,
        organizerRevenue,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (emailList.length > 0) {
        await fetch('/api/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails: emailList,
            tontineName: customName || selectedRegion?.name,
            region, contribution, currency, frequency, startDate,
            tontineId: docRef.id, tontineCode, inviteCode, inviteLink,
          }),
        });
      }

      setSavedGroup({
        name: customName || selectedRegion?.name || 'Tontine',
        tontineCode, inviteCode, inviteLink,
        region, contribution: `${contribution} ${currency}`,
        members: numMembers, frequency,
        totalPool: `${totalPool} ${currency}`,
        organizerRevenue: `${organizerRevenue.toFixed(2)} ${currency}`,
      });
    } catch (e) {
      console.error(e);
      setError('Error creating tontine. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────
  if (savedGroup) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '520px', width: '100%', boxShadow: '0 8px 32px rgba(107,45,78,0.12)', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ color: C.bordeaux, fontSize: '26px', fontWeight: '800', margin: '0 0 8px' }}>Tontine Created!</h2>
        <p style={{ color: C.texteGris, fontSize: '14px', margin: '0 0 24px' }}>{savedGroup.name}</p>
        <div style={{ background: C.creme, borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
          {[
            { label: 'Tontine Code', value: savedGroup.tontineCode, mono: true },
            { label: 'Invite Code', value: savedGroup.inviteCode, mono: true },
            { label: 'Region', value: savedGroup.region },
            { label: 'Contribution', value: `${savedGroup.contribution} / ${savedGroup.frequency}` },
            { label: 'Members', value: savedGroup.members },
            { label: 'Total Pool', value: savedGroup.totalPool },
            { label: 'Your Revenue', value: savedGroup.organizerRevenue },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: `1px solid ${C.roseClair}` }}>
              <span style={{ color: C.texteGris, fontSize: '13px' }}>{item.label}</span>
              <span style={{ color: C.bordeaux, fontWeight: '700', fontSize: '13px', fontFamily: item.mono ? 'monospace' : 'inherit' }}>{item.value}</span>
            </div>
          ))}
          <div style={{ marginTop: '8px' }}>
            <p style={{ color: C.texteGris, fontSize: '12px', margin: '0 0 8px' }}>Invite Link</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <p style={{ color: C.bordeaux, fontSize: '12px', wordBreak: 'break-all', fontWeight: '600', flex: 1, margin: 0 }}>{savedGroup.inviteLink}</p>
              <button onClick={() => copyLink(savedGroup.inviteLink)}
                style={{ background: copied ? '#2E7D32' : C.bordeaux, color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard/add-member')}
            style={{ background: C.dore, color: C.bordeaux, padding: '14px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            Invite Members
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: C.bordeaux, color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  // ── REVIEW SCREEN ──────────────────────────────────────────────
  if (showReview) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '500px', width: '100%', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>
        <h2 style={{ color: C.bordeaux, fontSize: '22px', fontWeight: '800', margin: '0 0 8px' }}>📋 Review Your Tontine</h2>
        <p style={{ color: C.texteGris, fontSize: '14px', margin: '0 0 24px' }}>Please confirm before creating.</p>
        <div style={{ background: C.creme, borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          {[
            { label: 'Name', value: customName || selectedRegion?.name || 'Tontine' },
            { label: 'Region', value: `${selectedRegion?.flag} ${region}` },
            { label: 'Members', value: numMembers },
            { label: 'Contribution', value: `${contribution} ${currency}` },
            { label: 'Frequency', value: frequency },
            { label: 'Total Pool', value: `${totalPool} ${currency}` },
            { label: 'Your Revenue', value: `${organizerRevenue.toFixed(2)} ${currency}` },
            { label: 'Cycle Duration', value: `~${cycleDuration} months` },
            { label: 'Start Date', value: startDate },
            { label: 'Privacy', value: privacyMode },
            { label: 'Commission', value: commission },
            { label: 'Rotation', value: rotationType },
            { label: 'Payment', value: paymentMethod },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: `1px solid ${C.roseClair}` }}>
              <span style={{ color: C.texteGris, fontSize: '13px' }}>{item.label}</span>
              <span style={{ color: C.bordeaux, fontWeight: '700', fontSize: '13px' }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowReview(false)}
            style={{ flex: 1, background: C.creme, color: C.bordeaux, padding: '14px', borderRadius: '12px', border: `2px solid ${C.bordeaux}`, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            ← Edit
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ flex: 2, background: C.bordeaux, color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            {saving ? '⏳ Creating...' : '🚀 Confirm & Create'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── MAIN FORM ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.creme, padding: '32px 16px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>

        {/* FORM */}
        <div>
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.bordeaux}, ${C.dore}, ${C.bordeaux})`, borderRadius: '2px 2px 0 0' }} />
          <div style={{ background: '#fff', borderRadius: '0 0 20px 20px', border: `1px solid ${C.roseMoyen}`, borderTop: 'none', boxShadow: '0 8px 40px rgba(107,45,78,0.1)', overflow: 'hidden' }}>

            <div style={{ background: `linear-gradient(135deg, ${C.bordeaux} 0%, #8B3A6A 100%)`, padding: '32px 40px' }}>
              <button onClick={() => router.push('/dashboard')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dore, fontSize: '13px', fontWeight: '600', marginBottom: '16px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                ← Back to Dashboard
              </button>
              <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>✨ Create a Tontine</h1>
              <p style={{ color: C.roseClair, fontSize: '14px', margin: 0, opacity: 0.85 }}>Launch your community savings group in minutes</p>
            </div>

            <div style={{ padding: '32px 40px' }}>

              <SectionTitle icon="🌍" text="Region & Identity" />
              <div style={{ marginBottom: '18px' }}>
                <FieldLabel icon="📍" label="Region / Country" required />
                <select value={region} onChange={e => setRegion(e.target.value)} style={inp}>
                  <option value="">— Select a country or region —</option>
                  {REGIONS.map(r => <option key={r.region} value={r.region}>{r.flag} {r.region} — {r.name}</option>)}
                </select>
                {selectedRegion && (
                  <p style={{ marginTop: '6px', fontSize: '12px', color: C.bordeaux, background: C.roseClair, padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                    {selectedRegion.flag} Regional name: <strong>{selectedRegion.name}</strong>
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
                <div style={{ flex: 1 }}>
                  <FieldLabel icon="✏️" label="Tontine Name (optional)" />
                  <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. My Sol 2026" style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <FieldLabel icon="🌐" label="Group Language" />
                  <select value={language} onChange={e => setLanguage(e.target.value)} style={inp}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <SectionTitle icon="💰" text="Financial Settings" />
              <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
                <div style={{ flex: 1 }}>
                  <FieldLabel icon="👥" label="Number of Members" required />
                  <input type="number" value={numMembers} onChange={e => setNumMembers(e.target.value)} min={2} max={500} placeholder="e.g. 12" style={inp} />
                  {parseInt(numMembers) > 100 && <p style={{ color: '#D97706', fontSize: '12px', margin: '4px 0 0' }}>⚠️ Large groups may affect experience.</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <FieldLabel icon="💵" label="Contribution Amount" required />
                  <input type="number" value={contribution} onChange={e => setContribution(e.target.value)} min={1} placeholder="e.g. 200" style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <FieldLabel icon="🏦" label="Currency" />
                  <select value={currency} onChange={e => setCurrency(e.target.value)} style={inp}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '18px' }}>
                <FieldLabel icon="🔄" label="Payment Frequency" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {FREQUENCIES.map(f => (
                    <button key={f} onClick={() => setFrequency(f)}
                      style={{ padding: '8px 18px', borderRadius: '20px', border: `2px solid ${frequency === f ? C.bordeaux : C.roseMoyen}`, background: frequency === f ? C.bordeaux : 'white', color: frequency === f ? 'white' : C.texteGris, cursor: 'pointer', fontSize: '13px' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
                <div style={{ flex: 1 }}>
                  <FieldLabel icon="📅" label="Start Date" required />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <FieldLabel icon="💼" label="Organizer Commission" />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {COMMISSIONS.map(c => (
                      <button key={c} onClick={() => setCommission(c)}
                        style={{ flex: 1, padding: '9px 0', borderRadius: '10px', border: `2px solid ${commission === c ? C.bordeaux : C.roseMoyen}`, background: commission === c ? C.bordeaux : 'white', color: commission === c ? 'white' : C.texteGris, cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <SectionTitle icon="⚙️" text="Rotation & Payment Settings" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <FieldLabel icon="🔁" label="Rotation Type" />
                  <select value={rotationType} onChange={e => setRotationType(e.target.value)} style={inp}>
                    {ROTATION_TYPES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel icon="💳" label="Payment Method" />
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inp}>
                    {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel icon="📋" label="Position Strategy" />
                  <select value={positionStrategy} onChange={e => setPositionStrategy(e.target.value)} style={inp}>
                    {POSITION_STRATEGIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <SectionTitle icon="👁️" text="Position Preview" />
              {numM > 0 && startDate ? (
                <div style={{ background: C.creme, borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                  <p style={{ color: C.texteGris, fontSize: '12px', margin: '0 0 12px' }}>Rotation preview — {numMembers} members — {frequency}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Array.from({ length: Math.min(numM, 5) }, (_, i) => {
                      const payoutDate = new Date(startDate);
                      payoutDate.setMonth(payoutDate.getMonth() + i * (frequencyMonths[frequency] || 1));
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', borderRadius: '8px', padding: '10px 14px' }}>
                          <span style={{ background: C.bordeaux, color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>#{i + 1}</span>
                          <span style={{ color: C.texteFonce, fontSize: '13px', fontWeight: '600', flex: 1 }}>Member {i + 1}</span>
                          <span style={{ color: C.texteGris, fontSize: '12px' }}>{payoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      );
                    })}
                    {numM > 5 && <p style={{ color: C.texteGris, fontSize: '12px', textAlign: 'center', margin: '4px 0 0' }}>+{numM - 5} more members...</p>}
                  </div>
                </div>
              ) : (
                <div style={{ background: C.creme, borderRadius: '12px', padding: '16px', marginBottom: '18px', textAlign: 'center' }}>
                  <p style={{ color: C.texteGris, fontSize: '13px', margin: 0 }}>Enter number of members and start date to see rotation preview.</p>
                </div>
              )}

              <SectionTitle icon="📜" text="Rules" />
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {RULES_TEMPLATES.map(t => (
                    <button key={t.label} onClick={() => { setRulesTemplate(t.label); if (t.text) setRules(t.text); }}
                      style={{ padding: '6px 16px', borderRadius: '20px', border: `2px solid ${rulesTemplate === t.label ? C.bordeaux : C.roseMoyen}`, background: rulesTemplate === t.label ? C.bordeaux : 'white', color: rulesTemplate === t.label ? 'white' : C.texteGris, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea value={rules} onChange={e => setRules(e.target.value)} rows={3}
                  placeholder="Group rules..." style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <SectionTitle icon="🔒" text="Privacy & Members" />
              <div style={{ marginBottom: '18px' }}>
                <FieldLabel icon="🛡️" label="Privacy Mode" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {PRIVACY_MODES.map(p => (
                    <div key={p.value} onClick={() => setPrivacyMode(p.value)}
                      style={{ border: `2px solid ${privacyMode === p.value ? C.bordeaux : C.roseMoyen}`, borderRadius: '12px', padding: '12px 16px', cursor: 'pointer', background: privacyMode === p.value ? C.roseClair : 'white' }}>
                      <p style={{ color: C.bordeaux, fontWeight: '700', fontSize: '13px', margin: '0 0 4px' }}>{p.value}</p>
                      <p style={{ color: C.texteGris, fontSize: '11px', margin: 0 }}>{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div onClick={() => setConfidential(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: confidential ? C.roseClair : '#FDFAF8', border: `1.5px solid ${confidential ? C.bordeaux : C.roseMoyen}`, borderRadius: '12px', marginBottom: '20px', cursor: 'pointer' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${confidential ? C.bordeaux : C.roseMoyen}`, background: confidential ? C.bordeaux : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', flexShrink: 0 }}>
                  {confidential ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: C.texteFonce }}>🔒 Confidential Mode</div>
                  <div style={{ fontSize: '12px', color: C.texteGris, marginTop: '2px' }}>Members only see their TYN-ID, not each other's names</div>
                </div>
              </div>

              <SectionTitle icon="📧" text="Invite Members" />
              <div style={{ marginBottom: '24px' }}>
                <FieldLabel icon="📧" label="Invite by Email" />
                <div style={{ background: C.creme, border: `1.5px dashed ${C.roseMoyen}`, borderRadius: '12px', padding: '16px' }}>
                  {emailList.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                      {emailList.map(email => (
                        <span key={email} style={{ background: C.roseClair, color: C.bordeaux, fontSize: '12px', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {email}
                          <button onClick={() => removeEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.bordeaux, fontSize: '14px', padding: 0 }}>×</button>
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
                  <p style={{ fontSize: '12px', color: C.texteGris, margin: '8px 0 0' }}>Press Enter or click Add</p>
                </div>
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#DC2626', fontSize: '14px', marginBottom: '20px' }}>
                  ⚠️ {error}
                </div>
              )}

              {!isFormValid && (
                <p style={{ color: C.texteGris, fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>
                  ⚠️ Complete all required fields (*) to continue.
                </p>
              )}

              <button onClick={handleReview} disabled={!isFormValid || saving}
                style={{ width: '100%', padding: '15px', background: !isFormValid ? C.roseMoyen : C.bordeaux, color: !isFormValid ? C.texteGris : 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: !isFormValid ? 'not-allowed' : 'pointer', boxShadow: !isFormValid ? 'none' : `0 4px 20px rgba(107,45,78,0.35)` }}>
                {saving ? '⏳ Creating...' : '📋 Review & Create'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '12px', color: C.texteGris, marginTop: '16px' }}>
                TARSYN — Your Community. Your Power. 🌍
              </p>
            </div>
          </div>
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.bordeaux}, ${C.dore}, ${C.bordeaux})`, borderRadius: '0 0 2px 2px' }} />
        </div>

        {/* LIVE SUMMARY CARD */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 24px rgba(107,45,78,0.12)', border: `1px solid ${C.roseClair}` }}>
            <h3 style={{ color: C.bordeaux, fontSize: '15px', fontWeight: '800', margin: '0 0 16px' }}>📊 Live Summary</h3>
            {[
              { label: 'Name', value: customName || selectedRegion?.name || '—' },
              { label: 'Region', value: region ? `${selectedRegion?.flag} ${region}` : '—' },
              { label: 'Members', value: numMembers || '—' },
              { label: 'Contribution', value: contribution ? `${contribution} ${currency}` : '—' },
              { label: 'Frequency', value: frequency },
              { label: 'Total Pool', value: totalPool > 0 ? `${totalPool} ${currency}` : '—', highlight: true },
              { label: 'Your Revenue', value: organizerRevenue > 0 ? `${organizerRevenue.toFixed(2)} ${currency}` : '—' },
              { label: 'Cycle Duration', value: cycleDuration > 0 && numM > 0 ? `~${cycleDuration} months` : '—' },
              { label: 'Start Date', value: startDate || '—' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.roseClair}` }}>
                <span style={{ color: C.texteGris, fontSize: '12px' }}>{item.label}</span>
                <span style={{ color: (item as any).highlight ? C.bordeaux : C.texteFonce, fontWeight: (item as any).highlight ? '800' : '600', fontSize: '12px' }}>{item.value}</span>
              </div>
            ))}
            {totalPool > 0 && (
              <div style={{ marginTop: '16px', background: `linear-gradient(135deg, ${C.bordeaux}, #8B3A6A)`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <p style={{ color: C.roseClair, fontSize: '11px', margin: '0 0 4px' }}>TOTAL POOL</p>
                <p style={{ color: C.dore, fontSize: '22px', fontWeight: '800', margin: '0' }}>{totalPool} {currency}</p>
              </div>
            )}
            <div style={{ marginTop: '16px' }}>
              <p style={{ color: C.texteGris, fontSize: '11px', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Required fields</p>
              {[
                { label: 'Region', done: !!region },
                { label: 'Members (min 2)', done: parseInt(numMembers) >= 2 },
                { label: 'Contribution > 0', done: parseFloat(contribution) > 0 },
                { label: 'Future Start Date', done: !!startDate && new Date(startDate) > new Date() },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px' }}>{f.done ? '✅' : '○'}</span>
                  <span style={{ color: f.done ? '#2E7D32' : C.texteGris, fontSize: '12px', fontWeight: f.done ? '600' : '400' }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
