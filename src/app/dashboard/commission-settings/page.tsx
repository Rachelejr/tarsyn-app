'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react';

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
  { min: 0, max: 500, rate: 0.5 },
  { min: 500, max: 2000, rate: 1 },
  { min: 2000, max: 5000, rate: 1.5 },
  { min: 5000, max: null, rate: 3.5 },
];

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: `1.5px solid ${C.roseMoyen}`, borderRadius: '10px',
  fontSize: '13px', color: C.texteFonce, background: '#FDFAF8',
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

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: `linear-gradient(135deg, ${C.bordeaux} 0%, #8B3A5E 100%)`, padding: '20px 28px' }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.or, fontSize: '13px', fontWeight: 600, marginBottom: '10px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <h1 style={{ color: C.creme, fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Commission Settings</h1>
        <p style={{ color: C.roseClair, fontSize: '13px', margin: 0, opacity: 0.85 }}>
          Define your own commission tiers, automatically applied when creating a tontine.
        </p>
      </div>

      <div style={{ maxWidth: '700px', margin: '24px auto', padding: '0 16px' }}>
        <div style={{ background: 'white', borderRadius: '20px', border: `1px solid ${C.roseMoyen}`, boxShadow: '0 12px 48px rgba(107,45,78,0.08)', padding: '24px' }}>

          <p style={{ fontSize: '12px', color: C.texteGris, margin: '0 0 18px' }}>
            Each tier applies a commission rate based on the total pool amount (Number of Members {'\u00d7'} Contribution Amount).
            Tiers must be contiguous, starting at 0 with no upper limit on the last tier.
          </p>

          {tiers.map((tier, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'end', marginBottom: '12px', paddingBottom: '12px', borderBottom: i < tiers.length - 1 ? `1px solid ${C.roseClair}` : 'none' }}>
              <div>
                <label style={{ fontSize: '11px', color: C.texteGris, display: 'block', marginBottom: '4px' }}>Min amount</label>
                <input type="number" value={tier.min} disabled={i > 0} style={{ ...inp, background: i > 0 ? C.creme : inp.background }}
                  onChange={e => updateTier(i, 'min', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: C.texteGris, display: 'block', marginBottom: '4px' }}>Max amount</label>
                <input type="number" value={tier.max ?? ''} placeholder={i === tiers.length - 1 ? 'No limit' : ''} disabled={i === tiers.length - 1}
                  style={{ ...inp, background: i === tiers.length - 1 ? C.creme : inp.background }}
                  onChange={e => updateTier(i, 'max', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: C.texteGris, display: 'block', marginBottom: '4px' }}>Rate (%)</label>
                <input type="number" step="0.1" value={tier.rate} style={inp}
                  onChange={e => updateTier(i, 'rate', e.target.value)} />
              </div>
              <button onClick={() => removeTier(i)} disabled={tiers.length <= 1}
                style={{ background: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '8px', padding: '9px', cursor: tiers.length <= 1 ? 'not-allowed' : 'pointer', opacity: tiers.length <= 1 ? 0.4 : 1 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button onClick={addTier}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.creme, color: C.bordeaux, border: `1.5px dashed ${C.roseMoyen}`, borderRadius: '10px', padding: '9px 16px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
            <Plus size={14} /> Add tier
          </button>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '13px', marginTop: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
            <button onClick={handleReset}
              style={{ flex: 1, background: '#FFEBEE', color: '#C62828', border: 'none', padding: '11px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              Reset to default
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, background: C.bordeaux, color: 'white', border: 'none', padding: '11px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : saved ? <><Check size={15} /> Saved!</> : 'Save tiers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
