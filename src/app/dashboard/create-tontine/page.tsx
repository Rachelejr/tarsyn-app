'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  MapPin, Wallet, Repeat, FileText, UserPlus,
  ArrowRight, ArrowLeft, Check, CheckCircle2, Circle, Copy as CopyIcon, X,
} from 'lucide-react';

const C = {
  bordeaux:   '#6B2D4E',
  dore:       '#E9C77B',
  creme:      '#FBEEDD',
  roseClair:  '#EAD9BE',
  roseMoyen:  '#D9C0CC',
  texteFonce: '#4A1F38',
  texteGris:  '#6B2D4E',
};

const REGIONS = [
  { region: 'United States', flag: '\ud83c\uddfa\ud83c\uddf8', name: 'Sou-Sou / Rotating Savings' },
  { region: 'Canada', flag: '\ud83c\udde8\ud83c\udde6', name: 'Sou-Sou / Rotating Savings' },
  { region: 'United Kingdom', flag: '\ud83c\uddec\ud83c\udde7', name: 'Pardner' },
  { region: 'France', flag: '\ud83c\uddeb\ud83c\uddf7', name: 'Tontine' },
  { region: 'Belgium', flag: '\ud83c\udde7\ud83c\uddea', name: 'Tontine' },
  { region: 'Switzerland', flag: '\ud83c\udde8\ud83c\udded', name: 'Tontine' },
  { region: 'West Africa', flag: '\ud83c\udf0d', name: 'Tontine' },
  { region: 'Cameroon', flag: '\ud83c\udde8\ud83c\uddf2', name: 'Njangi' },
  { region: 'Congo (DRC)', flag: '\ud83c\udde8\ud83c\udde9', name: 'Likelemba' },
  { region: 'Ghana', flag: '\ud83c\uddec\ud83c\udded', name: 'Susu' },
  { region: 'Nigeria', flag: '\ud83c\uddf3\ud83c\uddec', name: 'Ajo / Esusu' },
  { region: 'Senegal', flag: '\ud83c\uddf8\ud83c\uddf3', name: 'Tontine' },
  { region: 'Ivory Coast', flag: '\ud83c\udde8\ud83c\uddee', name: 'Tontine' },
  { region: 'Kenya', flag: '\ud83c\uddf0\ud83c\uddea', name: 'Chama' },
  { region: 'Ethiopia', flag: '\ud83c\uddea\ud83c\uddf9', name: 'Iqub' },
  { region: 'Haiti', flag: '\ud83c\udded\ud83c\uddf9', name: 'Sol' },
  { region: 'Dominican Republic', flag: '\ud83c\udde9\ud83c\uddf4', name: 'San / Mutualidad' },
  { region: 'Jamaica', flag: '\ud83c\uddef\ud83c\uddf2', name: 'Partner' },
  { region: 'Trinidad & Tobago', flag: '\ud83c\uddf9\ud83c\uddf9', name: 'Sou-Sou' },
  { region: 'Barbados', flag: '\ud83c\udde7\ud83c\udde7', name: 'Meeting Turn' },
  { region: 'Guyana', flag: '\ud83c\uddec\ud83c\uddfe', name: 'Box Hand' },
  { region: 'Suriname', flag: '\ud83c\uddf8\ud83c\uddf7', name: 'Kasmoni' },
  { region: 'Cuba', flag: '\ud83c\udde8\ud83c\uddfa', name: 'Cundina' },
  { region: 'Puerto Rico', flag: '\ud83c\uddf5\ud83c\uddf7', name: 'Cundina' },
  { region: 'Guadeloupe', flag: '\ud83c\uddec\ud83c\uddf5', name: 'Sou-Sou' },
  { region: 'Martinique', flag: '\ud83c\uddf2\ud83c\uddf6', name: 'Sou-Sou' },
  { region: 'French Guiana', flag: '\ud83c\uddec\ud83c\uddeb', name: 'Sou-Sou' },
  { region: 'Mexico', flag: '\ud83c\uddf2\ud83c\uddfd', name: 'Tanda' },
  { region: 'Colombia', flag: '\ud83c\udde8\ud83c\uddf4', name: 'Natillera' },
  { region: 'Peru', flag: '\ud83c\uddf5\ud83c\uddea', name: 'Pandero' },
  { region: 'Bolivia', flag: '\ud83c\udde7\ud83c\uddf4', name: 'Pasanaku' },
  { region: 'India', flag: '\ud83c\uddee\ud83c\uddf3', name: 'Chit Fund' },
  { region: 'Philippines', flag: '\ud83c\uddf5\ud83c\udded', name: 'Paluwagan' },
  { region: 'Vietnam', flag: '\ud83c\uddfb\ud83c\uddf3', name: 'Hui' },
  { region: 'China', flag: '\ud83c\udde8\ud83c\uddf3', name: 'Hui' },
  { region: 'South Korea', flag: '\ud83c\uddf0\ud83c\uddf7', name: 'Gye' },
  { region: 'Japan', flag: '\ud83c\uddef\ud83c\uddf5', name: 'Ko' },
  { region: 'Other / General', flag: '\ud83c\udf0d', name: 'Rotating Savings' },
];

