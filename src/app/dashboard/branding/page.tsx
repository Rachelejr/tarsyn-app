'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

export default function BrandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6B2D4E');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      try {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        const branding = userDoc.data()?.branding;
        if (branding) {
          setOrgName(branding.orgName || '');
          setPrimaryColor(branding.primaryColor || '#6B2D4E');
          setLogoUrl(branding.logoUrl || '');
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploading(true);
    try {
      const path = `branding/${uid}/logo_${Date.now()}_${file.name}`;
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
    if (!uid) return;
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, 'users', uid), {
        branding: { orgName: orgName.trim(), primaryColor, logoUrl },
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => setLogoUrl('');

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

        <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Organization Name</h2>
          <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 14px' }}>Shown to your members instead of &quot;TARSYN&quot; on the member portal.</p>
          <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Sunrise Savings Group"
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Logo</h2>
          <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 14px' }}>Replaces the default TARSYN mark on your member portal. PNG or SVG with transparent background recommended.</p>

          {logoUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <div style={{ background: C.creme, borderRadius: '12px', padding: '12px 20px', border: '1px solid ' + C.orLight }}>
                <img src={logoUrl} alt="Your logo" style={{ maxHeight: '48px', maxWidth: '160px', display: 'block' }} />
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
          <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 14px' }}>Used for the header background and accents on your member portal.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
              style={{ width: '52px', height: '52px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', cursor: 'pointer', padding: '2px' }} />
            <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 14px' }}>Preview</h2>
          <div style={{ background: primaryColor, borderRadius: '12px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo preview" style={{ maxHeight: '32px', maxWidth: '140px' }} />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>T</div>
            )}
            <span style={{ color: 'white', fontWeight: 800, fontSize: '18px' }}>{orgName || 'TARSYN'}</span>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '14px', background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : 'Save branding'}
        </button>
        {saved && (
          <div style={{ background: C.greenBg, color: C.green, padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, marginTop: '12px', textAlign: 'center' }}>
            Branding saved. Your members will see it next time they visit.
          </div>
        )}

      </div>
    </div>
  );
}
