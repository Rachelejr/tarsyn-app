'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  ivoire: '#FFFDF7',
  blanc: '#FFFFFF',
  text: '#1a1a1a',
  muted: '#6b7280',
  green: '#2E7D32',
  greenBg: '#E8F5E9',
  border: '#EAD9BE',
};

const FONTS = [
  'Inter', 'Georgia', 'Poppins', 'Roboto', 'Playfair Display',
  'Montserrat', 'Lato', 'Merriweather', 'Oswald', 'Raleway',
];

const SLOGAN_SIZES = [
  { label: 'Small', value: 9 },
  { label: 'Medium', value: 12 },
  { label: 'Large', value: 15 },
  { label: 'Extra Large', value: 18 },
];

interface GroupBrand {
  logo?: string;
  slogan?: string;
  sloganColor?: string;
  sloganFontSize?: number;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  showUNIMUNITYBadge?: boolean;
  enabled?: boolean;
}

interface Group {
  id: string;
  name: string;
  groupBrand?: GroupBrand;
}

interface GroupStats {
  memberCount: number;
  totalCollected: number;
  currency: string;
  sampleMembers: { name: string; active: boolean }[];
}

export default function BrandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRemoveBtn, setShowRemoveBtn] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [slogan, setSlogan] = useState('');
  const [sloganColor, setSloganColor] = useState('#ffffff');
  const [sloganFontSize, setSloganFontSize] = useState(9);
  const [primaryColor, setPrimaryColor] = useState('#6B2D4E');
  const [secondaryColor, setSecondaryColor] = useState('#E9C77B');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [logoUrl, setLogoUrl] = useState('');
  const [showUNIMUNITYBadge, setShowUNIMUNITYBadge] = useState(true);
  const [enabled, setEnabled] = useState(true);

  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      try {
        const gq = query(collection(db, 'groups'), where('organizerId', '==', u.uid));
        const gsnap = await getDocs(gq);
        const list: Group[] = gsnap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
        setGroups(list);
        if (list.length > 0) {
          setSelectedGroupId(list[0].id);
          loadGroupBrand(list[0]);
          loadGroupStats(list[0].id);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const loadGroupBrand = (g: Group) => {
    const b = g.groupBrand;
    setSlogan(b?.slogan || '');
    setSloganColor(b?.sloganColor || '#ffffff');
    setSloganFontSize(b?.sloganFontSize || 9);
    setPrimaryColor(b?.primaryColor || '#6B2D4E');
    setSecondaryColor(b?.secondaryColor || '#E9C77B');
    setFontFamily(b?.fontFamily || 'Inter');
    setLogoUrl(b?.logo || '');
    setShowUNIMUNITYBadge(b?.showUNIMUNITYBadge !== false);
    setEnabled(b?.enabled !== false);
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const g = groups.find(x => x.id === groupId);
    if (g) loadGroupBrand(g);
    loadGroupStats(groupId);
  };

  const loadGroupStats = async (groupId: string) => {
    if (!groupId) { setGroupStats(null); return; }
    setStatsLoading(true);
    try {
      const membersSnap = await getDocs(query(collection(db, 'members'), where('groupId', '==', groupId)));
      const membersById: Record<string, any> = {};
      membersSnap.docs.forEach(d => { membersById[d.id] = { id: d.id, ...d.data() }; });

      let totalCollected = 0;
      let currency = 'USD';
      try {
        const gridSnap = await getDoc(doc(db, 'paymentGrids', groupId + '_current'));
        if (gridSnap.exists()) {
          const grid = gridSnap.data() as any;
          const slots: Record<string, any> = grid.slots || {};
          const payments: Record<string, Record<string, boolean>> = grid.payments || {};
          Object.entries(slots).forEach(([slotNum, slot]: [string, any]) => {
            const member = membersById[slot.memberId];
            if (!member) return;
            if (member.currency) currency = member.currency;
            const amount = member.expectedAmount || 0;
            const slotPayments = payments[slotNum] || {};
            Object.values(slotPayments).forEach(paid => { if (paid) totalCollected += amount; });
          });
        }
      } catch (gridErr) { /* no grid yet for this group - collected stays 0 */ }

      const sampleMembers = membersSnap.docs.slice(0, 2).map(d => ({
        name: d.data().fullName || d.data().name || 'Member',
        active: d.data().status !== 'paused',
      }));

      setGroupStats({ memberCount: membersSnap.size, totalCollected, currency, sampleMembers });
    } catch (e) {
      console.error(e);
      setGroupStats(null);
    }
    setStatsLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploading(true);
    try {
      const path = `branding/${selectedGroupId}/logo_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setLogoUrl(url);
    } catch (e) {
      alert('Logo upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!selectedGroupId) return;
    setSaving(true);
    setSaved(false);
    try {
      const groupBrand: GroupBrand = {
        logo: logoUrl, slogan: slogan.trim(), sloganColor, sloganFontSize, primaryColor, secondaryColor,
        fontFamily, showUNIMUNITYBadge, enabled,
      };
      await updateDoc(doc(db, 'groups', selectedGroupId), { groupBrand });
      setGroups(prev => prev.map(g => g.id === selectedGroupId ? { ...g, groupBrand } : g));
      setSaved(true);
      setViewMode('preview');
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Reset branding to UNIMUNITY defaults for this group?')) return;
    setSlogan('');
    setSloganColor('#ffffff');
    setSloganFontSize(9);
    setPrimaryColor('#6B2D4E');
    setSecondaryColor('#E9C77B');
    setFontFamily('Inter');
    setLogoUrl('');
    setShowUNIMUNITYBadge(true);
    setEnabled(true);
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
      <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '60px', width: 'auto' }} />
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #EAD9BE', borderTopColor: C.bordeaux, animation: 'UNIMUNITY-spin 0.8s linear infinite' }} />
    </div>
  );

  if (groups.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: C.bordeauxDark, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: C.or, cursor: 'pointer', fontSize: '20px' }}>{'<'}</button>
          <h1 style={{ color: C.orLight, fontSize: '18px', fontWeight: 700, margin: 0 }}>Branding Studio</h1>
        </div>
        <div style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: '14px' }}>Create a group first to configure its branding.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.ivoire, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:wght@400;700;800&family=Montserrat:wght@400;600;700;800&family=Lato:wght@400;700;800&family=Merriweather:wght@400;700;800&family=Oswald:wght@400;600;700&family=Raleway:wght@400;600;700;800&family=Roboto:wght@400;700;800&display=swap');
        .bs-input, .bs-select { width: 100%; padding: 9px 12px; border: 1.5px solid ${C.border}; border-radius: 10px; font-size: 13px; outline: none; box-sizing: border-box; background: white; }
        .bs-label { color: ${C.bordeaux}; font-size: 12px; font-weight: 700; margin: 0 0 6px; display: block; text-transform: uppercase; letter-spacing: 0.04em; }
        .bs-section { margin-bottom: 22px; }
        .bs-help { color: ${C.muted}; font-size: 11.5px; margin: 4px 0 0; line-height: 1.5; }
        @media (max-width: 1100px) {
          .bs-grid { grid-template-columns: 280px 1fr !important; }
          .bs-advanced { grid-column: 1 / -1 !important; border-top: 1px solid ${C.border}; }
        }
        @media (max-width: 700px) {
          .bs-root { height: auto !important; overflow: visible !important; }
          .bs-grid { grid-template-columns: 1fr !important; height: auto !important; overflow: visible !important; }
          .bs-col { overflow: visible !important; max-height: none !important; }
        }
      `}} />

      <div style={{
        flexShrink: 0,
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', cursor: 'pointer' }} />
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ color: C.creme, fontSize: '17px', fontWeight: 700, margin: 0 }}>Branding Studio</h1>
          {groups.length > 1 && (
            <select value={selectedGroupId} onChange={e => handleGroupChange(e.target.value)}
              style={{ marginTop: '4px', background: 'rgba(251,238,221,0.1)', color: C.creme, border: '1px solid rgba(251,238,221,0.3)', borderRadius: '6px', fontSize: '11px', padding: '2px 8px' }}>
              {groups.map(g => <option key={g.id} value={g.id} style={{ color: '#000' }}>{g.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, justifyContent: 'flex-end' }}>
          <DateTimeWeather textColor="rgba(251,238,221,0.85)" />
          {viewMode === 'edit' ? (
            <button onClick={handleSave} disabled={saving}
              style={{ background: C.or, color: C.bordeauxDark, border: 'none', padding: '9px 22px', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save branding'}
            </button>
          ) : (
            <button onClick={() => setViewMode('edit')}
              style={{ background: 'rgba(255,255,255,0.1)', color: C.orLight, border: `1px solid ${C.or}`, padding: '9px 22px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
              Edit branding
            </button>
          )}
        </div>
      </div>

      <div className="bs-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: viewMode === 'edit' ? '300px 1fr 300px' : '1fr', minHeight: 0 }}>

        {viewMode === 'edit' && (
          <div className="bs-col" style={{ borderRight: `1px solid ${C.border}`, padding: '22px', overflowY: 'auto' }}>
            <p style={{ color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 18px' }}>Settings</p>

            <div className="bs-section">
              <label className="bs-label">Slogan</label>
              <input className="bs-input" value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Building wealth together" />
              <p className="bs-help">Shown under your group name on the member portal.</p>
            </div>

            <div className="bs-section">
              <label className="bs-label">Slogan color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="color" value={sloganColor} onChange={e => setSloganColor(e.target.value)}
                  style={{ width: '40px', height: '38px', border: `1.5px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
                <input className="bs-input" value={sloganColor} onChange={e => setSloganColor(e.target.value)} style={{ fontFamily: 'monospace' }} />
              </div>
            </div>

            <div className="bs-section">
              <label className="bs-label">Slogan size</label>
              <select className="bs-select" value={sloganFontSize} onChange={e => setSloganFontSize(Number(e.target.value))}>
                {SLOGAN_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="bs-section">
              <label className="bs-label">Logo</label>
              {logoUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <img
                    src={logoUrl}
                    alt="Logo"
                    onClick={() => setShowRemoveBtn(prev => !prev)}
                    style={{ maxHeight: '36px', maxWidth: '100px', cursor: 'pointer' }}
                  />
                  {showRemoveBtn && (
                    <button
                      onClick={() => { setLogoUrl(''); setShowRemoveBtn(false); }}
                      style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <p className="bs-help" style={{ margin: '0 0 10px' }}>No custom logo - default UNIMUNITY mark shown.</p>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ width: '100%', background: C.creme, color: C.bordeaux, border: `1.5px solid ${C.border}`, padding: '9px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                {uploading ? 'Uploading...' : logoUrl ? 'Replace logo' : 'Upload logo'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </div>

            <div className="bs-section">
              <label className="bs-label">Primary color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  style={{ width: '40px', height: '38px', border: `1.5px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
                <input className="bs-input" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ fontFamily: 'monospace' }} />
              </div>
            </div>

            <div className="bs-section">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showUNIMUNITYBadge} onChange={e => setShowUNIMUNITYBadge(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: C.bordeaux }} />
                <span style={{ color: C.bordeaux, fontWeight: 600, fontSize: '12.5px' }}>Show &quot;Powered by UNIMUNITY&quot;</span>
              </label>
            </div>
          </div>
        )}

        <div className="bs-col" style={{ padding: viewMode === 'preview' ? '32px 40px' : '22px', overflowY: 'auto', background: C.creme, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: viewMode === 'preview' ? '1000px' : 'none' }}>
            <p style={{
              color: viewMode === 'preview' ? C.bordeaux : C.muted,
              fontSize: viewMode === 'preview' ? '18px' : '11px',
              fontWeight: 700,
              textTransform: viewMode === 'preview' ? 'none' : 'uppercase',
              letterSpacing: viewMode === 'preview' ? 'normal' : '0.05em',
              margin: '0 0 14px',
              textAlign: viewMode === 'preview' ? 'center' : 'left',
            }}>
              Live preview
            </p>

            {enabled && (
              <div style={{
                background: '#FBF0D9',
                color: '#9C7A2E',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: viewMode === 'preview' ? 'center' : 'flex-start',
                gap: '6px',
                width: viewMode === 'preview' ? '100%' : 'auto',
                boxSizing: 'border-box',
                textAlign: 'left',
              }}>
                {'\u26A0'} Preview - shows your real group data. This is a mockup layout, not the exact member portal design.
              </div>
            )}

            {!enabled ? (
              <div style={{ background: 'white', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p style={{ color: C.muted, fontSize: '13px' }}>White Label is disabled for this group. Members see the default UNIMUNITY experience.</p>
              </div>
            ) : (
              <div style={{
                background: 'white',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                fontFamily: `'${fontFamily}', sans-serif`,
                width: '100%',
              }}>
                <div style={{ background: primaryColor, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ maxHeight: '52px', maxWidth: '200px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: secondaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 800, color: primaryColor }}>T</div>
                  )}
                  <div>
                    <div style={{ color: secondaryColor, fontWeight: 800, fontSize: '20px', lineHeight: 1 }}>{selectedGroup?.name || 'Your Group'}</div>
                    {slogan && <div style={{ color: sloganColor, fontSize: `${sloganFontSize}px`, marginTop: '4px' }}>{slogan}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', minHeight: '340px' }}>
                  <div style={{ width: '120px', background: C.creme, borderRight: `1px solid ${C.border}`, padding: '18px 12px', flexShrink: 0 }}>
                    {['Home', 'Members', 'Payments', 'Docs'].map((item, i) => (
                      <div key={item} style={{ padding: '9px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: i === 0 ? primaryColor : C.muted, background: i === 0 ? secondaryColor + '33' : 'transparent', marginBottom: '5px' }}>{item}</div>
                    ))}
                  </div>
                  <div style={{ flex: 1, padding: '22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                      {[
                        ['Members', statsLoading ? '...' : String(groupStats?.memberCount ?? 0)],
                        ['Collected', statsLoading ? '...' : `${groupStats?.currency || 'USD'} ${(groupStats?.totalCollected ?? 0).toFixed(0)}`],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: C.creme, borderRadius: '10px', padding: '14px' }}>
                          <p style={{ fontSize: '10.5px', color: C.muted, margin: 0, textTransform: 'uppercase' }}>{label}</p>
                          <p style={{ fontSize: '19px', fontWeight: 800, color: primaryColor, margin: '3px 0 0' }}>{val}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                      {statsLoading ? (
                        <div style={{ padding: '14px', fontSize: '12px', color: C.muted, textAlign: 'center' }}>Loading members...</div>
                      ) : groupStats && groupStats.sampleMembers.length > 0 ? (
                        groupStats.sampleMembers.map((m, i) => (
                          <div key={m.name + i} style={{ padding: '10px 14px', fontSize: '12px', color: C.text, borderBottom: i === 0 && groupStats.sampleMembers.length > 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{m.name}</span>
                            <span style={{ color: m.active ? secondaryColor : C.muted, fontWeight: 700 }}>{m.active ? 'Active' : 'Paused'}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '14px', fontSize: '12px', color: C.muted, textAlign: 'center' }}>No members yet</div>
                      )}
                    </div>
                  </div>
                </div>

                {showUNIMUNITYBadge && (
                  <div style={{ textAlign: 'center', padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted, fontSize: '10.5px' }}>Powered by UNIMUNITY</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {viewMode === 'edit' && (
          <div className="bs-col bs-advanced" style={{ borderLeft: `1px solid ${C.border}`, padding: '22px', overflowY: 'auto' }}>
            <p style={{ color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 18px' }}>Advanced</p>

            <div className="bs-section">
              <label className="bs-label">Secondary color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                  style={{ width: '40px', height: '38px', border: `1.5px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
                <input className="bs-input" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ fontFamily: 'monospace' }} />
              </div>
              <p className="bs-help">Used for accents and highlights.</p>
            </div>

            <div className="bs-section">
              <label className="bs-label">Font</label>
              <select className="bs-select" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="bs-section">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: C.bordeaux }} />
                <span style={{ color: C.bordeaux, fontWeight: 600, fontSize: '12.5px' }}>Enable White Label</span>
              </label>
              <p className="bs-help">Turn off to revert this group to the default UNIMUNITY look.</p>
            </div>

            <div className="bs-section">
              <button onClick={handleReset}
                style={{ width: '100%', background: '#FFEBEE', color: '#C62828', border: 'none', padding: '9px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                Reset to UNIMUNITY default
              </button>
            </div>

            <div style={{ background: C.creme, borderRadius: '10px', padding: '12px 14px', marginTop: '10px' }}>
              <p style={{ color: C.bordeaux, fontSize: '11.5px', fontWeight: 700, margin: '0 0 4px' }}>About branding</p>
              <p style={{ color: C.muted, fontSize: '11px', margin: 0, lineHeight: 1.6 }}>Changes apply only to this group&apos;s member portal. Other groups you manage keep their own independent branding.</p>
            </div>
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}
