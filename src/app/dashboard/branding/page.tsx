'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';
import { getOrganizerPlanTier, getPlanLimits } from '@/lib/planLimits';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  ivoire: '#FFFDF7',
  blanc: '#FFFFFF',
  text: '#3A2F1F',
  muted: '#8A7B6C',
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
  const [hasWhiteLabel, setHasWhiteLabel] = useState(true);
  const [planDisplayName, setPlanDisplayName] = useState('');
  const [canHideBadge, setCanHideBadge] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      try {
        const tier = await getOrganizerPlanTier(db, u.uid);
        const limits = getPlanLimits(tier);
        setHasWhiteLabel(limits.whiteLabel);
        setPlanDisplayName(limits.displayName);
        // Hiding the "Powered by UNIMUNITY" badge (the "Professional" /
        // "Full Customization" white label level) is reserved for
        // Business and Enterprise - Pro keeps full logo/color/font
        // customization but the badge stays on.
        setCanHideBadge(tier === 'pro' || tier === 'enterprise');
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
        fontFamily, showUNIMUNITYBadge: canHideBadge ? showUNIMUNITYBadge : true, enabled,
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

  const cardStyle = { background: C.blanc, borderRadius: 16, border: '1px solid #F0E4D6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
  const groupInitial = (selectedGroup?.name || 'G').trim().charAt(0).toUpperCase();

  const shell = (subtitle: string, body: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:wght@400;700;800&family=Montserrat:wght@400;600;700;800&family=Lato:wght@400;700;800&family=Merriweather:wght@400;700;800&family=Oswald:wght@400;600;700&family=Raleway:wght@400;600;700;800&family=Roboto:wght@400;700;800&family=Poppins:wght@400;600;700;800&display=swap');
        @media (max-width: 900px) { .bs-grid { grid-template-columns: 1fr !important; } .bs-bar { flex-wrap: wrap; } }
        .bs-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .bs-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .bs-head { display: flex; align-items: center; gap: 11px; margin-bottom: 11px; padding-bottom: 9px; border-bottom: 1px solid #F3E6D8; }
        .bs-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .bs-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .bs-input, .bs-select { width: 100%; padding: 7px 11px; border: 1.5px solid #EAD9BE; border-radius: 10px; font-size: 13px; outline: none; box-sizing: border-box; background: #FFFDF9; color: #3A2F1F; font-family: Inter, sans-serif; transition: border-color .15s ease, box-shadow .15s ease; }
        .bs-input:focus, .bs-select:focus { border-color: #E9C77B; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF; }
        .bs-label { color: #A08B7D; font-size: 11px; font-weight: 700; margin: 0 0 4px; display: block; text-transform: uppercase; letter-spacing: 0.8px; }
        .bs-section { margin-bottom: 12px; }
        .bs-section:last-child { margin-bottom: 0; }
        .bs-help { color: #8A7B6C; font-size: 11px; margin: 4px 0 0; line-height: 1.5; }
        .bs-swatch { width: 38px; height: 34px; border: 1.5px solid #EAD9BE; border-radius: 9px; cursor: pointer; padding: 2px; background: #fff; flex-shrink: 0; }
        .bs-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .bs-back:hover { background: #FBEEDD; }
        .bs-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .bs-btn:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
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
      `}} />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
          <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start', cursor: 'pointer' }} />
          <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
            <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Branding Studio</h1>
            <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>{subtitle}</p>
          </div>
          <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
        </div>
        <div style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => router.push('/dashboard')} className="bs-back">Back to Dashboard</button>
          </div>
          {body}
        </div>
      </div>
      <Footer />
    </div>
  );

  if (!hasWhiteLabel) {
    return shell('Your logo, colors and slogan on your member portal.', (
      <div className="bs-card" style={{ ...cardStyle, maxWidth: 520, margin: '24px auto', textAlign: 'center' as const, padding: '34px 28px' }}>
        <div style={{ fontSize: 38, marginBottom: 10 }}>{'\u{1F512}'}</div>
        <h2 style={{ color: C.bordeauxDark, fontSize: 18, fontWeight: 800, margin: '0 0 10px' }}>White Label isn&apos;t included in your {planDisplayName || 'current'} plan</h2>
        <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.6, margin: '0 0 20px' }}>
          Custom logos, colors, and slogans for your groups are available starting with the Pro plan. Upgrade to unlock Branding Studio.
        </p>
        <button onClick={() => router.push('/dashboard/subscription')} className="bs-btn"
          style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: C.blanc, border: 'none', borderRadius: 12, padding: '11px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
          View Plans
        </button>
      </div>
    ));
  }

  if (groups.length === 0) {
    return shell('Your logo, colors and slogan on your member portal.', (
      <div className="bs-card" style={{ ...cardStyle, maxWidth: 520, margin: '24px auto', textAlign: 'center' as const, padding: '34px 28px' }}>
        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
          Create a group first to configure its branding.{' '}
          <span onClick={() => router.push('/dashboard/create-tontine')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Create a group</span>
        </p>
      </div>
    ));
  }

  const colorField = (label: string, value: string, set: (v: string) => void, help?: string) => (
    <div className="bs-section">
      <label className="bs-label">{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="color" className="bs-swatch" value={value} onChange={e => set(e.target.value)} />
        <input className="bs-input" value={value} onChange={e => set(e.target.value)} style={{ fontFamily: 'monospace' }} />
      </div>
      {help && <p className="bs-help">{help}</p>}
    </div>
  );

  const preview = (
    <div className="bs-card" style={{ ...cardStyle, padding: '16px 20px', position: viewMode === 'edit' ? 'sticky' as const : 'static' as const, top: 24 }}>
      <div className="bs-head">
        <span className="bs-ico" style={{ background: 'linear-gradient(135deg,#B39DDB,#6B2D4E)' }}>{'\u{1F441}\uFE0F'}</span>
        <h2 className="bs-title">Live Preview</h2>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: enabled ? C.greenBg : '#F3EEE7', color: enabled ? C.green : C.muted }}>{enabled ? 'White Label on' : 'White Label off'}</span>
      </div>

      {enabled && (
        <div style={{ background: '#FBF0D9', color: '#9C7A2E', borderRadius: 10, padding: '8px 12px', fontSize: 11.5, fontWeight: 700, marginBottom: 12, border: '1px solid #EBD9A8' }}>
          {'\u26A0'} Shows your real group data. This is a mockup layout, not the exact member portal design.
        </div>
      )}

      {!enabled ? (
        <div style={{ background: C.creme, borderRadius: 14, padding: '40px 20px', textAlign: 'center' as const }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>White Label is disabled for this group. Members see the default UNIMUNITY experience.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontFamily: `'${fontFamily}', sans-serif`, border: '1px solid #F0E4D6' }}>
          <div style={{ background: primaryColor, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxHeight: 50, maxWidth: 190, objectFit: 'contain' as const }} />
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: secondaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: primaryColor }}>{groupInitial}</div>
            )}
            <div>
              <div style={{ color: secondaryColor, fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{selectedGroup?.name || 'Your Group'}</div>
              {slogan && <div style={{ color: sloganColor, fontSize: `${sloganFontSize}px`, marginTop: 4 }}>{slogan}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', minHeight: 300 }}>
            <div style={{ width: 120, background: C.creme, borderRight: '1px solid #F0E4D6', padding: '16px 12px', flexShrink: 0 }}>
              {['Home', 'Members', 'Payments', 'Docs'].map((item, i) => (
                <div key={item} style={{ padding: '8px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: i === 0 ? primaryColor : C.muted, background: i === 0 ? secondaryColor + '33' : 'transparent', marginBottom: 5 }}>{item}</div>
              ))}
            </div>
            <div style={{ flex: 1, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  ['Members', statsLoading ? '...' : String(groupStats?.memberCount ?? 0)],
                  ['Collected', statsLoading ? '...' : `${groupStats?.currency || 'USD'} ${(groupStats?.totalCollected ?? 0).toFixed(0)}`],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: C.creme, borderRadius: 10, padding: 13 }}>
                    <p style={{ fontSize: 10.5, color: C.muted, margin: 0, textTransform: 'uppercase' as const }}>{label}</p>
                    <p style={{ fontSize: 19, fontWeight: 800, color: primaryColor, margin: '3px 0 0' }}>{val}</p>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid #F0E4D6', borderRadius: 10, overflow: 'hidden' }}>
                {statsLoading ? (
                  <div style={{ padding: 14, fontSize: 12, color: C.muted, textAlign: 'center' as const }}>Loading members...</div>
                ) : groupStats && groupStats.sampleMembers.length > 0 ? (
                  groupStats.sampleMembers.map((m, i) => (
                    <div key={m.name + i} style={{ padding: '10px 14px', fontSize: 12, color: C.text, borderBottom: i === 0 && groupStats.sampleMembers.length > 1 ? '1px solid #F0E4D6' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{m.name}</span>
                      <span style={{ color: m.active ? secondaryColor : C.muted, fontWeight: 700 }}>{m.active ? 'Active' : 'Paused'}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 14, fontSize: 12, color: C.muted, textAlign: 'center' as const }}>No members yet</div>
                )}
              </div>
            </div>
          </div>
          {showUNIMUNITYBadge && (
            <div style={{ textAlign: 'center' as const, padding: '9px 0', borderTop: '1px solid #F0E4D6' }}>
              <span style={{ color: C.muted, fontSize: 10.5 }}>Powered by UNIMUNITY</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return shell('Your logo, colors and slogan on your member portal.', (
    <>
      {/* Group + actions bar */}
      <div className="bs-card bs-bar" style={{ ...cardStyle, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0 }}>
          <span className="bs-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F3A8}'}</span>
          <h2 className="bs-title">Group</h2>
        </div>
        <select className="bs-select" value={selectedGroupId} onChange={e => handleGroupChange(e.target.value)} style={{ flex: 1, minWidth: 180, width: 'auto' }}>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div style={{ display: 'flex', background: C.creme, borderRadius: 10, padding: 3, border: '1px solid ' + C.orLight, flexShrink: 0 }}>
          {(['edit', 'preview'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: viewMode === m ? C.blanc : 'transparent', color: viewMode === m ? C.bordeaux : C.muted, boxShadow: viewMode === m ? '0 1px 4px rgba(74,31,56,0.12)' : 'none' }}>
              {m === 'edit' ? 'Edit' : 'Preview'}
            </button>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving} className="bs-btn"
          style={{ background: saved ? C.green : 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: C.blanc, border: 'none', padding: '8px 20px', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 800, opacity: saving ? 0.6 : 1, boxShadow: '0 6px 16px rgba(107,45,78,0.24)', flexShrink: 0 }}>
          {saving ? 'Saving...' : saved ? '\u2713 Saved' : 'Save Branding'}
        </button>
      </div>

      {viewMode === 'preview' ? preview : (
        <div className="bs-grid" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>

            <div className="bs-card" style={{ ...cardStyle, padding: '14px 18px' }}>
              <div className="bs-head">
                <span className="bs-ico" style={{ background: 'linear-gradient(135deg,#FCE4EC,#F4B6C7)' }}>{'\u{1F3F7}\uFE0F'}</span>
                <h2 className="bs-title">Identity</h2>
              </div>
              <div className="bs-section">
                <label className="bs-label">Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 54, height: 40, borderRadius: 9, border: '1px dashed #EAD9BE', background: '#FFFDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {logoUrl ? <img src={logoUrl} alt="Logo" style={{ maxHeight: 34, maxWidth: 50, objectFit: 'contain' as const }} /> : <span style={{ fontSize: 10, color: C.muted }}>None</span>}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bs-btn"
                    style={{ flex: 1, background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, padding: '8px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                    {uploading ? 'Uploading...' : logoUrl ? 'Replace' : 'Upload logo'}
                  </button>
                  {logoUrl && (
                    <button onClick={() => setLogoUrl('')}
                      style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Remove
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                {!logoUrl && <p className="bs-help">No custom logo: the group initial is shown.</p>}
              </div>
              <div className="bs-section">
                <label className="bs-label">Slogan</label>
                <input className="bs-input" value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Building wealth together" />
                <p className="bs-help">Shown under your group name on the member portal.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="bs-section">
                  <label className="bs-label">Slogan color</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="color" className="bs-swatch" value={sloganColor} onChange={e => setSloganColor(e.target.value)} />
                    <input className="bs-input" value={sloganColor} onChange={e => setSloganColor(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                  </div>
                </div>
                <div className="bs-section">
                  <label className="bs-label">Slogan size</label>
                  <select className="bs-select" value={sloganFontSize} onChange={e => setSloganFontSize(Number(e.target.value))}>
                    {SLOGAN_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bs-card" style={{ ...cardStyle, padding: '14px 18px' }}>
              <div className="bs-head">
                <span className="bs-ico" style={{ background: 'linear-gradient(135deg,#66BB6A,#2E7D32)' }}>{'\u{1F58C}\uFE0F'}</span>
                <h2 className="bs-title">Colors &amp; Font</h2>
              </div>
              {colorField('Primary color', primaryColor, setPrimaryColor, 'Header background.')}
              {colorField('Secondary color', secondaryColor, setSecondaryColor, 'Used for accents and highlights.')}
              <div className="bs-section">
                <label className="bs-label">Font</label>
                <select className="bs-select" value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={{ fontFamily: `'${fontFamily}', sans-serif` }}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="bs-card" style={{ ...cardStyle, padding: '14px 18px' }}>
              <div className="bs-head">
                <span className="bs-ico" style={{ background: 'linear-gradient(135deg,#B39DDB,#6B2D4E)' }}>{'\u2699\uFE0F'}</span>
                <h2 className="bs-title">Options</h2>
              </div>
              <div className="bs-section">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.bordeaux }} />
                  <span style={{ color: C.bordeauxDark, fontWeight: 700, fontSize: 13 }}>Enable White Label</span>
                </label>
                <p className="bs-help">Turn off to revert this group to the default UNIMUNITY look.</p>
              </div>
              <div className="bs-section">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: canHideBadge ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" checked={canHideBadge ? showUNIMUNITYBadge : true} disabled={!canHideBadge}
                    onChange={e => setShowUNIMUNITYBadge(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: canHideBadge ? 'pointer' : 'not-allowed', accentColor: C.bordeaux, opacity: canHideBadge ? 1 : 0.6 }} />
                  <span style={{ color: C.bordeauxDark, fontWeight: 700, fontSize: 13, opacity: canHideBadge ? 1 : 0.6 }}>Show &quot;Powered by UNIMUNITY&quot;</span>
                </label>
                {!canHideBadge && <p className="bs-help">Hiding this badge is available from the Business plan.</p>}
              </div>
              <button onClick={handleReset}
                style={{ width: '100%', background: '#FFEBEE', color: '#C62828', border: 'none', padding: '8px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                Reset to UNIMUNITY default
              </button>
              <p className="bs-help" style={{ marginTop: 10 }}>Changes apply only to this group&apos;s member portal. Each group keeps its own branding.</p>
            </div>
          </div>

          {preview}
        </div>
      )}
    </>
  ));
}
