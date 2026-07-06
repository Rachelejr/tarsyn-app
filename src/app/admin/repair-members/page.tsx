'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const C = {
  bleu: '#6E93AC', bleuFonce: '#4A6B85', or: '#E9C77B',
  creme: '#FBEEDD', ivoire: '#FFFDF7', border: '#EAD9BE',
  texteGris: '#7A9490', texteFonce: '#3A2F1F',
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
      // First try normally.
      let ok = await checkRole(u, false);
      if (!ok) {
        // Token may be stale — force a refresh and try once more before
        // concluding the person really isn't authorized.
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
      <p style={{ color: C.bleu }}>Checking access...</p>
    </div>
  );

  if (!authorized) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.creme, gap: '12px', padding: '20px', textAlign: 'center' }}>
      <p style={{ color: '#C62828', fontWeight: 700 }}>
        {sessionExpired ? 'Your session has expired.' : 'Access denied.'}
      </p>
      {sessionExpired && (
        <a href="/login" style={{ background: C.bleu, color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
          Sign in again
        </a>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: C.bleuFonce, fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Repair Member Records</h1>
        <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 24px' }}>
          Finds members missing an organizerId (which blocks document uploads) and fixes them by
          looking up their group&apos;s organizerId. Safe to run anytime.
        </p>

        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(74,107,133,0.08)' }}>
          <h3 style={{ color: C.texteFonce, fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>
            {scanning ? 'Scanning...' : `${broken.length} of ${total} members need repair`}
          </h3>
          {!scanning && broken.length === 0 && (
            <p style={{ color: '#2E7D32', fontSize: '13px' }}>All member records look healthy.</p>
          )}
          {!scanning && broken.length > 0 && (
            <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {broken.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: '13px' }}>
                  <span style={{ color: C.texteFonce, fontWeight: 600 }}>{m.fullName}</span>
                  <span style={{ color: C.texteGris, fontFamily: 'monospace', fontSize: '11px' }}>{m.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {broken.length > 0 && (
          <button onClick={runRepair} disabled={repairing}
            style={{ background: C.bleu, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: repairing ? 'not-allowed' : 'pointer', opacity: repairing ? 0.6 : 1 }}>
            {repairing ? 'Repairing...' : `Repair ${broken.length} member(s) now`}
          </button>
        )}

        {result && (
          <div style={{ marginTop: '20px', background: '#1F3542', color: '#B8E4DE', borderRadius: '10px', padding: '16px', fontSize: '12px', fontFamily: 'monospace' }}>
            <p>Fixed: {result.fixedCount}</p>
            {result.fixed?.map((f: any, i: number) => (
              <div key={i}>OK - {f.fullName} -&gt; organizerId {f.organizerId}</div>
            ))}
            {result.stillBrokenCount > 0 && (
              <>
                <p style={{ marginTop: '10px' }}>Still broken: {result.stillBrokenCount}</p>
                {result.stillBroken.map((f: any, i: number) => (
                  <div key={i}>FAIL - {f.fullName}: {f.reason}</div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}