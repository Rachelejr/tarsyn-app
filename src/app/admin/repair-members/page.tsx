'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38', or: '#E9C77B', orLight: '#F0DCA8',
  creme: '#FBEEDD', ivoire: '#FFFDF7', border: '#EAD9BE',
  texteGris: '#8A7A6D', texteFonce: '#3A2F1F',
};

export default function RepairMembersPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [broken, setBroken] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hover, setHover] = useState(false);

  const checkRole = async (u: any, forceRefresh: boolean): Promise<boolean> => {
    try {
      if (forceRefresh) {
        await u.getIdToken(true);
      }
      const snap = await getDoc(doc(db, 'users', u.uid));
      const role = snap.exists() ? snap.data().role : null;
      return role === 'admin' || role === 'superadmin';
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

  const scan = async () => {
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/repair-members');
      const data = await res.json();
      setBroken(data.broken || []);
      setTotal(data.total || 0);
    } catch (e) {
      alert('Scan failed.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => { if (authorized) scan(); }, [authorized]);

  const runRepair = async () => {
    setRepairing(true);
    try {
      const res = await fetch('/api/repair-members', { method: 'POST' });
      const data = await res.json();
      setResult(data);
      await scan();
    } catch (e) {
      alert('Repair failed.');
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

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${C.creme} 0%, ${C.ivoire} 100%)`, fontFamily: 'Inter, sans-serif', padding: '48px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: `linear-gradient(135deg, ${C.bordeaux}, ${C.bordeauxDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(107,45,78,0.25)', flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.or} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div>
            <h1 style={{ color: C.bordeauxDark, fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
              Repair Member Records
            </h1>
            <p style={{ color: C.texteGris, fontSize: '13px', margin: '2px 0 0' }}>
              Finds members missing an organizerId and relinks them via their group.
            </p>
          </div>
        </div>

        <div style={{ height: '1px', background: `linear-gradient(90deg, ${C.or}, transparent)`, margin: '20px 0 28px' }} />

        {/* Status card */}
        <div style={{
          background: C.ivoire, borderRadius: '18px', padding: '26px',
          marginBottom: '20px', border: `1px solid ${C.border}`,
          boxShadow: '0 4px 20px rgba(107,45,78,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: broken.length > 0 ? '16px' : 0 }}>
            <h3 style={{ color: C.texteFonce, fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {scanning ? 'Scanning member records...' : `${broken.length} of ${total} members need repair`}
            </h3>
            {!scanning && (
              <span style={{
                background: broken.length === 0 ? '#E3F2E8' : C.orLight,
                color: broken.length === 0 ? '#2E7D32' : C.bordeauxDark,
                fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px',
              }}>
                {broken.length === 0 ? 'Healthy' : 'Needs attention'}
              </span>
            )}
          </div>

          {!scanning && broken.length === 0 && (
            <p style={{ color: '#2E7D32', fontSize: '13px', margin: 0 }}>✓ All member records look healthy.</p>
          )}

          {!scanning && broken.length > 0 && (
            <div style={{ maxHeight: '280px', overflowY: 'auto', borderRadius: '10px', border: `1px solid ${C.border}` }}>
              {broken.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 14px',
                  borderBottom: i < broken.length - 1 ? `1px solid ${C.border}` : 'none',
                  fontSize: '13px', background: i % 2 === 0 ? C.ivoire : C.creme,
                }}>
                  <span style={{ color: C.texteFonce, fontWeight: 600 }}>{m.fullName}</span>
                  <span style={{
                    color: C.bordeaux, fontFamily: 'monospace', fontSize: '11px',
                    background: C.orLight, padding: '2px 8px', borderRadius: '6px',
                  }}>{m.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Repair button */}
        {broken.length > 0 && (
          <button
            onClick={runRepair}
            disabled={repairing}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              background: repairing ? C.bordeauxDark : (hover ? C.bordeauxDark : C.bordeaux),
              color: C.ivoire, border: 'none', padding: '13px 26px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 700, cursor: repairing ? 'not-allowed' : 'pointer',
              opacity: repairing ? 0.7 : 1,
              boxShadow: hover && !repairing ? '0 6px 18px rgba(107,45,78,0.35)' : '0 3px 10px rgba(107,45,78,0.2)',
              transition: 'all 0.18s ease',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
            }}>
            {repairing ? (
              <>
                <span style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: `2px solid ${C.or}`, borderTopColor: 'transparent',
                  display: 'inline-block', animation: 'spin 0.7s linear infinite',
                }} />
                Repairing...
              </>
            ) : `Repair ${broken.length} member(s) now`}
          </button>
        )}

        {/* Result log */}
        {result && (
          <div style={{
            marginTop: '22px', background: C.bordeauxDark, color: C.orLight,
            borderRadius: '14px', padding: '18px 20px', fontSize: '12px',
            fontFamily: 'monospace', boxShadow: '0 4px 16px rgba(74,31,56,0.3)',
          }}>
            <p style={{ color: C.or, fontWeight: 700, margin: '0 0 8px' }}>Fixed: {result.fixedCount}</p>
            {result.fixed?.map((f: any, i: number) => (
              <div key={i} style={{ opacity: 0.9 }}>✓ {f.fullName} → organizerId {f.organizerId}</div>
            ))}
            {result.stillBrokenCount > 0 && (
              <>
                <p style={{ color: '#E8A0A0', fontWeight: 700, margin: '14px 0 8px' }}>Still broken: {result.stillBrokenCount}</p>
                {result.stillBroken.map((f: any, i: number) => (
                  <div key={i} style={{ opacity: 0.9 }}>✗ {f.fullName}: {f.reason}</div>
                ))}
              </>
            )}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
