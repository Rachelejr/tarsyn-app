'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Footer from '@/components/Footer';
import DateTimeWeather from '@/components/DateTimeWeather';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38', or: '#E9C77B', orLight: '#F0DCA8',
  creme: '#FBEEDD', ivoire: '#FFFDF7', border: '#EAD9BE',
  texteGris: '#8A7A6D', texteFonce: '#3A2F1F',
};

export default function RepairMembersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScanAt, setLastScanAt] = useState('');
  const [repairing, setRepairing] = useState(false);
  const [broken, setBroken] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const checkRole = async (u: any, forceRefresh: boolean): Promise<boolean> => {
    try {
      if (forceRefresh) {
        await u.getIdToken(true);
      }
      const snap = await getDoc(doc(db, 'users', u.uid));
      const role = snap.exists() ? snap.data().role : null;
      return role === 'superadmin';
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setAuthorized(false);
        setChecking(false);
        return;
      }
      let ok = await checkRole(u, false);
      if (!ok) {
        ok = await checkRole(u, true);
        if (!ok) setSessionExpired(true);
      }
      setAuthorized(ok);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  // The repair API only answers signed-in admins, so every call carries
  // the current Firebase ID token.
  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  };

  const scan = async () => {
    setScanning(true);
    setResult(null);
    const started = Date.now();
    try {
      const res = await fetch('/api/repair-members', { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed.');
      setBroken(data.broken || []);
      setTotal(data.total || 0);
      setLastScanAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      alert((e as Error).message || 'Scan failed.');
    } finally {
      // Keep "Scanning..." visible a moment, so a fast scan is still noticeable.
      const wait = Math.max(0, 700 - (Date.now() - started));
      setTimeout(() => setScanning(false), wait);
    }
  };

  useEffect(() => { if (authorized) scan(); }, [authorized]);

  const runRepair = async () => {
    if (!confirm(`Repair ${broken.length} member record(s)? This updates them directly in the database.`)) return;
    setRepairing(true);
    try {
      const res = await fetch('/api/repair-members', { method: 'POST', headers: await authHeaders() });
      const data = await res.json();
      setResult(data);
      await scan();
    } catch (e) {
      alert('Repair failed.');
    } finally {
      setRepairing(false);
    }
  };

  // Empty shells (no name, no email, no account, no organizer) are deleted,
  // with a copy kept in deletedMembers. Real members are never touched.
  const emptyIds = broken.filter((m: any) => m.emptyRecord).map((m: any) => m.id);
  const deleteEmpty = async () => {
    if (emptyIds.length === 0) return;
    if (!confirm(`Delete ${emptyIds.length} empty record(s)? They have no name, no email and no account. A copy is kept.`)) return;
    setRepairing(true);
    try {
      const res = await fetch('/api/repair-members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ memberIds: emptyIds }),
      });
      const data = await res.json();
      setResult({ fixedCount: 0, fixed: [], stillBrokenCount: (data.refused || []).length, stillBroken: (data.refused || []).map((id: string) => ({ fullName: id, reason: 'Not empty - kept' })), error: res.ok ? undefined : data.error });
      await scan();
    } catch (e) {
      alert('Delete failed.');
    } finally {
      setRepairing(false);
    }
  };

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.creme }}>
      <p style={{ color: C.bordeaux, fontWeight: 600, fontSize: '14px' }}>Checking access...</p>
    </div>
  );

  if (!authorized) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.creme, gap: '12px', padding: '20px', textAlign: 'center' }}>
      <p style={{ color: '#C62828', fontWeight: 700 }}>
        {sessionExpired ? 'Your session has expired.' : 'Access denied.'}
      </p>
      {sessionExpired && (
        <a href="/login?redirect=/admin/repair-members" style={{ background: C.bordeaux, color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
          Sign in again
        </a>
      )}
    </div>
  );

  const missingLink = broken.filter(m => m.needsOrganizerFix).length;
  const legacyIds = broken.filter(m => m.needsTynIdFix).length;
  const noName = broken.filter(m => !m.fullName || m.fullName === '(no name)').length;

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .rp2-grid { grid-template-columns: 1fr !important; } }
        .rp2-card { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 18px; box-shadow: 0 2px 14px rgba(107,45,78,0.06); }
        .rp2-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .rp2-back:hover { background: #FBEEDD; }
        .rp2-row:hover { background: #FFFBF5 !important; }
        .rp2-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .rp2-btn:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
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
        <div style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Repair Member Records</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Relinks missing organizers and upgrades legacy IDs to the TYN-ID format.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="rp2-back">Back to Dashboard</button>
        </div>

        <div className="rp2-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div className="rp2-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3E6D8', display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: 'linear-gradient(135deg,#E9C77B,#C9974D)', boxShadow: '0 4px 10px rgba(74,31,56,0.18)' }}>{'\u{1F6E0}\uFE0F'}</span>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#4A1F38' }}>
                  {scanning ? 'Scanning member records...' : 'Records to Repair'} {!scanning && <span style={{ fontSize: 12, fontWeight: 600, color: '#8A7B6C' }}>({broken.length})</span>}
                </h2>
                {!scanning && (
                  <span style={{ marginLeft: 'auto', background: broken.length === 0 ? '#E3F2E8' : C.orLight, color: broken.length === 0 ? '#2E7D32' : C.bordeauxDark, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999 }}>
                    {broken.length === 0 ? 'Healthy' : 'Needs attention'}
                  </span>
                )}
              </div>

              {!scanning && broken.length === 0 && (
                <p style={{ color: '#2E7D32', fontSize: 13.5, fontWeight: 600, margin: 0, padding: '30px 20px', textAlign: 'center' }}>{'\u2713'} All member records look healthy.</p>
              )}

              {!scanning && broken.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 180px', gap: 10, padding: '9px 20px', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>
                    {['#', 'Member / Issue', 'TYN-ID change'].map(h => (
                      <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#FBEEDD', textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</span>
                    ))}
                  </div>
                  <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                    {broken.map((m, i) => (
                      <div key={i} className="rp2-row" style={{ display: 'grid', gridTemplateColumns: '36px 1fr 180px', gap: 10, alignItems: 'center', padding: '9px 20px', borderBottom: '1px solid #F7EEE3', background: i % 2 ? '#FFFDF9' : '#FFFFFF' }}>
                        <span style={{ fontSize: 12, color: '#8A7B6C' }}>{i + 1}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: m.fullName === '(no name)' ? '#B0525F' : C.texteFonce, fontStyle: m.fullName === '(no name)' ? 'italic' : 'normal' }}>{m.fullName}</p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {m.needsOrganizerFix && <span style={{ fontSize: 10, fontWeight: 700, color: C.bordeaux, background: '#F3E6EC', padding: '2px 7px', borderRadius: 6 }}>Missing admin link</span>}
                            {m.needsTynIdFix && <span style={{ fontSize: 10, fontWeight: 700, color: '#8A6A2A', background: C.orLight, padding: '2px 7px', borderRadius: 6 }}>Legacy ID</span>}
                            {m.groupId && <span style={{ fontSize: 10, color: '#8A7B6C', fontFamily: 'monospace' }}>group {String(m.groupId).slice(0, 8)}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          {m.needsTynIdFix ? (
                            <>
                              <span style={{ color: C.texteGris, fontFamily: 'monospace', fontSize: 10, textDecoration: 'line-through', opacity: 0.7 }}>{m.currentTynId || '(none)'}</span>
                              <span style={{ color: C.texteGris, fontSize: 11 }}>{'\u2192'}</span>
                              <span style={{ color: C.bordeauxDark, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, background: C.orLight, padding: '3px 9px', borderRadius: 6 }}>{m.newTynId}</span>
                            </>
                          ) : (
                            <span style={{ color: C.bordeaux, fontFamily: 'monospace', fontSize: 11, background: C.orLight, padding: '3px 9px', borderRadius: 6 }}>{m.currentTynId}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {result && (
              <div className="rp2-card" style={{ padding: '14px 20px' }}>
                <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#2E7D32' }}>{'\u2713'} Fixed: {result.fixedCount ?? 0}</p>
                {result.fixed?.map((f: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: '#3A2F1F', fontFamily: 'monospace', padding: '2px 0' }}>
                    {f.fullName}{f.organizerId ? ' \u2192 organizer linked' : ''}{f.tynId ? ' \u2192 ' + f.tynId : ''}
                  </div>
                ))}
                {result.stillBrokenCount > 0 && (
                  <>
                    <p style={{ margin: '12px 0 6px', fontSize: 14, fontWeight: 800, color: '#C62828' }}>Still broken: {result.stillBrokenCount}</p>
                    {result.stillBroken.map((f: any, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: '#3A2F1F', fontFamily: 'monospace', padding: '2px 0' }}>{'\u2717'} {f.fullName}: {f.reason}</div>
                    ))}
                  </>
                )}
                {result.error && <p style={{ margin: 0, fontSize: 13, color: '#C62828', fontWeight: 600 }}>{result.error}</p>}
              </div>
            )}
          </div>

          <div className="rp2-card" style={{ padding: 22, position: 'sticky', top: 24 }}>
            <div style={{ textAlign: 'center', margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '18px 18px 0 0', borderBottom: '1px solid #F0E4D6' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>Platform Records</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: 1.2 }}>Repair Summary</p>
            </div>
            {[
              { label: 'Total members', value: scanning ? '-' : String(total) },
              { label: 'Need repair', value: scanning ? '-' : String(broken.length), color: broken.length ? '#C62828' : '#2E7D32' },
              { label: 'Missing admin link', value: scanning ? '-' : String(missingLink) },
              { label: 'Legacy ID', value: scanning ? '-' : String(legacyIds) },
              { label: 'No name', value: scanning ? '-' : String(noName), color: noName ? '#B0525F' : undefined },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                <span style={{ fontSize: 12, color: '#8A7B6C' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color || C.texteFonce }}>{item.value}</span>
              </div>
            ))}

            {noName > 0 && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: '#FBF0D9', borderRadius: 10, border: '1px solid #EBD9A8' }}>
                <p style={{ fontSize: 11.5, color: '#9C7A2E', margin: 0, lineHeight: 1.55, fontWeight: 600 }}>
                  {noName} record(s) have no name. Check them in Firestore before repairing: they may be leftovers that should be deleted instead.
                </p>
              </div>
            )}

            {broken.length > 0 && (
              <button onClick={runRepair} disabled={repairing} className="rp2-btn"
                style={{ width: '100%', marginTop: 14, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FFFFFF', border: 'none', padding: 11, borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: repairing ? 'not-allowed' : 'pointer', opacity: repairing ? 0.7 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {repairing ? (
                  <>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid ' + C.or, borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Repairing...
                  </>
                ) : `Repair ${broken.length} member(s) now`}
              </button>
            )}
            {emptyIds.length > 0 && (
              <button onClick={deleteEmpty} disabled={repairing} className="rp2-btn"
                style={{ width: '100%', marginTop: 8, background: '#FFEBEE', color: '#C62828', border: 'none', padding: 10, borderRadius: 14, fontSize: 13.5, fontWeight: 800, cursor: repairing ? 'not-allowed' : 'pointer' }}>
                Delete {emptyIds.length} empty record(s)
              </button>
            )}
            <button onClick={scan} disabled={scanning} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: '#6B2D4E', fontSize: 12.5, fontWeight: 700, cursor: scanning ? 'not-allowed' : 'pointer', textDecoration: 'underline' }}>
              {scanning ? 'Scanning...' : 'Scan again'}
            </button>
            {lastScanAt && !scanning && (
              <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 11, color: '#8A7B6C' }}>{'\u2713'} Last checked at {lastScanAt}</p>
            )}
          </div>
        </div>
      </div>

      </div>
      <Footer />
    </div>
  );
}
