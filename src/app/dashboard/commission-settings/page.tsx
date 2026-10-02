'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Plus, Trash2, Check } from 'lucide-react';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  roseClair: '#EAD9BE',
  roseMoyen: '#D9C0CC',
  texteFonce: '#4A1F38',
  texteGris: '#6B2D4E',
};

export interface CommissionTier {
  min: number;
  max: number | null;
  rate: number;
}

export const DEFAULT_COMMISSION_TIERS: CommissionTier[] = [
  { min: 0, max: 3000, rate: 5 },
  { min: 3000, max: 6000, rate: 4.5 },
  { min: 6000, max: 10000, rate: 4 },
  { min: 10000, max: 20000, rate: 3.5 },
  { min: 20000, max: null, rate: 3 },
];

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 11px',
  border: '1.5px solid #EAD9BE', borderRadius: '10px',
  fontSize: '13px', color: '#3A2F1F', background: '#FFFDF9',
  boxSizing: 'border-box', outline: 'none',
};

export default function CommissionSettingsPage() {
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [tiers, setTiers] = useState<CommissionTier[]>(DEFAULT_COMMISSION_TIERS);
  const [simAmount, setSimAmount] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      try {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        const saved = userDoc.exists() ? userDoc.data()?.commissionTiers : null;
        if (Array.isArray(saved) && saved.length > 0) {
          setTiers(saved);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const updateTier = (index: number, field: keyof CommissionTier, value: string) => {
    setTiers(prev => prev.map((t, i) => {
      if (i !== index) return t;
      if (field === 'max' && value === '') return { ...t, max: null };
      return { ...t, [field]: parseFloat(value) || 0 };
    }));
  };

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const newMin = last ? (last.max ?? (last.min + 1000)) : 0;
    setTiers(prev => {
      const withoutOpenEnd = prev.map((t, i) => i === prev.length - 1 ? { ...t, max: newMin } : t);
      return [...withoutOpenEnd, { min: newMin, max: null, rate: 0 }];
    });
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((t, i) => i === next.length - 1 ? { ...t, max: null } : t);
    });
  };

  const validate = (): string => {
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.rate < 0) return 'Commission rates cannot be negative.';
      if (i < tiers.length - 1 && (t.max === null || t.max <= t.min)) {
        return 'Each tier (except the last) must have a maximum greater than its minimum.';
      }
      if (i > 0 && t.min !== tiers[i - 1].max) {
        return 'Tiers must be contiguous - each tier should start where the previous one ends.';
      }
    }
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', uid), { commissionTiers: tiers }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Reset to the default commission tiers?')) return;
    setTiers(DEFAULT_COMMISSION_TIERS);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.texteGris }}>Loading...</p>
      </div>
    );
  }

  const cardStyle = { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F0E4D6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
  const smallLabel = { fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase' as const, letterSpacing: 0.8 };
  const fmt = (n: number) => n.toLocaleString('en-US');
  const simPool = parseFloat(simAmount) || 0;
  const simTier = tiers.find(t => simPool >= t.min && (t.max === null || simPool < t.max)) || tiers[tiers.length - 1];
  const simRate = simTier?.rate ?? 0;
  const simCommission = simPool * simRate / 100;

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style jsx global>{`
        @media (max-width: 900px) { .cm-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 520px) { .UNIMUNITY-tier-grid { grid-template-columns: 1fr 1fr !important; } }
        .cm-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .cm-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .cm-head { display: flex; align-items: center; gap: 11px; }
        .cm-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .cm-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .cm-form input:not(:disabled):focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .cm-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .cm-back:hover { background: #FBEEDD; }
        .cm-row:hover { background: #FFFBF5; }
        .cm-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .cm-btn:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer { 0% { background-position: 0% center; } 100% { background-position: -200% center; } }
      `}</style>
      <div style={{ flex: 1 }}>

      <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start', cursor: 'pointer' }} />
        <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Commission Settings</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Your commission tiers, applied automatically to new tontines.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div className="cm-form" style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="cm-back">Back to Dashboard</button>
        </div>

        <div className="cm-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

          {/* Tiers */}
          <div className="cm-card" style={{ ...cardStyle, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3E6D8', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="cm-head">
                <span className="cm-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F4CA}'}</span>
                <h2 className="cm-title">Commission Tiers <span style={{ fontSize: 12, fontWeight: 600, color: '#8A7B6C' }}>({tiers.length})</span></h2>
              </div>
              <button onClick={addTier} className="cm-btn"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, borderRadius: 10, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={14} /> Add tier
              </button>
            </div>
            <div style={{ padding: '10px 20px', background: '#FFFCF7', borderBottom: '1px solid #F3E6D8' }}>
              <p style={{ fontSize: 12, color: '#8A7B6C', margin: 0, lineHeight: 1.55 }}>
                The rate depends on the total pool (Number of Members {'\u00d7'} Contribution Amount). Tiers must follow each other with no gap, starting at 0, and the last tier has no upper limit.
              </p>
            </div>

            <div className="UNIMUNITY-tier-grid" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 40px', gap: 10, padding: '9px 20px', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>
              {['#', 'Min amount', 'Max amount', 'Rate (%)', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#FBEEDD', textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{h}</span>
              ))}
            </div>

            {tiers.map((tier, i) => (
              <div key={i} className="UNIMUNITY-tier-grid cm-row" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 40px', gap: 10, alignItems: 'center', padding: '9px 20px', borderBottom: '1px solid #F7EEE3', background: i % 2 ? '#FFFDF9' : '#FFFFFF' }}>
                <span style={{ fontSize: 12, color: '#8A7B6C' }}>{i + 1}</span>
                <input type="number" value={tier.min} disabled={i > 0} title={i > 0 ? "Auto-set from the previous tier's max" : undefined}
                  style={{ ...inp, background: i > 0 ? '#F6EFE5' : inp.background, color: i > 0 ? '#8A7B6C' : inp.color }}
                  onChange={e => updateTier(i, 'min', e.target.value)} />
                <input type="number" value={tier.max ?? ''} placeholder={i === tiers.length - 1 ? 'No limit' : ''} disabled={i === tiers.length - 1}
                  style={{ ...inp, background: i === tiers.length - 1 ? '#F6EFE5' : inp.background }}
                  onChange={e => updateTier(i, 'max', e.target.value)} />
                <div style={{ position: 'relative' }}>
                  <input type="number" step="0.1" value={tier.rate} style={{ ...inp, paddingRight: 26, fontWeight: 700, color: C.bordeaux }}
                    onChange={e => updateTier(i, 'rate', e.target.value)} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#8A7B6C', pointerEvents: 'none' }}>%</span>
                </div>
                <button onClick={() => removeTier(i)} disabled={tiers.length <= 1} title="Remove tier"
                  style={{ background: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: 8, padding: 8, cursor: tiers.length <= 1 ? 'not-allowed' : 'pointer', opacity: tiers.length <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <p style={{ fontSize: 11, color: '#8A7B6C', margin: 0, padding: '9px 20px', fontStyle: 'italic' }}>
              Each tier&apos;s minimum is set automatically from the previous tier&apos;s maximum.
            </p>
          </div>

          {/* Right column */}
          <div className="cm-card" style={{ ...cardStyle, padding: 22, position: 'sticky' as const, top: 24 }}>
            <div style={{ textAlign: 'center' as const, margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '16px 16px 0 0', borderBottom: '1px solid #F0E4D6' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>Your Commission</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase' as const, letterSpacing: 1.2 }}>Tiers Summary</p>
            </div>
            {tiers.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                <span style={{ fontSize: 12, color: '#8A7B6C' }}>{t.max === null ? fmt(t.min) + ' +' : fmt(t.min) + ' - ' + fmt(t.max)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.bordeaux }}>{t.rate}%</span>
              </div>
            ))}

            <p style={{ ...smallLabel, margin: '16px 0 6px' }}>Try it</p>
            <input type="number" value={simAmount} onChange={e => setSimAmount(e.target.value)} placeholder="Total pool, e.g. 5000" style={inp} />
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'linear-gradient(135deg,#FBEEDD,#F6E3C4)', borderRadius: 12, border: '1px solid ' + C.orLight, textAlign: 'center' as const }}>
              <p style={{ ...smallLabel, fontSize: 10.5, margin: 0 }}>Commission</p>
              <p style={{ fontSize: 18, color: C.bordeauxDark, margin: '2px 0 0', fontWeight: 800 }}>{simPool > 0 ? simCommission.toFixed(2) : '-'}</p>
              <p style={{ fontSize: 11.5, color: '#8A7B6C', margin: '2px 0 0' }}>{simPool > 0 ? 'at ' + simRate + '%' : 'Enter a pool amount'}</p>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '9px 12px', color: '#DC2626', fontSize: 12.5, marginTop: 12 }}>
                {error}
              </div>
            )}

            <button onClick={handleSave} disabled={saving} className="cm-btn"
              style={{ width: '100%', marginTop: 14, background: saved ? '#2E7D32' : 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: 'white', border: 'none', padding: 11, borderRadius: 14, fontSize: 14.5, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
              {saving ? 'Saving...' : saved ? <><Check size={15} /> Saved!</> : 'Save Tiers'}
            </button>
            <div style={{ textAlign: 'center' as const, marginTop: 8 }}>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: '#C62828', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}>
                Reset to default
              </button>
            </div>
          </div>
        </div>
      </div>

      </div>
      <Footer />
    </div>
  );
}
