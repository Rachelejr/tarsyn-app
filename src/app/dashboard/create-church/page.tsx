'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  ArrowRight, ArrowLeft, Check, CheckCircle2, Circle, X, Plus,
} from 'lucide-react';

// ── CHURCH MODULE V2.0 — OFFICIAL VISUAL IDENTITY (Approved Direction) ──
const C = {
  primary:    '#8C72C4',
  secondary:  '#BFA8E8',
  accent:     '#E7D7FF',
  bg:         '#F7F5FC',
  cardBg:     '#FFFFFF',
  borderSoft: '#E7D7FF',
  borderMed:  '#CBB6EC',
  textDark:   '#2C2440',
  textGris:   '#7A6F94',
  success:    '#5A8A6E',
  danger:     '#A14444',
};

const DENOMINATIONS = [
  'Non-denominational', 'Baptist', 'Catholic', 'Pentecostal', 'Methodist',
  'Evangelical', 'Orthodox', 'Lutheran', 'Presbyterian', 'Seventh-day Adventist',
  'Church of Christ', 'Anglican', 'Other',
];
const LANGUAGES = ['English', 'French', 'Spanish', 'Haitian Creole', 'Portuguese', 'Arabic', 'Other'];
const CHURCH_TYPES = ['Single Campus', 'Multi Campus'];

const ACTIVITY_TYPES = [
  'Prayer', 'Conference', 'Revival', 'Youth', 'Wedding', 'Baptism', 'Funeral', 'Classes', 'Retreat',
];
const ATTENDANCE_METHODS = ['Manual', 'QR', 'Badge Scan', 'Mobile', 'Visitor Registration'];

const DEPARTMENTS = [
  'Choir', 'Children', 'Youth', 'Women', 'Men', 'Prayer', 'Media', 'Finance',
  'Hospitality', 'Protocol', 'Security', 'Education', 'Missions', 'Healthcare',
  'Technology', 'Counseling', 'Administration',
];

const MEMBERSHIP_MODES = [
  { value: 'Open', desc: 'Anyone can join freely' },
  { value: 'Invite Only', desc: 'Join by invitation only' },
  { value: 'Approval Required', desc: 'Leadership reviews each request' },
];

const CURRENCIES = ['USD', 'HTG', 'EUR', 'CAD', 'GBP', 'XOF'];

const STAFF_ROLES = ['Lead Pastor', 'Associate Pastor', 'Deacon', 'Elder', 'Administrator', 'Employee', 'Volunteer Coordinator'];

const TABS = [
  { key: 'identity', label: 'Identity' },
  { key: 'branding', label: 'Branding' },
  { key: 'services', label: 'Services & Events' },
  { key: 'ministries', label: 'Ministries' },
  { key: 'finance', label: 'Membership & Finance' },
  { key: 'leadership', label: 'Leadership & HR' },
];

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: `1.5px solid ${C.borderMed}`, borderRadius: '12px',
  fontSize: '14px', color: C.textDark, background: C.bg,
  boxSizing: 'border-box', outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.textDark, marginBottom: '8px' }}>
      {label} {required && <span style={{ color: C.danger, fontSize: '12px' }}>*</span>}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.borderSoft}`, borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 14px' }}>{title}</p>
      {children}
    </div>
  );
}

function ImageUploadSlot({
  label, value, onChange, shape = 'square',
}: { label: string; value: string | null; onChange: (dataUrl: string | null) => void; shape?: 'square' | 'circle' }) {
  const handleFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <div style={{
        width: '100%', aspectRatio: shape === 'circle' ? '1' : '16/7', maxWidth: shape === 'circle' ? '90px' : '100%',
        borderRadius: shape === 'circle' ? '50%' : '12px',
        background: C.bg, border: `2px dashed ${C.borderMed}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '8px',
      }}>
        {value
          ? <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: C.textGris, fontSize: '11px', textAlign: 'center', padding: '4px' }}>No {label.toLowerCase()}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label className="church-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'white', border: `1.5px solid ${C.borderMed}`, borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: C.primary, cursor: 'pointer' }}>
          <Plus size={12} /> {value ? 'Change' : 'Upload'}
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] || null)} />
        </label>
        {value && (
          <button onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: C.textGris, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>
            Remove
          </button>
        )}
      </div>
      <p style={{ fontSize: '10px', color: C.textGris, margin: '6px 0 0' }}>{label} — PNG, JPG, SVG. Max 5MB.</p>
    </div>
  );
}