const CURRENCIES = [
  { code: 'USD', label: 'USD \u2014 US Dollar' },
  { code: 'HTG', label: 'HTG \u2014 Haitian Gourde' },
  { code: 'EUR', label: 'EUR \u2014 Euro' },
  { code: 'CAD', label: 'CAD \u2014 Canadian Dollar' },
  { code: 'GBP', label: 'GBP \u2014 British Pound' },
  { code: 'XOF', label: 'XOF \u2014 CFA Franc' },
  { code: 'NGN', label: 'NGN \u2014 Nigerian Naira' },
  { code: 'GHS', label: 'GHS \u2014 Ghanaian Cedi' },
  { code: 'INR', label: 'INR \u2014 Indian Rupee' },
  { code: 'MXN', label: 'MXN \u2014 Mexican Peso' },
  { code: 'PHP', label: 'PHP \u2014 Philippine Peso' },
  { code: 'DOP', label: 'DOP \u2014 Dominican Peso' },
  { code: 'TTD', label: 'TTD \u2014 T&T Dollar' },
  { code: 'JMD', label: 'JMD \u2014 Jamaican Dollar' },
  { code: 'BTC', label: 'BTC \u2014 Bitcoin' },
  { code: 'ETH', label: 'ETH \u2014 Ethereum' },
  { code: 'USDT', label: 'USDT \u2014 Tether (Optional Premium)' },
  { code: 'USDC', label: 'USDC \u2014 USD Coin (Optional Premium)' },
];

const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Bi-annual', 'Annual'];
const COMMISSIONS = ['0.5%', '1%', '1.5%', '2%'];
const ROTATION_TYPES = ['Fixed', 'Random', 'Admin Managed'];
const PAYMENT_METHODS = ['Cash', 'Transfer', 'Mobile Money', 'CashApp', 'Zelle', 'Mixed'];
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
const LANGUAGES = [
  'English', 'French', 'Spanish', 'Portuguese', 'Arabic', 'Haitian Creole',
  'Wolof', 'Bambara', 'Fula (Fulani)', 'Hausa', 'Yoruba', 'Igbo', 'Twi',
  'Lingala', 'Swahili', 'Amharic', 'Somali', 'Kinyarwanda', 'Zulu', 'Xhosa',
  'Hindi', 'Other',
];
const DEPOSIT_MODES = ['No Deposit', 'Optional Deposit', 'Mandatory Deposit'];
const DEPOSIT_MULTIPLIERS = ['1\u00d7 Contribution', '2\u00d7 Contribution', 'Custom Amount'];
const REFUND_POLICIES = ['Refundable at cycle end', 'Non-refundable', 'Refundable if no defaults'];

const frequencyMonths: Record<string, number> = {
  'Weekly': 0.25, 'Bi-weekly': 0.5, 'Monthly': 1,
  'Quarterly': 3, 'Bi-annual': 6, 'Annual': 12
};

const TABS = [
  { key: 'identity', label: 'Identity' },
  { key: 'finance', label: 'Finance' },
  { key: 'rotation', label: 'Rotation' },
  { key: 'rules', label: 'Rules & Privacy' },
  { key: 'invite', label: 'Invite' },
];

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: `1.5px solid #D9C0CC`, borderRadius: '12px',
  fontSize: '14px', color: '#4A1F38', background: '#FBEEDD',
  boxSizing: 'border-box', outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4A1F38', marginBottom: '8px', letterSpacing: '0.1px' }}>
      {label} {required && <span style={{ color: '#DC2626', fontSize: '12px' }}>*</span>}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FDFAF8', border: `1px solid ${C.roseClair}`, borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
      <p style={{ fontSize: '12px', fontWeight: '700', color: C.bordeaux, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 14px' }}>{title}</p>
      {children}
    </div>
  );
}

function SearchableSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="tarsyn-field"
        style={{ ...inp, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <span>{value}</span>
        <span style={{ color: C.texteGris, fontSize: '11px' }}>{'\u25be'}</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: `1.5px solid ${C.roseMoyen}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(107,45,78,0.18)', zIndex: 30, maxHeight: '240px', display: 'flex', flexDirection: 'column' }}>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search language..."
            style={{ border: 'none', borderBottom: `1px solid ${C.roseClair}`, padding: '10px 12px', fontSize: '13px', outline: 'none', flexShrink: 0 }} />
          <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
            {filtered.length === 0 && <div style={{ padding: '10px 12px', fontSize: '13px', color: C.texteGris }}>No match</div>}
            {filtered.map(o => (
              <div key={o} onClick={() => { onChange(o); setOpen(false); setQuery(''); }}
                style={{ padding: '9px 12px', fontSize: '13px', cursor: 'pointer', background: o === value ? C.roseClair : 'white', color: C.texteFonce }}
                onMouseEnter={e => (e.currentTarget.style.background = C.creme)}
                onMouseLeave={e => (e.currentTarget.style.background = o === value ? C.roseClair : 'white')}>
                {o}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateTontinePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('identity');
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
  const [commissionThreshold, setCommissionThreshold] = useState('');
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

  const [depositMode, setDepositMode] = useState('No Deposit');
  const [depositMultiplier, setDepositMultiplier] = useState('1\u00d7 Contribution');
  const [depositCustomAmount, setDepositCustomAmount] = useState('');
  const [refundPolicy, setRefundPolicy] = useState(REFUND_POLICIES[0]);

  const selectedRegion = REGIONS.find(r => r.region === region);
  const numM = parseInt(numMembers) || 0;
  const contrib = parseFloat(contribution) || 0;
  const totalPool = numM * contrib;
  const commissionRate = parseFloat(commission) / 100;
  const organizerRevenue = totalPool * commissionRate;
  const cycleDuration = numM * (frequencyMonths[frequency] || 1);
  const isFormValid = !!(region && customName.trim().length >= 2 && numMembers && parseInt(numMembers) >= 2 && contribution && parseFloat(contribution) > 0 && startDate && commissionThreshold && parseFloat(commissionThreshold) > 0);

  const tabCompletion: Record<string, boolean> = {
    identity: !!region && customName.trim().length >= 2,
    finance: !!numMembers && parseInt(numMembers) >= 2 && !!contribution && parseFloat(contribution) > 0 && !!startDate && !!commissionThreshold && parseFloat(commissionThreshold) > 0,
    rotation: true,
    rules: !!rules.trim(),
    invite: emailList.length > 0,
  };
  const currentStepIndex = TABS.findIndex(t => t.key === activeTab);
  const progressPercent = Math.round(((currentStepIndex + 1) / TABS.length) * 100);

  const depositAmount = depositMode === 'No Deposit'
    ? 0
    : depositMultiplier === '1\u00d7 Contribution' ? contrib
    : depositMultiplier === '2\u00d7 Contribution' ? contrib * 2
    : parseFloat(depositCustomAmount) || 0;

  const estimatedEndDate = (startDate && cycleDuration > 0)
    ? (() => {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + Math.round(cycleDuration));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      })()
    : '\u2014';

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
    if (!customName.trim() || customName.trim().length < 2) return setError('Tontine name is required.');
    if (!numMembers || parseInt(numMembers) < 2) return setError('Minimum 2 members required.');
    if (parseInt(numMembers) > 500) return setError('Maximum 500 members allowed.');
    if (!contribution || parseFloat(contribution) <= 0) return setError('Contribution amount must be greater than 0.');
    if (!startDate) return setError('Please choose a start date.');
    if (new Date(startDate) <= new Date()) return setError('Start date must be in the future.');
    if (!commissionThreshold || parseFloat(commissionThreshold) <= 0) return setError('Commission threshold amount is required.');
    setShowReview(true);
  };

  const handleSubmit = async () => {
    setShowReview(false);
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }

      const tontineCode = generateCode('TTN');
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      const inviteLink = `https://tarsyn-app.com/join/${inviteCode}`;

      const docRef = await addDoc(collection(db, 'groups'), {
        organizerId: user.uid,
        tontineCode, region,
        regionFlag: selectedRegion?.flag || '\ud83c\udf0d',
        regionalName: selectedRegion?.name || 'Rotating Savings',
        name: customName || selectedRegion?.name || 'Tontine',
        module: 'Tontine',
        numMembers: parseInt(numMembers),
        amountPerMember: parseFloat(contribution),
        contribution: parseFloat(contribution),
        currency, frequency, paymentFrequency: frequency,
        startDate, commission, commissionRate: parseFloat(commission),
        commissionThreshold: parseFloat(commissionThreshold),
        rotationType, paymentMethod, positionStrategy,
        privacyMode, adminVisibility,
        rulesTemplate, rules, confidential, language,
        depositMode, depositMultiplier, depositCustomAmount: depositCustomAmount ? parseFloat(depositCustomAmount) : null,
        refundPolicy, depositAmount,
        inviteCode, inviteLink,
        inviteEmails: emailList,
        estimatedPool: totalPool,
        estimatedDuration: cycleDuration,
        organizerRevenue,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: user.uid, category: 'Group',
          action: 'Created group',
          user: user.email || '', details: (customName || selectedRegion?.name || 'Tontine') + ' - ' + tontineCode,
          createdAt: serverTimestamp(),
        });
      } catch (auditErr) { /* silent - audit logging must never block group creation */ }

      // Emails entered at this step previously only triggered an email send
      // with a group-level invite code - no "members" document was ever
      // created for them, so the link could never actually be completed
      // (the join page looks up a member by invite code, and none existed).
      // Each invited email now gets a real pending member record with its
      // own invite code, exactly like the standard Add Member flow does.
      if (emailList.length > 0) {
        const memberInvites: { email: string; inviteCode: string }[] = [];
        for (let i = 0; i < emailList.length; i++) {
          const email = emailList[i];
          const memberInviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
          try {
            await addDoc(collection(db, 'members'), {
              organizerId: user.uid,
              groupId: docRef.id,
              email,
              fullName: '',
              tynId: `XX-${String(i + 1).padStart(3, '0')}`,
              position: i + 1,
              status: 'pending',
              role: 'member',
              expectedAmount: parseFloat(contribution) || 0,
              currency,
              payoutDate: '',
              inviteCode: memberInviteCode,
              source: 'group-creation-invite',
              createdAt: serverTimestamp(),
            });
            memberInvites.push({ email, inviteCode: memberInviteCode });
          } catch (memberErr) {
            console.error('Could not create pending member for', email, memberErr);
          }
        }

        await Promise.allSettled(memberInvites.map(m =>
          fetch('/api/send-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emails: [m.email],
              tontineName: customName || selectedRegion?.name,
              region, contribution, currency, frequency, startDate,
              inviteLink: `https://tarsyn-app.com/join/${m.inviteCode}`,
            }),
          })
        ));
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

  const sharedStyles = (
    <style jsx global>{`
      .tarsyn-field:focus {
        border-color: ${C.dore} !important;
        box-shadow: 0 0 0 3px rgba(233,199,123,0.20);
        background: white !important;
      }
      .tarsyn-btn { transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease; }
      .tarsyn-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 8px 22px rgba(107,45,78,0.25);
        filter: brightness(1.03);
      }
      .tarsyn-btn:active:not(:disabled) { transform: translateY(0); }
      .tarsyn-pill { transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.15s ease; }
      .tarsyn-pill:hover { transform: translateY(-1px); }
      .tarsyn-summary-value { transition: color 0.25s ease, font-size 0.25s ease; }
      .tarsyn-privacy-card { transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease; }
      .tarsyn-privacy-card:hover { transform: translateY(-1px); }
      .tarsyn-tab { transition: background 0.2s ease, color 0.2s ease; }
      @media (min-width: 769px) {
        .tarsyn-live-summary { position: sticky; top: 24px; }
      }
      @media (max-width: 768px) {
        .tarsyn-tontine-grid { grid-template-columns: 1fr !important; }
        .tarsyn-live-summary { position: relative !important; top: 0 !important; }
        .tarsyn-row-3 { grid-template-columns: 1fr !important; }
        .tarsyn-row-2 { grid-template-columns: 1fr !important; }
        .tarsyn-tabs { overflow-x: auto; }
      }
      @media (min-width: 769px) and (max-width: 1024px) {
        .tarsyn-tontine-grid { grid-template-columns: 1fr !important; }
        .tarsyn-live-summary { position: relative !important; top: 0 !important; }
      }
    `}</style>
  );

  if (savedGroup) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {sharedStyles}
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '520px', width: '100%', boxShadow: '0 12px 48px rgba(107,45,78,0.10), 0 2px 8px rgba(107,45,78,0.06)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle2 size={32} color={C.bordeaux} strokeWidth={2} />
        </div>
        <h2 style={{ color: C.bordeaux, fontSize: '26px', fontWeight: '800', margin: '0 0 8px' }}>Tontine Created</h2>
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
              <button className="tarsyn-btn" onClick={() => copyLink(savedGroup.inviteLink)}
                style={{ background: copied ? '#2E7D32' : C.bordeaux, color: 'white', border: 'none', borderRadius: '10px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {copied ? <Check size={13} /> : <CopyIcon size={13} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button className="tarsyn-btn" onClick={() => router.push('/dashboard/add-member')}
            style={{ background: C.dore, color: C.bordeaux, padding: '14px', borderRadius: '18px', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <UserPlus size={16} /> Invite Members
          </button>
          <button className="tarsyn-btn" onClick={() => router.push('/dashboard')}
            style={{ background: C.bordeaux, color: 'white', padding: '14px', borderRadius: '18px', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  if (showReview) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {sharedStyles}
      <div style={{ background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '500px', width: '100%', boxShadow: '0 12px 48px rgba(107,45,78,0.10), 0 2px 8px rgba(107,45,78,0.06)' }}>
        <h2 style={{ color: C.bordeaux, fontSize: '22px', fontWeight: '800', margin: '0 0 8px' }}>Review Your Tontine</h2>
        <p style={{ color: C.texteGris, fontSize: '14px', margin: '0 0 24px' }}>Please confirm before creating.</p>
        <div style={{ background: C.creme, borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          {[
            { label: 'Name', value: customName || selectedRegion?.name || 'Tontine' },
            { label: 'Region', value: region },
            { label: 'Members', value: numMembers },
            { label: 'Contribution', value: `${contribution} ${currency}` },
            { label: 'Frequency', value: frequency },
            { label: 'Initial Deposit', value: depositMode === 'No Deposit' ? 'None' : `${depositAmount.toFixed(2)} ${currency} (${depositMode})` },
            { label: 'Total Pool', value: `${totalPool} ${currency}` },
            { label: 'Your Revenue', value: `${organizerRevenue.toFixed(2)} ${currency}` },
            { label: 'Cycle Duration', value: `~${cycleDuration} months` },
            { label: 'Estimated End Date', value: estimatedEndDate },
            { label: 'Start Date', value: startDate },
            { label: 'Privacy', value: privacyMode },
            { label: 'Commission', value: `${commission} (from ${commissionThreshold} ${currency})` },
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
          <button className="tarsyn-btn" onClick={() => setShowReview(false)}
            style={{ flex: 1, background: C.creme, color: C.bordeaux, padding: '14px', borderRadius: '18px', border: `2px solid ${C.bordeaux}`, fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> Edit
          </button>
          <button className="tarsyn-btn" onClick={handleSubmit} disabled={saving}
            style={{ flex: 2, background: C.bordeaux, color: 'white', padding: '14px', borderRadius: '18px', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {saving ? 'Creating...' : <>Confirm & Create <Check size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, padding: '18px 16px' }}>
      {sharedStyles}
      <div className="tarsyn-tontine-grid" style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', alignItems: 'start' }}>

        <div>
          <div style={{ background: '#fff', borderRadius: '20px', border: `1px solid ${C.roseMoyen}`, boxShadow: '0 12px 48px rgba(107,45,78,0.08)', overflow: 'hidden' }}>

            <div style={{ background: `linear-gradient(135deg, ${C.bordeaux} 0%, #8B3A5E 100%)`, padding: '20px 28px' }}>
              <button className="tarsyn-btn" onClick={() => router.push('/dashboard')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dore, fontSize: '13px', fontWeight: '600', marginBottom: '10px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
              <h1 style={{ color: C.creme, fontSize: '22px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Create a Tontine</h1>
              <p style={{ color: C.roseClair, fontSize: '13px', margin: 0, opacity: 0.85 }}>Launch your community savings group in minutes</p>
            </div>

            <div className="tarsyn-tabs" style={{ display: 'flex', gap: '4px', padding: '10px 28px 0', borderBottom: `1px solid ${C.roseClair}` }}>
              {TABS.map(t => (
                <button key={t.key} className="tarsyn-tab" onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: activeTab === t.key ? '700' : '500',
                    color: activeTab === t.key ? C.bordeaux : C.texteGris,
                    borderBottom: activeTab === t.key ? `2px solid ${C.bordeaux}` : '2px solid transparent',
                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                  {tabCompletion[t.key] && <CheckCircle2 size={13} color={activeTab === t.key ? C.bordeaux : '#2E7D32'} />}
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 28px' }}>

              {activeTab === 'identity' && (
                <Card title="Region & Identity">
                  <div className="tarsyn-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <FieldLabel label="Region / Country" required />
                      <select className="tarsyn-field" value={region} onChange={e => setRegion(e.target.value)} style={inp}>
                        <option value="">{'\u2014' + ' Select a country or region ' + '\u2014'}</option>
                        {REGIONS.map(r => <option key={r.region} value={r.region}>{r.flag} {r.region} {'\u2014'} {r.name}</option>)}
                      </select>
                      {selectedRegion && (
                        <p style={{ marginTop: '6px', fontSize: '12px', color: C.bordeaux, background: C.roseClair, padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
                          Regional name: <strong>{selectedRegion.name}</strong>
                        </p>
                      )}
                    </div>
                    <div>
                      <FieldLabel label="Group Language" />
                      <SearchableSelect value={language} onChange={setLanguage} options={LANGUAGES} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel label="Tontine Name" required />
                    <input className="tarsyn-field" type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. My Sol 2026" style={inp} />
                  </div>
                </Card>
              )}

              {activeTab === 'finance' && (
                <>
                  <Card title="Financial Settings">
                    <div className="tarsyn-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <FieldLabel label="Number of Members" required />
                        <input className="tarsyn-field" type="number" value={numMembers} onChange={e => setNumMembers(e.target.value)} min={2} max={500} placeholder="e.g. 12" style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Contribution Amount" required />
                        <input className="tarsyn-field" type="number" value={contribution} onChange={e => setContribution(e.target.value)} min={1} placeholder="e.g. 200" style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Currency" />
                        <select className="tarsyn-field" value={currency} onChange={e => setCurrency(e.target.value)} style={inp}>
                          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="tarsyn-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <FieldLabel label="Start Date" required />
                        <input className="tarsyn-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                          min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Payment Frequency" />
                        <select className="tarsyn-field" value={frequency} onChange={e => setFrequency(e.target.value)} style={inp}>
                          {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>
                  </Card>

                  <Card title="Initial Deposit">
                    <p style={{ fontSize: '12px', color: C.texteGris, margin: '0 0 4px' }}>
                      Optional or required depending on admin settings and local practice.
                    </p>
                    <p style={{ fontSize: '11px', color: C.texteGris, margin: '0 0 12px', fontStyle: 'italic' }}>
                      Deposit may be mandatory depending on local practices.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: depositMode !== 'No Deposit' ? '16px' : 0, flexWrap: 'wrap' }}>
                      {DEPOSIT_MODES.map(d => (
                        <button key={d} className="tarsyn-pill" onClick={() => setDepositMode(d)}
                          style={{ padding: '8px 16px', borderRadius: '20px', border: `2px solid ${depositMode === d ? C.bordeaux : C.roseMoyen}`, background: depositMode === d ? C.bordeaux : 'white', color: depositMode === d ? 'white' : C.texteGris, cursor: 'pointer', fontSize: '13px' }}>
                          {d}
                        </button>
                      ))}
                    </div>
                    {depositMode !== 'No Deposit' && (
                      <div className="tarsyn-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div>
                          <FieldLabel label="Deposit Amount" />
                          <select className="tarsyn-field" value={depositMultiplier} onChange={e => setDepositMultiplier(e.target.value)} style={inp}>
                            {DEPOSIT_MULTIPLIERS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          {depositMultiplier === 'Custom Amount' && (
                            <input className="tarsyn-field" type="number" value={depositCustomAmount} onChange={e => setDepositCustomAmount(e.target.value)}
                              placeholder="e.g. 50" style={{ ...inp, marginTop: '8px' }} />
                          )}
                        </div>
                        <div>
                          <FieldLabel label="Refund Policy" />
                          <select className="tarsyn-field" value={refundPolicy} onChange={e => setRefundPolicy(e.target.value)} style={inp}>
                            {REFUND_POLICIES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <FieldLabel label="Computed Deposit" />
                          <div style={{ ...inp, background: C.creme, display: 'flex', alignItems: 'center', fontWeight: 700, color: C.bordeaux }}>
                            {depositAmount > 0 ? `${depositAmount.toFixed(2)} ${currency}` : '\u2014'}
                          </div>
                          {depositAmount === 0 && (
                            <p style={{ fontSize: '11px', color: '#DC2626', margin: '6px 0 0' }}>
                              Enter a contribution amount above to calculate the deposit.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>

                  <Card title="Organizer Commission">
                    <p style={{ fontSize: '12px', color: C.texteGris, margin: '0 0 12px' }}>
                      Required. Set the commission rate and the minimum pool amount it applies to.
                    </p>
                    <div className="tarsyn-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <FieldLabel label="Commission Rate" required />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {COMMISSIONS.map(c => (
                            <button key={c} className="tarsyn-pill" onClick={() => setCommission(c)}
                              style={{ flex: 1, padding: '9px 0', borderRadius: '12px', border: `2px solid ${commission === c ? C.bordeaux : C.roseMoyen}`, background: commission === c ? C.bordeaux : 'white', color: commission === c ? 'white' : C.texteGris, cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel label="Applies From (minimum pool amount)" required />
                        <input className="tarsyn-field" type="number" value={commissionThreshold} onChange={e => setCommissionThreshold(e.target.value)} min={1} placeholder={`e.g. 100 ${currency}`} style={inp} />
                        <p style={{ fontSize: '11px', color: C.texteGris, margin: '6px 0 0' }}>
                          Commission of {commission} is taken only once the total pool reaches this amount.
                        </p>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {activeTab === 'rotation' && (
                <>
                  <Card title="Rotation & Payment Settings">
                    <div className="tarsyn-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div>
                        <FieldLabel label="Rotation Type" />
                        <select className="tarsyn-field" value={rotationType} onChange={e => setRotationType(e.target.value)} style={inp}>
                          {ROTATION_TYPES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel label="Payment Method" />
                        <select className="tarsyn-field" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inp}>
                          {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel label="Position Strategy" />
                        <select className="tarsyn-field" value={positionStrategy} onChange={e => setPositionStrategy(e.target.value)} style={inp}>
                          {POSITION_STRATEGIES.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </Card>

                  <Card title="Position Preview">
                    {numM > 0 && startDate ? (
                      <div>
                        <p style={{ color: C.texteGris, fontSize: '12px', margin: '0 0 12px' }}>Rotation preview \u2014 {numMembers} members \u2014 {frequency}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {Array.from({ length: Math.min(numM, 6) }, (_, i) => {
                            const payoutDate = new Date(startDate);
                            payoutDate.setMonth(payoutDate.getMonth() + i * (frequencyMonths[frequency] || 1));
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: C.creme, borderRadius: '10px', padding: '10px 14px' }}>
                                <span style={{ background: C.bordeaux, color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>#{i + 1}</span>
                                <span style={{ color: C.texteFonce, fontSize: '13px', fontWeight: '600', flex: 1 }}>Member {i + 1}</span>
                                <span style={{ color: C.texteGris, fontSize: '12px' }}>{payoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            );
                          })}
                        </div>
                        {numM > 6 && <p style={{ color: C.texteGris, fontSize: '12px', textAlign: 'center', margin: '10px 0 0' }}>+{numM - 6} more members...</p>}
                      </div>
                    ) : (
                      <p style={{ color: C.texteGris, fontSize: '13px', margin: 0, textAlign: 'center' }}>Enter number of members and start date to see rotation preview.</p>
                    )}
                  </Card>
                </>
              )}

              {activeTab === 'rules' && (
                <>
                  <Card title="Rules">
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {RULES_TEMPLATES.map(t => (
                        <button key={t.label} className="tarsyn-pill" onClick={() => { setRulesTemplate(t.label); setRules(t.text); }}
                          style={{ padding: '6px 16px', borderRadius: '20px', border: `2px solid ${rulesTemplate === t.label ? C.bordeaux : C.roseMoyen}`, background: rulesTemplate === t.label ? C.bordeaux : 'white', color: rulesTemplate === t.label ? 'white' : C.texteGris, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <textarea className="tarsyn-field" value={rules} onChange={e => setRules(e.target.value)} rows={3}
                      placeholder="Group rules..." style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                  </Card>

                  <Card title="Privacy Mode">
                    <div className="tarsyn-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      {PRIVACY_MODES.map(p => {
                        const isActive = privacyMode === p.value;
                        return (
                          <button key={p.value} type="button" className="tarsyn-privacy-card" onClick={() => setPrivacyMode(p.value)}
                            style={{ border: `2px solid ${isActive ? C.bordeaux : C.roseMoyen}`, borderRadius: '12px', padding: '8px 12px', cursor: 'pointer', background: isActive ? C.roseClair : 'white', textAlign: 'left', font: 'inherit' }}>
                            <p style={{ color: C.bordeaux, fontWeight: '700', fontSize: '13px', margin: '0 0 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              {p.value}
                              {isActive && <CheckCircle2 size={13} color={C.bordeaux} />}
                            </p>
                            <p style={{ color: C.texteGris, fontSize: '10px', margin: 0 }}>{p.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" onClick={() => setConfidential(p => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', width: '100%', background: confidential ? C.roseClair : '#FDFAF8', border: `1.5px solid ${confidential ? C.bordeaux : C.roseMoyen}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${confidential ? C.bordeaux : C.roseMoyen}`, background: confidential ? C.bordeaux : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                        {confidential && <Check size={11} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: C.texteFonce }}>Confidential Mode (additional toggle)</div>
                        <div style={{ fontSize: '10px', color: C.texteGris, marginTop: '1px' }}>Members only see their TYN-ID, not each other's names \u2014 applies on top of the privacy mode above</div>
                      </div>
                    </button>
                  </Card>
                </>
              )}

              {activeTab === 'invite' && (
                <Card title="Invite Members">
                  <FieldLabel label="Invite by Email" />
                  <div style={{ background: C.creme, border: `1.5px dashed ${C.roseMoyen}`, borderRadius: '12px', padding: '12px' }}>
                    {emailList.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {emailList.map(email => (
                          <span key={email} style={{ background: C.roseClair, color: C.bordeaux, fontSize: '12px', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {email}
                            <button onClick={() => removeEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.bordeaux, padding: 0, display: 'flex', alignItems: 'center' }}>
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input className="tarsyn-field" type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addEmail()}
                        placeholder="e.g. member@gmail.com"
                        style={{ ...inp, flex: 1, background: 'white' }} />
                      <button className="tarsyn-btn" onClick={addEmail}
                        style={{ padding: '10px 16px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserPlus size={14} /> Add
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: C.texteGris, margin: '8px 0 0' }}>Press Enter or click Add</p>
                </Card>
              )}

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px', color: '#DC2626', fontSize: '14px', marginTop: '16px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TABS.map((t, i) => (
                    <span key={t.key} style={{ width: '6px', height: '6px', borderRadius: '50%', background: TABS.findIndex(x => x.key === activeTab) >= i ? C.bordeaux : '#E8DCC8' }} />
                  ))}
                </div>
                <button className="tarsyn-btn" onClick={handleReview} disabled={!isFormValid || saving}
                  style={{ padding: '13px 26px', background: !isFormValid ? '#E8DCC8' : C.bordeaux, color: !isFormValid ? '#9C8F78' : 'white', border: 'none', borderRadius: '18px', fontSize: '15px', fontWeight: '700', cursor: !isFormValid ? 'not-allowed' : 'pointer', boxShadow: !isFormValid ? 'none' : `0 4px 20px rgba(107,45,78,0.35)`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? 'Creating...' : <>Create Tontine <ArrowRight size={16} /></>}
                </button>
              </div>
              <p style={{ textAlign: 'right', fontSize: '12px', color: C.texteGris, marginTop: '10px', fontStyle: 'italic' }}>
                Your Community. Your Power.
              </p>
            </div>
          </div>
        </div>

        <div className="tarsyn-live-summary">
          <div style={{ background: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 8px 32px rgba(107,45,78,0.14), 0 2px 8px rgba(107,45,78,0.06)', border: `1px solid ${C.roseClair}` }}>
            <h3 style={{ color: C.bordeaux, fontSize: '15px', fontWeight: '800', margin: '0 0 10px', letterSpacing: '-0.1px' }}>Live Summary</h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.texteGris, marginBottom: '6px' }}>
                <span>Step {currentStepIndex + 1} of {TABS.length}</span>
                <span>{progressPercent}% completed</span>
              </div>
              <div style={{ height: '5px', background: '#E8DCC8', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: C.dore, borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {[
              { label: 'Group Name', value: customName || selectedRegion?.name || '\u2014' },
              { label: 'Members', value: numMembers || '\u2014' },
              { label: 'Contribution', value: contribution ? `${contribution} ${currency}` : '\u2014', gold: true },
              { label: 'Frequency', value: frequency },
              ...(depositMode !== 'No Deposit' ? [{ label: 'Initial Deposit', value: depositAmount > 0 ? `${depositAmount.toFixed(2)} ${currency}` : '\u2014' }] : []),
              { label: 'Total Pool', value: totalPool > 0 ? `${totalPool} ${currency}` : '\u2014', gold: true },
              { label: 'Organizer Revenue', value: organizerRevenue > 0 ? `${organizerRevenue.toFixed(2)} ${currency}` : '\u2014', gold: true },
              { label: 'Start Date', value: startDate || '\u2014' },
              { label: 'Estimated End Date', value: estimatedEndDate },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.roseClair}` }}>
                <span style={{ color: C.texteGris, fontSize: '12px' }}>{item.label}</span>
                <span className="tarsyn-summary-value" style={{ color: (item as any).gold ? C.dore : C.texteFonce, fontWeight: (item as any).gold ? '800' : '600', fontSize: '12px' }}>{item.value}</span>
              </div>
            ))}
            {totalPool > 0 && (
              <div style={{ marginTop: '14px', background: `linear-gradient(135deg, ${C.bordeaux}, #8B3A5E)`, borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <p style={{ color: C.roseClair, fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL POOL</p>
                <p className="tarsyn-summary-value" style={{ color: C.dore, fontSize: '22px', fontWeight: '800', margin: '0' }}>{totalPool} {currency}</p>
              </div>
            )}
            <div style={{ marginTop: '14px' }}>
              <p style={{ color: C.texteGris, fontSize: '11px', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Required fields</p>
              {[
                { label: 'Region', done: !!region },
                { label: 'Members (min 2)', done: parseInt(numMembers) >= 2 },
                { label: 'Contribution > 0', done: parseFloat(contribution) > 0 },
                { label: 'Future Start Date', done: !!startDate && new Date(startDate) > new Date() },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  {f.done ? <CheckCircle2 size={13} color="#2E7D32" /> : <Circle size={13} color={C.texteGris} />}
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
