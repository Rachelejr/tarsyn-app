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
  blanc: '#FFFFFF',
  text: '#1a1a1a',
  muted: '#6b7280',
  green: '#2E7D32',
  greenBg: '#E8F5E9',
};

interface GroupBrand {
  logo?: string;
  slogan?: string;
  primaryColor?: string;
  showTarsynBadge?: boolean;
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
  const [logoUrl, setLogoUrl] = useState('');
  const [showTarsynBadge, setShowTarsynBadge] = useState(true);

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
    setLogoUrl(b?.logo || '');
    setShowTarsynBadge(b?.showTarsynBadge !== false);
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
      const groupBrand: GroupBrand = { logo: logoUrl, slogan: slogan.trim(), primaryColor, showTarsynBadge };
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

  const handleRemoveLogo = () => setLogoUrl('');

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.bordeaux, fontFamily: 'Inter, sans-serif' }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: C.bordeauxDark, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: C.or, cursor: 'pointer', fontSize: '20px' }}>&larr;</button>
          <h1 style={{ color: C.orLight, fontSize: '18px', fontWeight: 700, margin: 0 }}>White Label Branding</h1>
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: C.or, padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }}>

        {groups.length === 0 ? (
          <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p style={{ color: C.muted, fontSize: '14px' }}>Create a group first to configure its branding.</p>
          </div>
        ) : (
          <>
            {groups.length > 1 && (
              <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Which group?</h2>
                <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 14px' }}>Each of your groups can have its own independent branding.</p>
                <select value={selectedGroupId} onChange={e => handleGroupChange(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white' }}>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Slogan</h2>
              <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 14px' }}>A short tagline shown under your group name on the member portal.</p>
              <input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="e.g. Building wealth together"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Logo</h2>
              <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 14px' }}>Replaces the default TARSYN mark for this group&apos;s members. PNG or SVG with transparent background recommended.</p>

              {logoUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                  <div style={{ background: C.creme, borderRadius: '12px', padding: '12px 20px', border: '1px solid ' + C.orLight }}>
                    <img src={logoUrl} alt="Group logo" style={{ maxHeight: '48px', maxWidth: '160px', display: 'block' }} />
                  </div>
                  <button onClick={handleRemoveLogo}
                    style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <p style={{ color: C.muted, fontSize: '13px', marginBottom: '14px' }}>No custom logo yet - the default TARSYN mark is shown.</p>
              )}

              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
                {uploading ? 'Uploading...' : logoUrl ? 'Replace logo' : 'Upload logo'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </div>

            <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Primary Color</h2>
              <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 14px' }}>Used for the header background and accents on this group&apos;s member portal.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  style={{ width: '52px', height: '52px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', cursor: 'pointer', padding: '2px' }} />
                <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showTarsynBadge} onChange={e => setShowTarsynBadge(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: C.bordeaux }} />
                <div>
                  <p style={{ color: C.bordeaux, fontWeight: 700, fontSize: '14px', margin: 0 }}>Show &quot;Powered by TARSYN&quot; badge</p>
                  <p style={{ color: C.muted, fontSize: '12px', margin: '2px 0 0' }}>Displayed at the bottom of the member portal.</p>
                </div>
              </label>
            </div>

            <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 14px' }}>Preview</h2>
              <div style={{ background: primaryColor, borderRadius: '12px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" style={{ maxHeight: '32px', maxWidth: '140px' }} />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>T</div>
                )}
                <div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: '18px', lineHeight: 1 }}>{selectedGroup?.name || 'Your Group'}</div>
                  {slogan && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginTop: '2px' }}>{slogan}</div>}
                </div>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '14px', background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save branding'}
            </button>
            {saved && (
              <div style={{ background: C.greenBg, color: C.green, padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, marginTop: '12px', textAlign: 'center' }}>
                Branding saved for {selectedGroup?.name}. Members will see it next time they visit.
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
