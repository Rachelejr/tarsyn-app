'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authHeaders } from '@/lib/authFetch';
import AppPage from '@/components/assistants/AppPage';
import RightsLists from '@/components/assistants/RightsLists';
import { MAX_ASSISTANTS, OPTIONAL_RIGHTS, STATUS_LABEL, type AssistantPublic, type AssistantRights, type AssistantStatus } from '@/lib/assistants';

const STATUS_STYLE: Record<AssistantStatus, { bg: string; fg: string }> = {
  invited: { bg: '#FBF2DC', fg: '#9C7A2E' },
  active: { bg: '#E9F3EC', fg: '#3F7D5C' },
  suspended: { bg: '#F8E8EA', fg: '#B0525F' },
  expired: { bg: '#EFEAE6', fg: '#8A7B6C' },
  removed: { bg: '#EFEAE6', fg: '#8A7B6C' },
};

function fmt(ms: number | null) {
  return ms ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

export default function MyAssistantsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [list, setList] = useState<AssistantPublic[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<AssistantPublic | null>(null);
  const [editRights, setEditRights] = useState<AssistantRights>({ manageMembers: false, referrals: false });
  const [editUntil, setEditUntil] = useState('');
  const [tomorrow] = useState(() => new Date(Date.now() + 864e5).toISOString().slice(0, 10));

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/assistants', { headers: await authHeaders('admin') });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load your assistants.');
      setList(data.assistants || []);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/login?redirect=/dashboard/assistants'); return; }
      load();
    });
    return () => unsub();
  }, [router, load]);

  const act = async (a: AssistantPublic, action: string, extra: Record<string, unknown> = {}) => {
    if (action === 'remove' && !confirm(`Remove ${a.firstName} ${a.lastName}? They will lose access to your groups right away.`)) return;
    if (action === 'suspend' && !confirm(`Suspend ${a.firstName}? They will not be able to work in your groups until you restore them.`)) return;
    setBusy(a.id + action);
    setNotice('');
    try {
      const res = await fetch('/api/assistants/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders('admin')) },
        body: JSON.stringify({ id: a.id, action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update this assistant.');
      if (action === 'resend') setNotice(data.emailSent ? `A new invitation was sent to ${a.email}.` : 'The new invitation is ready, but the email could not be sent. Link: ' + data.link);
      if (action === 'update') setEditing(null);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy('');
  };

  const places = list.filter(a => a.status !== 'removed');
  const free = Math.max(0, MAX_ASSISTANTS - places.length);

  return (
    <AppPage title="My Assistants" subtitle="People who help you manage your groups, with their own account." back={{ label: 'Back to Dashboard', href: '/dashboard' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'start' }} className="as-grid">
        <style>{`@media (max-width: 900px) { .as-grid { grid-template-columns: 1fr !important; } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="ap-card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span className="ap-ico" style={{ background: 'linear-gradient(135deg,#B39DDB,#6B2D4E)', width: 42, height: 42, fontSize: 20 }}>{'\u{1F465}'}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#4A1F38' }}>{places.length} of {MAX_ASSISTANTS} places used</p>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#8A7B6C' }}>Assistants are optional. Each one helps you in all your groups, within the limits shown on the right.</p>
            </div>
            {free > 0 && (
              <button className="ap-btn ap-primary" onClick={() => router.push('/dashboard/assistants/invite')}>+ Invite an assistant</button>
            )}
          </div>

          {notice && <div style={{ background: '#E9F3EC', border: '1px solid #A9CDB8', color: '#3F7D5C', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>{notice}</div>}
          {error && <div style={{ background: '#FDECEE', border: '1px solid #F2C4CB', color: '#B0525F', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>{error}</div>}

          {!ready ? (
            <div className="ap-card"><p style={{ margin: 0, color: '#8A7B6C', fontSize: 13 }}>Loading...</p></div>
          ) : (
            Array.from({ length: MAX_ASSISTANTS }).map((_, i) => {
              const a = places[i];
              if (!a) {
                return (
                  <div key={'free' + i} className="ap-card" style={{ borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#FFFDF9' }}>
                    <span style={{ width: 46, height: 46, borderRadius: '50%', border: '2px dashed #EAD9BE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9974D', fontSize: 20, fontWeight: 800 }}>+</span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#4A1F38' }}>Assistant {i + 1} - place available</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#8A7B6C' }}>Invite an assistant (optional).</p>
                    </div>
                    <button className="ap-btn ap-soft" onClick={() => router.push('/dashboard/assistants/invite')}>Invite</button>
                  </div>
                );
              }
              const st = STATUS_STYLE[a.status];
              return (
                <div key={a.id} className="ap-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#E9C77B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {(a.firstName[0] || '') + (a.lastName[0] || '')}
                    </span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#4A1F38' }}>{a.firstName} {a.lastName} <span style={{ fontSize: 12, fontWeight: 700, color: '#C9974D' }}>{'\u00b7'} {a.title}</span></p>
                      <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#8A7B6C' }}>{a.email} {'\u00b7'} {a.phone}</p>
                    </div>
                    <span style={{ background: st.bg, color: st.fg, fontSize: 11, fontWeight: 800, padding: '4px 11px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.6 }}>{STATUS_LABEL[a.status]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0 0' }}>
                    {OPTIONAL_RIGHTS.map(r => (
                      <span key={r.key} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: a.rights[r.key] ? '#E9F3EC' : '#F5F0EA', color: a.rights[r.key] ? '#3F7D5C' : '#A08B7D' }}>
                        {a.rights[r.key] ? '\u2713' : '\u2715'} {r.label}
                      </span>
                    ))}
                    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#FDF6EC', color: '#6B2D4E' }}>
                      {a.accessUntil ? 'Access until ' + a.accessUntil : 'No end date'}
                    </span>
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#A08B7D' }}>
                    Invited {fmt(a.invitedAt)}{a.acceptedAt ? ' \u00b7 joined ' + fmt(a.acceptedAt) : a.status === 'invited' && a.inviteExpiresAt ? ' \u00b7 invitation valid until ' + fmt(a.inviteExpiresAt) : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3E6D8' }}>
                    <button className="ap-btn ap-soft" style={{ height: 34, fontSize: 12.5 }} disabled={!!busy}
                      onClick={() => { setEditing(a); setEditRights({ ...a.rights }); setEditUntil(a.accessUntil || ''); }}>Edit rights</button>
                    {(a.status === 'invited' || a.status === 'expired') && !a.acceptedAt && (
                      <button className="ap-btn ap-soft" style={{ height: 34, fontSize: 12.5 }} disabled={!!busy} onClick={() => act(a, 'resend')}>
                        {busy === a.id + 'resend' ? 'Sending...' : 'Resend invitation'}
                      </button>
                    )}
                    {a.status === 'suspended' ? (
                      <button className="ap-btn ap-soft" style={{ height: 34, fontSize: 12.5 }} disabled={!!busy} onClick={() => act(a, 'resume')}>Restore access</button>
                    ) : a.status === 'active' ? (
                      <button className="ap-btn ap-soft" style={{ height: 34, fontSize: 12.5 }} disabled={!!busy} onClick={() => act(a, 'suspend')}>Suspend</button>
                    ) : null}
                    <span style={{ flex: 1 }} />
                    <button className="ap-btn" style={{ height: 34, fontSize: 12.5, background: '#FFEBEE', color: '#C62828' }} disabled={!!busy} onClick={() => act(a, 'remove')}>Remove</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="ap-card">
          <div className="ap-head">
            <span className="ap-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F6E1}'}</span>
            <h2 className="ap-title">What an assistant can do</h2>
          </div>
          <RightsLists compact />
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#8A7B6C', lineHeight: 1.5 }}>Optional rights (members, join requests) are chosen for each assistant. Every action is recorded in your Audit Log with the assistant&apos;s name.</p>
        </div>
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(44,16,32,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="ap-card" style={{ width: '100%', maxWidth: 460, padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', padding: '16px 22px' }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, color: '#E9C77B', letterSpacing: 1.4, textTransform: 'uppercase' }}>Edit rights</p>
              <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>{editing.firstName} {editing.lastName}</p>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {OPTIONAL_RIGHTS.map(r => (
                <label key={r.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid #F0E4D6', borderRadius: 12, marginBottom: 8, cursor: 'pointer', background: editRights[r.key] ? '#F4F9F5' : '#FFFDF9' }}>
                  <input type="checkbox" checked={editRights[r.key]} onChange={e => setEditRights(x => ({ ...x, [r.key]: e.target.checked }))} style={{ width: 17, height: 17, accentColor: '#6B2D4E', marginTop: 1 }} />
                  <span><b style={{ fontSize: 13, color: '#4A1F38' }}>{r.label}</b><br /><span style={{ fontSize: 12, color: '#8A7B6C' }}>{r.help}</span></span>
                </label>
              ))}
              <label className="ap-label" style={{ marginTop: 10 }}>Access until (optional)</label>
              <input className="ap-in" type="date" value={editUntil} min={tomorrow} onChange={e => setEditUntil(e.target.value)} />
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#A08B7D' }}>Leave empty for no end date.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '12px 22px 18px' }}>
              <button className="ap-btn ap-soft" style={{ flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
              <button className="ap-btn ap-primary" style={{ flex: 1 }} disabled={!!busy} onClick={() => act(editing, 'update', { rights: editRights, accessUntil: editUntil || null })}>Save</button>
            </div>
          </div>
        </div>
      )}
    </AppPage>
  );
}
