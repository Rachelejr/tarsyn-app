'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  ArrowRight, ArrowLeft, Check, CheckCircle2, Circle, X, Plus,
} from 'lucide-react';

// ── CHURCH MODULE — DISTINCT VISUAL IDENTITY ──────────────────────
// Vibrant — turquoise + rare rose + gold. Distinct from Tontine's bordeaux/gold.
const C = {
  primary:    '#0E7C7B', // deep turquoise
  accent:     '#D6588F', // rare rose (orchid-pink, not garish)
  warm:       '#C9B896', // soft beige, replaces gold
  bg:         '#F1FAF9', // pale turquoise-tinted background
  cardBg:     '#FFFFFF',
  borderSoft: '#D6EFEC',
  borderMed:  '#A9DCD6',
  textDark:   '#1B3A39',
  textGris:   '#5E8482',
};

const DENOMINATIONS = [
  'Non-denominational', 'Baptist', 'Catholic', 'Pentecostal', 'Methodist',
  'Evangelical', 'Orthodox', 'Lutheran', 'Presbyterian', 'Seventh-day Adventist',
  'Church of Christ', 'Anglican', 'Other',
];

const LANGUAGES = ['English', 'French', 'Spanish', 'Haitian Creole', 'Portuguese', 'Other'];

const MINISTRY_OPTIONS = [
  'Choir / Music', 'Youth Ministry', "Women's Ministry", "Men's Fellowship",
  'Sunday School', 'Outreach & Missions', 'Prayer Group', 'Ushers & Hospitality',
  'Media & Tech', 'Children\'s Ministry',
];

const MEMBERSHIP_MODES = [
  { value: 'Open', desc: 'Anyone can join freely' },
  { value: 'Invite Only', desc: 'Join by invitation only' },
  { value: 'Approval Required', desc: 'Leadership reviews each request' },
];

const CURRENCIES = ['USD', 'HTG', 'EUR', 'CAD', 'GBP', 'XOF'];

