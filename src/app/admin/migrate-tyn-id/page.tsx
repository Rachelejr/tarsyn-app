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

export default function MigrateTynIdPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
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

  const scanPreview = async () => {
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/migrate-tyn-id');
      const data = await res.json();
      setPreview(data.preview || []);
    } catch (e) {
      alert('Scan failed.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => { if (authorized) scanPreview(); }, [authorized]);

  const runMigration = async () => {
    if (!confirm('This will update TYN-IDs for ' + preview.length + ' member(s). Continue?')) return;
    setMigrating(true);
    try {
      const res = await fetch('/api/migrate-tyn-id', { method: 'POST' });
      const data = await res.json();
      setResult(data);
      await scanPreview();
    } catch (e) {
      alert('Migration failed.');
    } finally {
      setMigrating(false);
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
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ color: C.bleuFonce, fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Migrate TYN-IDs</h1>
        <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 24px' }}>
          Converts old-format TYN-IDs (TYN-XX-000000) to the new initials+sequence format (e.g. JD-001),
          grouped and numbered per tontine group. Members already using the new format are skipped.
        </p>

        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(74,107,133,0.08)' }}>
          <h3 style={{ color: C.texteFonce, fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>
            {scanning ? 'Scanning...' : `${preview.length} member(s) need migration`}
          </h3>
          {!scanning && preview.length === 0 && (
            <p style={{ color: '#2E7D32', fontSize: '13px' }}>All TYN-IDs are already in the new format.</p>
          )}
          {!scanning && preview.length > 0 && (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: C.texteGris, fontSize: '11px' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: C.texteGris, fontSize: '11px' }}>Old ID</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: C.texteGris, fontSize: '11px' }}>New ID</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((m, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '6px 8px', color: C.texteFonce, fontWeight: 600 }}>{m.fullName}</td>
                      <td style={{ padding: '6px 8px', color: C.texteGris, fontFamily: 'monospace' }}>{m.oldId}</td>
                      <td style={{ padding: '6px 8px', color: '#2E7D32', fontFamily: 'monospace', fontWeight: 700 }}>{m.newId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {preview.length > 0 && (
          <button onClick={runMigration} disabled={migrating}
            style={{ background: C.bleu, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: migrating ? 'not-allowed' : 'pointer', opacity: migrating ? 0.6 : 1 }}>
            {migrating ? 'Migrating...' : `Migrate ${preview.length} member(s) now`}
          </button>
        )}

        {result && (
          <div style={{ marginTop: '20px', background: '#1F3542', color: '#B8E4DE', borderRadius: '10px', padding: '16px', fontSize: '12px', fontFamily: 'monospace' }}>
            <p>Migrated: {result.migratedCount}</p>
            {result.migrated?.map((f: any, i: number) => (
              <div key={i}>OK - {f.fullName}: {f.oldId} -&gt; {f.newId}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}