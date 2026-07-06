'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

const FONTS = ['Inter', 'Georgia', 'Poppins', 'Roboto', 'Playfair Display'];

interface GroupBrand {
  logo?: string;
  slogan?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  showTarsynBadge?: boolean;
  enabled?: boolean;
}

interface Group {
  id: string;
  name: string;
  groupBrand?: GroupBrand;
}

export default function BrandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [slogan, setSlogan] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6B2D4E');
  const [secondaryColor, setSecondaryColor] = useState('#E9C77B');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [logoUrl, setLogoUrl] = useState('');
  const [showTarsynBadge, setShowTarsynBadge] = useState(true);
  const [enabled, setEnabled] = useState(true);

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
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const loadGroupBrand = (g: Group) => {
    const b = g.groupBrand;
    setSlogan(b?.slogan || '');
    setPrimaryColor(b?.primaryColor || '#6B2D4E');
    setSecondaryColor(b?.secondaryColor || '#E9C77B');
    setFontFamily(b?.fontFamily || 'Inter');
    setLogoUrl(b?.logo || '');
    setShowTarsynBadge(b?.showTarsynBadge !== false);
    setEnabled(b?.enabled !== false);
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const g = groups.find(x => x.id === groupId);
    if (g) loadGroupBrand(g);
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
        logo: logoUrl, slogan: slogan.trim(), primaryColor, secondaryColor,
        fontFamily, showTarsynBadge, enabled,
      };
      await updateDoc(doc(db, 'groups', selectedGroupId), { groupBrand });
      setGroups(prev => prev.map(g => g.id === selectedGroupId ? { ...g, groupBrand } : g));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Reset branding to TARSYN defaults for this group?')) return;
    setSlogan('');
    setPrimaryColor('#6B2D4E');
    setSecondaryColor('#E9C77B');
    setFontFamily('Inter');
    setLogoUrl('');
    setShowTarsynBadge(true);
    setEnabled(true);
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.bordeaux, fontFamily: 'Inter, sans-serif' }}>Loading...</p>
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

      <div style={{ flexShrink: 0, background: C.bordeauxDark, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: C.or, cursor: 'pointer', fontSize: '20px' }}>{'<'}</button>
          <div>
            <h1 style={{ color: C.orLight, fontSize: '17px', fontWeight: 700, margin: 0 }}>Branding Studio</h1>
            {groups.length > 1 && (
              <select value={selectedGroupId} onChange={e => handleGroupChange(e.target.value)}
                style={{ marginTop: '4px', background: 'rgba(255,255,255,0.08)', color: C.orLight, border: '1px solid rgba(233,199,123,0.3)', borderRadius: '6px', fontSize: '11px', padding: '2px 8px' }}>
                {groups.map(g => <option key={g.id} value={g.id} style={{ color: '#000' }}>{g.name}</option>)}
              </select>
            )}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ background: C.or, color: C.bordeauxDark, border: 'none', padding: '9px 22px', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save branding'}
        </button>
      </div>

      <div className="bs-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 300px', minHeight: 0 }}>

        {/* LEFT - Settings Panel */}
        <div className="bs-col" style={{ borderRight: `1px solid ${C.border}`, padding: '22px', overflowY: 'auto' }}>
          <p style={{ color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 18px' }}>Settings</p>

          <div className="bs-section">
            <label className="bs-label">Slogan</label>
            <input className="bs-input" value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Building wealth together" />
            <p className="bs-help">Shown under your group name on the member portal.</p>
          </div>

          <div className="bs-section">
            <label className="bs-label">Logo</label>
            {logoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <img src={logoUrl} alt="Logo" style={{ maxHeight: '36px', maxWidth: '100px' }} />
                <button onClick={() => setLogoUrl('')} style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Remove</button>
              </div>
            ) : (
              <p className="bs-help" style={{ margin: '0 0 10px' }}>No custom logo - default TARSYN mark shown.</p>
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
              <input type="checkbox" checked={showTarsynBadge} onChange={e => setShowTarsynBadge(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: C.bordeaux }} />
              <span style={{ color: C.bordeaux, fontWeight: 600, fontSize: '12.5px' }}>Show &quot;Powered by TARSYN&quot;</span>
            </label>
          </div>
        </div>

        {/* CENTER - Live Preview */}
        <div className="bs-col" style={{ padding: '22px', overflowY: 'auto', background: C.creme }}>
          <p style={{ color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>Live preview</p>

          {!enabled ? (
            <div style={{ background: 'white', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p style={{ color: C.muted, fontSize: '13px' }}>White Label is disabled for this group. Members see the default TARSYN experience.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontFamily }}>
              {/* Mini app header */}
              <div style={{ background: primaryColor, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ maxHeight: '26px', maxWidth: '100px' }} />
                  ) : (
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: secondaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: primaryColor }}>T</div>
                  )}
                  <div>
                    <div style={{ color: secondaryColor, fontWeight: 800, fontSize: '14px', lineHeight: 1 }}>{selectedGroup?.name || 'Your Group'}</div>
                    {slogan && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', marginTop: '2px' }}>{slogan}</div>}
                  </div>
                </div>
                <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: 'rgba(255,255,255,0.15)' }} />
              </div>

              {/* Mini app body - sidebar + content */}
              <div style={{ display: 'flex', minHeight: '260px' }}>
                <div style={{ width: '90px', background: C.creme, borderRight: `1px solid ${C.border}`, padding: '14px 10px', flexShrink: 0 }}>
                  {['Home', 'Members', 'Payments', 'Docs'].map((item, i) => (
                    <div key={item} style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, color: i === 0 ? primaryColor : C.muted, background: i === 0 ? secondaryColor + '33' : 'transparent', marginBottom: '4px' }}>{item}</div>
                  ))}
                </div>
                <div style={{ flex: 1, padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    {[['Members', '24'], ['Collected', '$3,200']].map(([label, val]) => (
                      <div key={label} style={{ background: C.creme, borderRadius: '8px', padding: '10px' }}>
                        <p style={{ fontSize: '9px', color: C.muted, margin: 0, textTransform: 'uppercase' }}>{label}</p>
                        <p style={{ fontSize: '15px', fontWeight: 800, color: primaryColor, margin: '2px 0 0' }}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                    {['Alice M.', 'James K.'].map((n, i) => (
                      <div key={n} style={{ padding: '7px 10px', fontSize: '10px', color: C.text, borderBottom: i === 0 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{n}</span>
                        <span style={{ color: secondaryColor, fontWeight: 700 }}>Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {showTarsynBadge && (
                <div style={{ textAlign: 'center', padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                  <span style={{ color: C.muted, fontSize: '9px' }}>Powered by TARSYN</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT - Advanced Settings */}
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
            <p className="bs-help">Turn off to revert this group to the default TARSYN look.</p>
          </div>

          <div className="bs-section">
            <button onClick={handleReset}
              style={{ width: '100%', background: '#FFEBEE', color: '#C62828', border: 'none', padding: '9px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
              Reset to TARSYN default
            </button>
          </div>

          <div style={{ background: C.creme, borderRadius: '10px', padding: '12px 14px', marginTop: '10px' }}>
            <p style={{ color: C.bordeaux, fontSize: '11.5px', fontWeight: 700, margin: '0 0 4px' }}>About branding</p>
            <p style={{ color: C.muted, fontSize: '11px', margin: 0, lineHeight: 1.6 }}>Changes apply only to this group&apos;s member portal. Other groups you manage keep their own independent branding.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