const TABS = [
  { key: 'identity', label: 'Identity' },
  { key: 'services', label: 'Services' },
  { key: 'ministries', label: 'Ministries' },
  { key: 'finance', label: 'Finance & Membership' },
  { key: 'leadership', label: 'Leadership' },
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
      {label} {required && <span style={{ color: '#B14545', fontSize: '12px' }}>*</span>}
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

export default function CreateChurchPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any>(null);
  const [error, setError] = useState('');

  const [churchName, setChurchName] = useState('');
  const [denomination, setDenomination] = useState('Non-denominational');
  const [language, setLanguage] = useState('English');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');

  const [services, setServices] = useState<{ day: string; time: string }[]>([]);
  const [serviceDay, setServiceDay] = useState('Sunday');
  const [serviceTime, setServiceTime] = useState('');
  const [capacity, setCapacity] = useState('');

  const [ministries, setMinistries] = useState<string[]>([]);
  const [customMinistry, setCustomMinistry] = useState('');

  const [membershipMode, setMembershipMode] = useState('Open');
  const [currency, setCurrency] = useState('USD');
  const [budgetTracking, setBudgetTracking] = useState(true);
  const [fiscalYearStart, setFiscalYearStart] = useState('January');

  const [leadPastor, setLeadPastor] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const tabCompletion: Record<string, boolean> = {
    identity: churchName.trim().length >= 2 && !!country,
    services: services.length > 0,
    ministries: ministries.length > 0,
    finance: !!membershipMode,
    leadership: leadPastor.trim().length > 0,
  };
  const currentStepIndex = TABS.findIndex(t => t.key === activeTab);
  const progressPercent = Math.round(((currentStepIndex + 1) / TABS.length) * 100);
  const isFormValid = churchName.trim().length >= 2 && !!country && services.length > 0 && leadPastor.trim().length > 0;

  const addService = () => {
    if (!serviceTime) return;
    setServices(prev => [...prev, { day: serviceDay, time: serviceTime }]);
    setServiceTime('');
  };
  const removeService = (i: number) => setServices(prev => prev.filter((_, idx) => idx !== i));

  const toggleMinistry = (m: string) => {
    setMinistries(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };
  const addCustomMinistry = () => {
    const v = customMinistry.trim();
    if (v && !ministries.includes(v)) { setMinistries(prev => [...prev, v]); setCustomMinistry(''); }
  };

  const handleCreate = async () => {
    setError('');
    if (!churchName.trim() || churchName.trim().length < 2) return setError('Church name is required.');
    if (!country) return setError('Country is required.');
    if (services.length === 0) return setError('Add at least one service time.');
    if (!leadPastor.trim()) return setError('Lead Pastor / Leader name is required.');

    setSaving(true);
    try {
      const code = `CHU-${Date.now().toString().slice(-6)}`;
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      await addDoc(collection(db, 'churches'), {
        churchName: churchName.trim(), code, denomination, language, country,
        description: description.trim(),
        services, capacity: capacity ? parseInt(capacity) : null,
        ministries,
        membershipMode, currency, budgetTracking, fiscalYearStart,
        leadPastor: leadPastor.trim(), adminEmail: adminEmail.trim(),
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
        border-color: ${C.accent} !important;
        box-shadow: 0 0 0 3px rgba(214,88,143,0.18);
        background: white !important;
      }
      .church-btn { transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease; }
      .church-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(14,124,123,0.22); filter: brightness(1.04); }
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

  // ── SUCCESS SCREEN ──────────────────────────────────────────────
  if (saved) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {sharedStyles}
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '480px', width: '100%', boxShadow: '0 12px 48px rgba(14,124,123,0.12)', textAlign: 'center' }}>
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
      </div>
    </div>
  );

  // ── MAIN FORM (LANDSCAPE — Church identity) ──────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '18px 16px' }}>
      {sharedStyles}
      <div className="church-grid" style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* FORM */}
        <div>
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.primary}, ${C.accent}, ${C.warm})`, borderRadius: '2px 2px 0 0' }} />
          <div style={{ background: '#fff', borderRadius: '0 0 20px 20px', border: `1px solid ${C.borderMed}`, borderTop: 'none', boxShadow: '0 12px 48px rgba(14,124,123,0.08)', overflow: 'hidden' }}>

            <div style={{ background: `linear-gradient(160deg, ${C.primary} 0%, ${C.accent} 100%)`, padding: '20px 28px' }}>
              <button className="church-btn" onClick={() => router.push('/dashboard')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.warm, fontSize: '13px', fontWeight: 600, marginBottom: '10px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
              <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Create a Church</h1>
              <p style={{ color: '#D6F0EC', fontSize: '13px', margin: 0, opacity: 0.9 }}>Set up your congregation's home on TARSYN</p>
            </div>

            {/* MINI STEP NAVIGATION */}
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
                  {tabCompletion[t.key] && <CheckCircle2 size={13} color={activeTab === t.key ? C.primary : '#5A8A6E'} />}
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 28px' }}>

              {/* ── IDENTITY ─────────────────────────────────── */}
              {activeTab === 'identity' && (
                <Card title="Church Identity">
                  <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <FieldLabel label="Church Name" required />
                      <input className="church-field" value={churchName} onChange={e => setChurchName(e.target.value)} placeholder="e.g. New Hope Baptist Church" style={inp} />
                    </div>
                    <div>
                      <FieldLabel label="Denomination" />
                      <select className="church-field" value={denomination} onChange={e => setDenomination(e.target.value)} style={inp}>
                        {DENOMINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <FieldLabel label="Country" required />
                      <input className="church-field" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. United States, Haiti..." style={inp} />
                    </div>
                    <div>
                      <FieldLabel label="Primary Language" />
                      <select className="church-field" value={language} onChange={e => setLanguage(e.target.value)} style={inp}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <FieldLabel label="Short Description (optional)" />
                    <textarea className="church-field" value={description} onChange={e => setDescription(e.target.value.slice(0, 280))} rows={3}
                      placeholder="A few words about your congregation..." style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>
                </Card>
              )}

              {/* ── SERVICES ─────────────────────────────────── */}
              {activeTab === 'services' && (
                <Card title="Service Schedule">
                  <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', marginBottom: '14px', alignItems: 'end' }}>
                    <div>
                      <FieldLabel label="Day" />
                      <select className="church-field" value={serviceDay} onChange={e => setServiceDay(e.target.value)} style={inp}>
                        {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label="Time" />
                      <input className="church-field" type="time" value={serviceTime} onChange={e => setServiceTime(e.target.value)} style={inp} />
                    </div>
                    <button className="church-btn" onClick={addService}
                      style={{ padding: '11px 18px', background: C.primary, color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '44px' }}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {services.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      {services.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg, borderRadius: '10px', padding: '8px 12px' }}>
                          <span style={{ fontSize: '13px', color: C.textDark, fontWeight: 600 }}>{s.day} — {s.time}</span>
                          <button onClick={() => removeService(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textGris, display: 'flex', alignItems: 'center' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <FieldLabel label="Seating Capacity (optional)" />
                    <input className="church-field" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} min={1} placeholder="e.g. 200" style={{ ...inp, maxWidth: '220px' }} />
                  </div>
                </Card>
              )}

              {/* ── MINISTRIES ───────────────────────────────── */}
              {activeTab === 'ministries' && (
                <Card title="Ministries & Departments">
                  <p style={{ fontSize: '12px', color: C.textGris, margin: '0 0 12px' }}>Select all that apply, or add your own.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {MINISTRY_OPTIONS.map(m => (
                      <button key={m} className="church-pill" onClick={() => toggleMinistry(m)}
                        style={{ padding: '8px 14px', borderRadius: '20px', border: `2px solid ${ministries.includes(m) ? C.primary : C.borderMed}`, background: ministries.includes(m) ? C.primary : 'white', color: ministries.includes(m) ? 'white' : C.textGris, cursor: 'pointer', fontSize: '13px' }}>
                        {m}
                      </button>
                    ))}
                    {ministries.filter(m => !MINISTRY_OPTIONS.includes(m)).map(m => (
                      <button key={m} className="church-pill" onClick={() => toggleMinistry(m)}
                        style={{ padding: '8px 14px', borderRadius: '20px', border: `2px solid ${C.warm}`, background: C.warm, color: 'white', cursor: 'pointer', fontSize: '13px' }}>
                        {m} ×
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="church-field" value={customMinistry} onChange={e => setCustomMinistry(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomMinistry()}
                      placeholder="Add a custom ministry..." style={inp} />
                    <button className="church-btn" onClick={addCustomMinistry}
                      style={{ padding: '11px 18px', background: C.warm, color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Add
                    </button>
                  </div>
                </Card>
              )}

              {/* ── FINANCE & MEMBERSHIP ─────────────────────── */}
              {activeTab === 'finance' && (
                <>
                  <Card title="Membership Mode">
                    <div className="church-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {MEMBERSHIP_MODES.map(m => (
                        <div key={m.value} className="church-pill" onClick={() => setMembershipMode(m.value)}
                          style={{ border: `2px solid ${membershipMode === m.value ? C.primary : C.borderMed}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', background: membershipMode === m.value ? '#E8F7F5' : 'white' }}>
                          <p style={{ color: C.primary, fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{m.value}</p>
                          <p style={{ color: C.textGris, fontSize: '11px', margin: 0 }}>{m.desc}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Finance Settings">
                    <div className="church-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                      <div>
                        <FieldLabel label="Tithe / Offering Currency" />
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
                    <div onClick={() => setBudgetTracking(p => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: budgetTracking ? '#E8F7F5' : '#FBFAFD', border: `1.5px solid ${budgetTracking ? C.primary : C.borderMed}`, borderRadius: '12px', cursor: 'pointer' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${budgetTracking ? C.primary : C.borderMed}`, background: budgetTracking ? C.primary : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                        {budgetTracking && <Check size={12} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textDark }}>Enable Budget Tracking for Members</div>
                        <div style={{ fontSize: '11px', color: C.textGris, marginTop: '2px' }}>Lets the Finance module create individual member budgets (set up after church creation)</div>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {/* ── LEADERSHIP ───────────────────────────────── */}
              {activeTab === 'leadership' && (
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
                  <p style={{ fontSize: '11px', color: C.textGris, margin: '12px 0 0' }}>
                    Full staff & HR management (roles, schedules, payroll) is configured after creation in the Church module's HR section.
                  </p>
                </Card>
              )}

              {error && (
                <div style={{ background: '#FBEDED', border: '1px solid #E8C5C5', borderRadius: '12px', padding: '12px 16px', color: '#A14444', fontSize: '14px', marginTop: '16px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TABS.map((t, i) => (
                    <span key={t.key} style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentStepIndex >= i ? C.primary : '#D6EFEC' }} />
                  ))}
                </div>
                <button className="church-btn" onClick={handleCreate} disabled={!isFormValid || saving}
                  style={{ padding: '13px 26px', background: !isFormValid ? '#D6EFEC' : C.primary, color: !isFormValid ? '#7FA9A6' : 'white', border: 'none', borderRadius: '18px', fontSize: '15px', fontWeight: 700, cursor: !isFormValid ? 'not-allowed' : 'pointer', boxShadow: !isFormValid ? 'none' : '0 4px 20px rgba(14,124,123,0.30)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? 'Creating...' : <>Create Church <ArrowRight size={16} /></>}
                </button>
              </div>
              <p style={{ textAlign: 'right', fontSize: '12px', color: C.textGris, marginTop: '10px', fontStyle: 'italic' }}>
                One Faith. One Family. One Platform.
              </p>
            </div>
          </div>
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.warm}, ${C.accent}, ${C.primary})`, borderRadius: '0 0 2px 2px' }} />
        </div>

        {/* LIVE SUMMARY */}
        <div className="church-summary">
          <div style={{ background: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 8px 32px rgba(14,124,123,0.14)', border: `1px solid ${C.borderSoft}` }}>
            <h3 style={{ color: C.primary, fontSize: '15px', fontWeight: 800, margin: '0 0 10px' }}>Live Summary</h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.textGris, marginBottom: '6px' }}>
                <span>Step {currentStepIndex + 1} of {TABS.length}</span>
                <span>{progressPercent}% completed</span>
              </div>
              <div style={{ height: '5px', background: '#D6EFEC', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: C.warm, borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {[
              { label: 'Church Name', value: churchName || '—' },
              { label: 'Denomination', value: denomination },
              { label: 'Country', value: country || '—' },
              { label: 'Services', value: services.length > 0 ? `${services.length} scheduled` : '—', gold: services.length > 0 },
              { label: 'Ministries', value: ministries.length > 0 ? `${ministries.length} active` : '—' },
              { label: 'Membership', value: membershipMode },
              { label: 'Budget Tracking', value: budgetTracking ? 'Enabled' : 'Disabled', gold: budgetTracking },
              { label: 'Lead Pastor', value: leadPastor || '—' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.borderSoft}` }}>
                <span style={{ color: C.textGris, fontSize: '12px' }}>{item.label}</span>
                <span style={{ color: (item as any).gold ? C.warm : C.textDark, fontWeight: (item as any).gold ? 800 : 600, fontSize: '12px' }}>{item.value}</span>
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
                  {f.done ? <CheckCircle2 size={13} color="#5A8A6E" /> : <Circle size={13} color={C.textGris} />}
                  <span style={{ color: f.done ? '#5A8A6E' : C.textGris, fontSize: '12px', fontWeight: f.done ? 600 : 400 }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
