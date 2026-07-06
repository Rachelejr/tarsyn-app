'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

const SUPER_ADMIN_EMAIL = 'rachelejr779@gmail.com';

const C = {
  bleu: '#6B2D4E', bleuFonce: '#4A1F38', or: '#E9C77B',
  creme: '#FBEEDD', ivoire: '#FFFDF7', border: '#EAD9BE',
  texteGris: '#7A9490', texteFonce: '#3A2F1F',
};

function computeTynId(fullName: string, seq: number) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'XX-' + String(seq).padStart(3, '0');
  const first = parts[0][0]?.toUpperCase() || 'X';
  const last = parts.length > 1 ? (parts[parts.length - 1][0]?.toUpperCase() || 'X') : first;
  return first + last + '-' + String(seq).padStart(3, '0');
}

export default function MigrateTynIdPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email === SUPER_ADMIN_EMAIL) setAuthorized(true);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const buildPreview = async () => {
    setLog([]);
    addLog('Loading groups...');
    const groupsSnap = await getDocs(collection(db, 'groups'));
    const allChanges: any[] = [];

    for (const groupDoc of groupsSnap.docs) {
      const group = groupDoc.data();
      const mq = query(
        collection(db, 'members'),
        where('groupId', '==', groupDoc.id)
      );
      const msnap = await getDocs(mq);
      const members = msnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

      members.forEach((m: any, idx: number) => {
        const newId = computeTynId(m.fullName, idx + 1);
        if (m.tynId !== newId) {
          allChanges.push({
            memberId: m.id,
            fullName: m.fullName || '(no name)',
            groupName: group.name || groupDoc.id,
            oldTynId: m.tynId || 'â€”',
            newTynId: newId,
          });
        }
      });
    }
    addLog(`Found ${allChanges.length} member(s) to update.`);
    setPreview(allChanges);
  };

  useEffect(() => { if (authorized) buildPreview(); }, [authorized]);

  const runMigration = async () => {
    setRunning(true);
    addLog('Starting migration...');
    let count = 0;
    for (const change of preview) {
      try {
        await updateDoc(doc(db, 'members', change.memberId), { tynId: change.newTynId });
        count++;
        addLog(`âœ“ ${change.fullName}: ${change.oldTynId} â†’ ${change.newTynId}`);
      } catch (e: any) {
        addLog(`âœ— Failed for ${change.fullName}: ${e.message}`);
      }
    }
    addLog(`Done. ${count}/${preview.length} member(s) updated.`);
    setRunning(false);
    setDone(true);
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
        <a href="/login?redirect=/admin/migrate-tynid" style={{ background: C.bleu, color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
          Sign in again
        </a>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: C.bleuFonce, fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>TYN-ID Migration Tool</h1>
        <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 24px' }}>
          One-time tool: recalculates every member&apos;s TYN-ID to the new format (initials + sequential number per tontine).
          This only needs to be run once. Safe to leave this page afterwards.
        </p>

        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(74,31,56,0.08)' }}>
          <h3 style={{ color: C.texteFonce, fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>
            Preview â€” {preview.length} member(s) will change
          </h3>
          {preview.length === 0 ? (
            <p style={{ color: C.texteGris, fontSize: '13px' }}>Nothing to migrate â€” all TYN-IDs are already up to date, or loading...</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {preview.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: '13px' }}>
                  <span style={{ color: C.texteFonce, fontWeight: 600 }}>{c.fullName} <span style={{ color: C.texteGris, fontWeight: 400 }}>({c.groupName})</span></span>
                  <span style={{ color: C.texteGris }}>{c.oldTynId} â†’ <strong style={{ color: C.bleuFonce }}>{c.newTynId}</strong></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {preview.length > 0 && !done && (
          <button onClick={runMigration} disabled={running}
            style={{ background: C.bleu, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1 }}>
            {running ? 'Running migration...' : `Migrate ${preview.length} member(s) now`}
          </button>
        )}

        {done && (
          <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '14px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '14px' }}>
            Migration complete.
          </div>
        )}

        {log.length > 0 && (
          <div style={{ background: '#2C1020', color: '#B8E4DE', borderRadius: '10px', padding: '16px', marginTop: '20px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '260px', overflowY: 'auto' }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