export default function CreateChurchPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any>(null);
  const [error, setError] = useState('');

  // STEP 1 — IDENTITY
  const [churchName, setChurchName] = useState('');
  const [shortName, setShortName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [denomination, setDenomination] = useState('Non-denominational');
  const [primaryLanguage, setPrimaryLanguage] = useState('English');
  const [secondaryLanguage, setSecondaryLanguage] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [description, setDescription] = useState('');
  const [foundedDate, setFoundedDate] = useState('');
  const [churchType, setChurchType] = useState('Single Campus');
  const [estimatedMembers, setEstimatedMembers] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('');

  // BRANDING
  const [logo, setLogo] = useState<string | null>(null);
  const [seal, setSeal] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [headerImg, setHeaderImg] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [logoSettings, setLogoSettings] = useState<Record<string, boolean>>({
    'Show on Dashboard': true, 'Show on Reports': true, 'Show on Certificates': true,
    'Show on Badge': true, 'Show on Attendance': false, 'Show on PDFs': true,
  });
  const toggleLogoSetting = (k: string) => setLogoSettings(prev => ({ ...prev, [k]: !prev[k] }));

  // STEP 2 — SERVICES & EVENTS
  const [services, setServices] = useState<{ day: string; start: string; end: string; room: string }[]>([]);
  const [serviceDay, setServiceDay] = useState('Sunday');
  const [serviceStart, setServiceStart] = useState('');
  const [serviceEnd, setServiceEnd] = useState('');
  const [serviceRoom, setServiceRoom] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [attendanceMethods, setAttendanceMethods] = useState<string[]>(['Manual']);

  const addService = () => {
    if (!serviceStart) return;
    setServices(prev => [...prev, { day: serviceDay, start: serviceStart, end: serviceEnd, room: serviceRoom }]);
    setServiceStart(''); setServiceEnd(''); setServiceRoom('');
  };
  const removeService = (i: number) => setServices(prev => prev.filter((_, idx) => idx !== i));
  const toggleActivity = (a: string) => setActivities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const toggleAttendanceMethod = (m: string) => setAttendanceMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  // STEP 3 — MINISTRIES
  const [departments, setDepartments] = useState<string[]>([]);
  const [customDept, setCustomDept] = useState('');
  const toggleDept = (d: string) => setDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const addCustomDept = () => {
    const v = customDept.trim();
    if (v && !departments.includes(v)) { setDepartments(prev => [...prev, v]); setCustomDept(''); }
  };

  // STEP 4 — MEMBERSHIP + FINANCE
  const [membershipMode, setMembershipMode] = useState('Open');
  const [currency, setCurrency] = useState('USD');
  const [budgetTracking, setBudgetTracking] = useState(true);
  const [fiscalYearStart, setFiscalYearStart] = useState('January');
  const [incomeCategories, setIncomeCategories] = useState<string[]>(['Tithe', 'Offering']);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Salary', 'Utilities']);
  const INCOME_OPTIONS = ['Tithe', 'Offering', 'Donation', 'Campaign', 'Promise', 'Event Revenue'];
  const EXPENSE_OPTIONS = ['Salary', 'Utilities', 'Maintenance', 'Mission', 'Supplies'];
  const toggleIncome = (v: string) => setIncomeCategories(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleExpense = (v: string) => setExpenseCategories(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  // STEP 5 — LEADERSHIP + HR
  const [leadPastor, setLeadPastor] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [staff, setStaff] = useState<{ name: string; role: string }[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState(STAFF_ROLES[1]);
  const addStaff = () => {
    if (!staffName.trim()) return;
    setStaff(prev => [...prev, { name: staffName.trim(), role: staffRole }]);
    setStaffName('');
  };
  const removeStaff = (i: number) => setStaff(prev => prev.filter((_, idx) => idx !== i));

  const tabCompletion: Record<string, boolean> = {
    identity: churchName.trim().length >= 2 && !!country,
    branding: !!logo,
    services: services.length > 0,
    ministries: departments.length > 0,
    finance: !!membershipMode,
    leadership: leadPastor.trim().length > 0,
  };
  const currentStepIndex = TABS.findIndex(t => t.key === activeTab);
  const progressPercent = Math.round(((currentStepIndex + 1) / TABS.length) * 100);
  const isFormValid = churchName.trim().length >= 2 && !!country && services.length > 0 && leadPastor.trim().length > 0;

  const handleCreate = async () => {
    setError('');
    if (!churchName.trim() || churchName.trim().length < 2) return setError('Church name is required.');
    if (!country) return setError('Country is required.');
    if (services.length === 0) return setError('Add at least one worship service.');
    if (!leadPastor.trim()) return setError('Lead Pastor / Leader name is required.');

    setSaving(true);
    try {
      const code = `CHU-${Date.now().toString().slice(-6)}`;
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      await addDoc(collection(db, 'churches'), {
        churchName: churchName.trim(), shortName, legalName, registrationNumber, taxId,
        code, denomination, primaryLanguage, secondaryLanguage, country, region, city, address, zipCode,
        description: description.trim(), foundedDate, churchType, estimatedMembers, seatingCapacity,
        branding: { logo, seal, cover, headerImg, signature, logoSettings },
        services, activities, attendanceMethods,
        departments,
        membershipMode, currency, budgetTracking, fiscalYearStart, incomeCategories, expenseCategories,
        leadPastor: leadPastor.trim(), adminEmail: adminEmail.trim(), staff,
        inviteCode,
        status: 'active',
        createdAt: serverTimestamp(),
      });
      setSaved({ churchName, code, inviteCode });
    } catch (e) {
      console.error(e);
      setError('Error creating church. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sharedStyles = (
    <style jsx global>{`
      .church-field:focus {
        border-color: ${C.primary} !important;
        box-shadow: 0 0 0 3px rgba(140,114,196,0.18);
        background: white !important;
      }
      .church-btn { transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease; }
      .church-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(140,114,196,0.25); filter: brightness(1.03); }
      .church-btn:active:not(:disabled) { transform: translateY(0); }
      .church-pill { transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.15s ease; }
      .church-pill:hover { transform: translateY(-1px); }
      .church-tab { transition: background 0.2s ease, color 0.2s ease; }
      @media (min-width: 769px) { .church-summary { position: sticky; top: 24px; } }
      @media (max-width: 768px) {
        .church-grid { grid-template-columns: 1fr !important; }
        .church-summary { position: relative !important; top: 0 !important; }
        .church-row-2 { grid-template-columns: 1fr !important; }
        .church-row-3 { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );

  if (saved) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {sharedStyles}
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '480px', width: '100%', boxShadow: '0 12px 48px rgba(140,114,196,0.18)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle2 size={32} color={C.primary} strokeWidth={2} />
        </div>
        <h2 style={{ color: C.primary, fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>Church Created</h2>
        <p style={{ color: C.textGris, fontSize: '14px', margin: '0 0 24px' }}>{saved.churchName}</p>
        <div style={{ background: C.bg, borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: `1px solid ${C.borderSoft}` }}>
            <span style={{ color: C.textGris, fontSize: '13px' }}>Church Code</span>
            <span style={{ color: C.primary, fontWeight: 700, fontSize: '13px', fontFamily: 'monospace' }}>{saved.code}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: C.textGris, fontSize: '13px' }}>Invite Code</span>
            <span style={{ color: C.primary, fontWeight: 700, fontSize: '13px', fontFamily: 'monospace' }}>{saved.inviteCode}</span>
          </div>
        </div>
        <button className="church-btn" onClick={() => router.push('/dashboard')}
          style={{ width: '100%', background: C.primary, color: 'white', padding: '14px', borderRadius: '18px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          Dashboard <ArrowRight size={16} />
        </button>
        <p style={{ fontSize: '11px', color: C.textGris, marginTop: '16px' }}>
          Badge Center, full HR, and detailed accounting are configured next, inside the Church module.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '18px 16px' }}>
      {sharedStyles}
      <div className="church-grid" style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', alignItems: 'start' }}>

        <div>
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.primary}, ${C.secondary}, ${C.accent})`, borderRadius: '2px 2px 0 0' }} />
          <div style={{ background: '#fff', borderRadius: '0 0 20px 20px', border: `1px solid ${C.borderMed}`, borderTop: 'none', boxShadow: '0 12px 48px rgba(140,114,196,0.10)', overflow: 'hidden' }}>

            <div style={{ background: `linear-gradient(150deg, ${C.primary} 0%, ${C.secondary} 100%)`, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <button className="church-btn" onClick={() => router.push('/dashboard')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, fontSize: '13px', fontWeight: 600, marginBottom: '10px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowLeft size={14} /> Back to Dashboard
                </button>
                <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.3px' }}>{churchName || 'Create a Church'}</h1>
                <p style={{ color: '#F3EEFC', fontSize: '13px', margin: 0, opacity: 0.9 }}>Church Management System — Step {currentStepIndex + 1} of {TABS.length}</p>
              </div>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {logo
                  ? <img src={logo} alt="Church logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'white', fontWeight: 800, fontSize: '18px' }}>{(churchName || 'C').charAt(0).toUpperCase()}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', padding: '10px 28px 0', borderBottom: `1px solid ${C.borderSoft}`, overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t.key} className="church-tab" onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: activeTab === t.key ? 700 : 500,
                    color: activeTab === t.key ? C.primary : C.textGris,
                    borderBottom: activeTab === t.key ? `2px solid ${C.primary}` : '2px solid transparent',
                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                  {tabCompletion[t.key] && <CheckCircle2 size={13} color={activeTab === t.key ? C.primary : C.success} />}
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 28px' }}>

              {activeTab === 'identity' && (
                <>
                  <Card title="General Information">
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <FieldLabel label="Church Name" required />
                        <input className="church-field" value={churchName} onChange={e => setChurchName(e.target.value)} placeholder="e.g. New Hope Baptist Church" style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Short Name" />
                        <input className="church-field" value={shortName} onChange={e => setShortName(e.target.value)} placeholder="e.g. NHBC" style={inp} />
                      </div>
                    </div>
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <FieldLabel label="Legal Name" />
                        <input className="church-field" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Full legal entity name" style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Denomination" />
                        <select className="church-field" value={denomination} onChange={e => setDenomination(e.target.value)} style={inp}>
                          {DENOMINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <FieldLabel label="Registration Number" />
                        <input className="church-field" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Tax ID" />
                        <input className="church-field" value={taxId} onChange={e => setTaxId(e.target.value)} style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Founded Date" />
                        <input className="church-field" type="date" value={foundedDate} onChange={e => setFoundedDate(e.target.value)} style={inp} />
                      </div>
                    </div>
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <FieldLabel label="Primary Language" />
                        <select className="church-field" value={primaryLanguage} onChange={e => setPrimaryLanguage(e.target.value)} style={inp}>
                          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel label="Secondary Language (optional)" />
                        <select className="church-field" value={secondaryLanguage} onChange={e => setSecondaryLanguage(e.target.value)} style={inp}>
                          <option value="">—</option>
                          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                  </Card>

                  <Card title="Location">
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <FieldLabel label="Country" required />
                        <input className="church-field" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. United States" style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Region / State" />
                        <input className="church-field" value={region} onChange={e => setRegion(e.target.value)} style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="City" />
                        <input className="church-field" value={city} onChange={e => setCity(e.target.value)} style={inp} />
                      </div>
                    </div>
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                      <div>
                        <FieldLabel label="Address" />
                        <input className="church-field" value={address} onChange={e => setAddress(e.target.value)} style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="ZIP Code" />
                        <input className="church-field" value={zipCode} onChange={e => setZipCode(e.target.value)} style={inp} />
                      </div>
                    </div>
                  </Card>

                  <Card title="Profile">
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <FieldLabel label="Church Type" />
                        <select className="church-field" value={churchType} onChange={e => setChurchType(e.target.value)} style={inp}>
                          {CHURCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel label="Estimated Members" />
                        <input className="church-field" type="number" value={estimatedMembers} onChange={e => setEstimatedMembers(e.target.value)} min={0} style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Seating Capacity" />
                        <input className="church-field" type="number" value={seatingCapacity} onChange={e => setSeatingCapacity(e.target.value)} min={0} style={inp} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel label="Description (optional)" />
                      <textarea className="church-field" value={description} onChange={e => setDescription(e.target.value.slice(0, 280))} rows={3}
                        placeholder="A few words about your congregation..." style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                  </Card>
                </>
              )}

              {activeTab === 'branding' && (
                <>
                  <Card title="Church Branding">
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px', alignItems: 'start' }}>
                      <ImageUploadSlot label="Logo" value={logo} onChange={setLogo} shape="circle" />
                      <div>
                        <h2 style={{ color: C.primary, fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>{churchName || 'Your Church Name'}</h2>
                        <p style={{ color: C.textGris, fontSize: '13px', margin: 0 }}>{denomination} · {country || 'Country'}</p>
                      </div>
                    </div>
                  </Card>

                  <Card title="Identity Assets">
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <ImageUploadSlot label="Seal" value={seal} onChange={setSeal} />
                      <ImageUploadSlot label="Cover" value={cover} onChange={setCover} />
                      <ImageUploadSlot label="Header" value={headerImg} onChange={setHeaderImg} />
                    </div>
                    <div style={{ marginTop: '16px', maxWidth: '300px' }}>
                      <ImageUploadSlot label="Signature" value={signature} onChange={setSignature} />
                    </div>
                  </Card>

                  <Card title="Logo Usage Settings">
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      {Object.keys(logoSettings).map(k => (
                        <div key={k} onClick={() => toggleLogoSetting(k)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: logoSettings[k] ? C.accent : '#FBFAFD', border: `1.5px solid ${logoSettings[k] ? C.primary : C.borderMed}`, borderRadius: '10px', cursor: 'pointer' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${logoSettings[k] ? C.primary : C.borderMed}`, background: logoSettings[k] ? C.primary : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                            {logoSettings[k] && <Check size={11} />}
                          </div>
                          <span style={{ fontSize: '12px', color: C.textDark, fontWeight: 600 }}>{k}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}

              {activeTab === 'services' && (
                <>
                  <Card title="Worship Schedule">
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '14px', alignItems: 'end' }}>
                      <div>
                        <FieldLabel label="Day" />
                        <select className="church-field" value={serviceDay} onChange={e => setServiceDay(e.target.value)} style={inp}>
                          {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel label="Start" />
                        <input className="church-field" type="time" value={serviceStart} onChange={e => setServiceStart(e.target.value)} style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="End" />
                        <input className="church-field" type="time" value={serviceEnd} onChange={e => setServiceEnd(e.target.value)} style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Room" />
                        <input className="church-field" value={serviceRoom} onChange={e => setServiceRoom(e.target.value)} placeholder="Main Hall" style={inp} />
                      </div>
                    </div>
                    <button className="church-btn" onClick={addService}
                      style={{ padding: '9px 16px', background: C.primary, color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                      <Plus size={14} /> Add Service
                    </button>
                    {services.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {services.map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg, borderRadius: '10px', padding: '8px 12px' }}>
                            <span style={{ fontSize: '13px', color: C.textDark, fontWeight: 600 }}>{s.day} — {s.start}{s.end && ` to ${s.end}`} {s.room && `(${s.room})`}</span>
                            <button onClick={() => removeService(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textGris }}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card title="Activities">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {ACTIVITY_TYPES.map(a => (
                        <button key={a} className="church-pill" onClick={() => toggleActivity(a)}
                          style={{ padding: '8px 14px', borderRadius: '20px', border: `2px solid ${activities.includes(a) ? C.primary : C.borderMed}`, background: activities.includes(a) ? C.primary : 'white', color: activities.includes(a) ? 'white' : C.textGris, cursor: 'pointer', fontSize: '13px' }}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card title="Attendance Tracking">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {ATTENDANCE_METHODS.map(m => (
                        <button key={m} className="church-pill" onClick={() => toggleAttendanceMethod(m)}
                          style={{ padding: '8px 14px', borderRadius: '20px', border: `2px solid ${attendanceMethods.includes(m) ? C.primary : C.borderMed}`, background: attendanceMethods.includes(m) ? C.primary : 'white', color: attendanceMethods.includes(m) ? 'white' : C.textGris, cursor: 'pointer', fontSize: '13px' }}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: C.textGris, margin: '10px 0 0' }}>Badge Scan attendance is configured in the Badge Center after church creation.</p>
                  </Card>
                </>
              )}

              {activeTab === 'ministries' && (
                <Card title="Ministries & Departments">
                  <p style={{ fontSize: '12px', color: C.textGris, margin: '0 0 12px' }}>Select all that apply, or add a custom department.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {DEPARTMENTS.map(d => (
                      <button key={d} className="church-pill" onClick={() => toggleDept(d)}
                        style={{ padding: '8px 14px', borderRadius: '20px', border: `2px solid ${departments.includes(d) ? C.primary : C.borderMed}`, background: departments.includes(d) ? C.primary : 'white', color: departments.includes(d) ? 'white' : C.textGris, cursor: 'pointer', fontSize: '13px' }}>
                        {d}
                      </button>
                    ))}
                    {departments.filter(d => !DEPARTMENTS.includes(d)).map(d => (
                      <button key={d} className="church-pill" onClick={() => toggleDept(d)}
                        style={{ padding: '8px 14px', borderRadius: '20px', border: `2px solid ${C.secondary}`, background: C.secondary, color: 'white', cursor: 'pointer', fontSize: '13px' }}>
                        {d} ×
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="church-field" value={customDept} onChange={e => setCustomDept(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomDept()}
                      placeholder="Add a custom department..." style={inp} />
                    <button className="church-btn" onClick={addCustomDept}
                      style={{ padding: '11px 18px', background: C.secondary, color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Add
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: C.textGris, margin: '12px 0 0' }}>Each department gets its own leader, volunteers, budget, calendar, and reports once configured inside the module.</p>
                </Card>
              )}

              {activeTab === 'finance' && (
                <>
                  <Card title="Membership Mode">
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {MEMBERSHIP_MODES.map(m => (
                        <div key={m.value} className="church-pill" onClick={() => setMembershipMode(m.value)}
                          style={{ border: `2px solid ${membershipMode === m.value ? C.primary : C.borderMed}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', background: membershipMode === m.value ? C.accent : 'white' }}>
                          <p style={{ color: C.primary, fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{m.value}</p>
                          <p style={{ color: C.textGris, fontSize: '11px', margin: 0 }}>{m.desc}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Finance Settings">
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                      <div>
                        <FieldLabel label="Currency" />
                        <select className="church-field" value={currency} onChange={e => setCurrency(e.target.value)} style={inp}>
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel label="Fiscal Year Start" />
                        <select className="church-field" value={fiscalYearStart} onChange={e => setFiscalYearStart(e.target.value)} style={inp}>
                          {['January','April','July','October'].map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                      <div>
                        <FieldLabel label="Income Categories" />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {INCOME_OPTIONS.map(v => (
                            <button key={v} className="church-pill" onClick={() => toggleIncome(v)}
                              style={{ padding: '6px 12px', borderRadius: '16px', border: `1.5px solid ${incomeCategories.includes(v) ? C.primary : C.borderMed}`, background: incomeCategories.includes(v) ? C.primary : 'white', color: incomeCategories.includes(v) ? 'white' : C.textGris, cursor: 'pointer', fontSize: '12px' }}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel label="Expense Categories" />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {EXPENSE_OPTIONS.map(v => (
                            <button key={v} className="church-pill" onClick={() => toggleExpense(v)}
                              style={{ padding: '6px 12px', borderRadius: '16px', border: `1.5px solid ${expenseCategories.includes(v) ? C.primary : C.borderMed}`, background: expenseCategories.includes(v) ? C.primary : 'white', color: expenseCategories.includes(v) ? 'white' : C.textGris, cursor: 'pointer', fontSize: '12px' }}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div onClick={() => setBudgetTracking(p => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: budgetTracking ? C.accent : '#FBFAFD', border: `1.5px solid ${budgetTracking ? C.primary : C.borderMed}`, borderRadius: '12px', cursor: 'pointer' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${budgetTracking ? C.primary : C.borderMed}`, background: budgetTracking ? C.primary : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                        {budgetTracking && <Check size={12} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textDark }}>Enable Individual Member Budget Tracking</div>
                        <div style={{ fontSize: '11px', color: C.textGris, marginTop: '2px' }}>Goals, history, and contribution reports per member — configured after creation.</div>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {activeTab === 'leadership' && (
                <>
                  <Card title="Leadership">
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <FieldLabel label="Lead Pastor / Leader Name" required />
                        <input className="church-field" value={leadPastor} onChange={e => setLeadPastor(e.target.value)} placeholder="e.g. Pastor John Smith" style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Admin Contact Email" />
                        <input className="church-field" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@church.org" style={inp} />
                      </div>
                    </div>
                  </Card>

                  <Card title="Staff & HR (initial list)">
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '14px', alignItems: 'end' }}>
                      <div>
                        <FieldLabel label="Name" />
                        <input className="church-field" value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Full name" style={inp} />
                      </div>
                      <div>
                        <FieldLabel label="Role" />
                        <select className="church-field" value={staffRole} onChange={e => setStaffRole(e.target.value)} style={inp}>
                          {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <button className="church-btn" onClick={addStaff}
                        style={{ padding: '11px 18px', background: C.primary, color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', height: '44px' }}>
                        <Plus size={14} />
                      </button>
                    </div>
                    {staff.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {staff.map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg, borderRadius: '10px', padding: '8px 12px' }}>
                            <span style={{ fontSize: '13px', color: C.textDark, fontWeight: 600 }}>{s.name} — {s.role}</span>
                            <button onClick={() => removeStaff(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textGris }}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p style={{ fontSize: '11px', color: C.textGris, margin: '12px 0 0' }}>
                      Contracts, payroll, leave, schedules, and org chart are managed in the full HR section after creation.
                    </p>
                  </Card>
                </>
              )}

              {error && (
                <div style={{ background: '#FBEDED', border: '1px solid #E8C5C5', borderRadius: '12px', padding: '12px 16px', color: C.danger, fontSize: '14px', marginTop: '16px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TABS.map((t, i) => (
                    <span key={t.key} style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentStepIndex >= i ? C.primary : C.borderSoft }} />
                  ))}
                </div>
                <button className="church-btn" onClick={handleCreate} disabled={!isFormValid || saving}
                  style={{ padding: '13px 26px', background: !isFormValid ? C.borderSoft : C.primary, color: !isFormValid ? '#9C8FB5' : 'white', border: 'none', borderRadius: '18px', fontSize: '15px', fontWeight: 700, cursor: !isFormValid ? 'not-allowed' : 'pointer', boxShadow: !isFormValid ? 'none' : '0 4px 20px rgba(140,114,196,0.35)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? 'Creating...' : <>Create Church <ArrowRight size={16} /></>}
                </button>
              </div>
              <p style={{ textAlign: 'right', fontSize: '12px', color: C.textGris, marginTop: '10px', fontStyle: 'italic' }}>
                One Faith. One Family. One Platform.
              </p>
            </div>
          </div>
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.accent}, ${C.secondary}, ${C.primary})`, borderRadius: '0 0 2px 2px' }} />
        </div>

        <div className="church-summary">
          <div style={{ background: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 8px 32px rgba(140,114,196,0.18)', border: `1px solid ${C.borderSoft}` }}>
            <h3 style={{ color: C.primary, fontSize: '15px', fontWeight: 800, margin: '0 0 10px' }}>Live Summary</h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.textGris, marginBottom: '6px' }}>
                <span>Step {currentStepIndex + 1} of {TABS.length}</span>
                <span>{progressPercent}% completed</span>
              </div>
              <div style={{ height: '5px', background: C.borderSoft, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: C.secondary, borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {[
              { label: 'Church Name', value: churchName || '—' },
              { label: 'Type', value: churchType },
              { label: 'Denomination', value: denomination },
              { label: 'Location', value: city && country ? `${city}, ${country}` : (country || '—') },
              { label: 'Logo', value: logo ? 'Uploaded' : '—', gold: !!logo },
              { label: 'Services', value: services.length > 0 ? `${services.length} scheduled` : '—', gold: services.length > 0 },
              { label: 'Departments', value: departments.length > 0 ? `${departments.length} active` : '—' },
              { label: 'Membership', value: membershipMode },
              { label: 'Budget Tracking', value: budgetTracking ? 'Enabled' : 'Disabled' },
              { label: 'Lead Pastor', value: leadPastor || '—' },
              { label: 'Staff Listed', value: staff.length > 0 ? `${staff.length}` : '—' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.borderSoft}` }}>
                <span style={{ color: C.textGris, fontSize: '12px' }}>{item.label}</span>
                <span style={{ color: (item as any).gold ? C.secondary : C.textDark, fontWeight: (item as any).gold ? 800 : 600, fontSize: '12px' }}>{item.value}</span>
              </div>
            ))}

            <div style={{ marginTop: '14px' }}>
              <p style={{ color: C.textGris, fontSize: '11px', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Required fields</p>
              {[
                { label: 'Church Name', done: churchName.trim().length >= 2 },
                { label: 'Country', done: !!country },
                { label: 'At least 1 Service', done: services.length > 0 },
                { label: 'Lead Pastor / Leader', done: leadPastor.trim().length > 0 },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  {f.done ? <CheckCircle2 size={13} color={C.success} /> : <Circle size={13} color={C.textGris} />}
                  <span style={{ color: f.done ? C.success : C.textGris, fontSize: '12px', fontWeight: f.done ? 600 : 400 }}>{f.label}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '14px', padding: '10px 12px', background: C.accent, borderRadius: '10px' }}>
              <p style={{ fontSize: '11px', color: C.primary, margin: 0, fontWeight: 600 }}>
                Badge Center, full HR, ledger, documents, and analytics unlock after this church is created.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
