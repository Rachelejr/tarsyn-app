'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCodeModal from '@/components/qr/QRCodeModal';
import { authHeaders } from '@/lib/authFetch';

// Organizer dashboard: join requests proposed by members, for the
// organizer's own groups. Accept creates the member like Add Member;
// Decline closes the request without telling the person.

type JoinRequest = {
  id: string; groupId: string; groupName: string; referrerName: string;
  firstName: string; lastName: string; email: string; phone: string; address: string; message: string;
  status: string; createdAt: number | null;
};
type Accepted = { fullName: string; inviteLink: string; groupName: string; tynId: string; emailSent: boolean };

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 10, border: '1.5px solid #EAD9BE', fontSize: 13,
  color: '#3A2F1F', background: '#FFFDF9', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase', letterSpacing: 0.7, margin: '0 0 4px' };

export default function JoinRequestsCard() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [accepting, setAccepting] = useState<JoinRequest | null>(null);
  const [opts, setOpts] = useState({ position: '', expectedAmount: '', currency: '' });
  const [acceptError, setAcceptError] = useState('');
  const [accepted, setAccepted] = useState<Accepted | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/referral/requests', { headers: await authHeaders('admin') });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setRequests(data.requests || []); setError(''); }
      else setError(data.error || 'Could not load join requests.');
    } catch {
      setError('Could not load join requests.');
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => { if (alive) await load(); };
    run();
    return () => { alive = false; };
  }, [load]);

  const decide = async (r: JoinRequest, action: 'accept' | 'decline') => {
    setBusy(r.id);
    setAcceptError('');
    try {
      const res = await fetch('/api/referral/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders('admin')) },
        body: JSON.stringify({ requestId: r.id, action, ...(action === 'accept' ? opts : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (action === 'accept') setAcceptError(data.error || 'Could not accept this request.');
        else alert(data.error || 'Could not decline this request.');
      } else if (action === 'accept') {
        setAccepting(null);
        setAccepted({ fullName: data.fullName, inviteLink: data.inviteLink, groupName: data.groupName, tynId: data.tynId, emailSent: !!data.emailSent });
        await load();
      } else {
        await load();
      }
    } catch {
      if (action === 'accept') setAcceptError('Could not accept this request.');
    }
    setBusy('');
  };

  const pending = requests.filter(r => r.status === 'pending');
  const recent = requests.filter(r => r.status !== 'pending').slice(0, 5);

  return (
    <div className="panel-card fade-up rc-card" style={{ background: 'white', borderRadius: 16, padding: 18, boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
      <div className="rc-head">
        <span className="rc-ico" style={{ background: 'linear-gradient(135deg,#F4B6C7,#B0525F)', boxShadow: '0 4px 10px rgba(176,82,95,0.3)' }}>{'\u{1F91D}'}</span>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#4A1F38', fontSize: 15, fontWeight: 800, margin: 0 }}>Join Requests</h3>
          <p style={{ color: '#A08B7D', fontSize: 11, margin: '2px 0 0' }}>Proposed by your members</p>
        </div>
        {pending.length > 0 && (
          <span style={{ background: '#B0525F', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '3px 9px' }}>{pending.length}</span>
        )}
      </div>

      {!loaded ? (
        <p style={{ color: '#8A7B6C', fontSize: 12.5, margin: 0 }}>Loading...</p>
      ) : error ? (
        <p style={{ color: '#C62828', fontSize: 12.5, margin: 0 }}>{error}</p>
      ) : pending.length === 0 ? (
        <p style={{ color: '#8A7B6C', fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>No pending requests. Members can propose someone with &quot;Invite Someone&quot; in their space.</p>
      ) : pending.map(r => (
        <div key={r.id} className="rc-group">
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#4A1F38' }}>{r.firstName} {r.lastName}</p>
          <p style={{ margin: '2px 0 6px', fontSize: 11.5, color: '#A08B7D' }}>{r.groupName} {'\u00b7'} proposed by {r.referrerName || 'a member'}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#3A2F1F', lineHeight: 1.55, wordBreak: 'break-word' }}>
            {r.email}<br />{r.phone}<br />{r.address}
          </p>
          {r.message && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6B2D4E', fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{'\u201C'}{r.message}{'\u201D'}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 10 }}>
            <button disabled={busy === r.id} onClick={() => { setAccepting(r); setOpts({ position: '', expectedAmount: '', currency: '' }); setAcceptError(''); }}
              style={{ background: 'linear-gradient(135deg,#66BB6A,#2E7D32)', color: '#fff', border: 'none', borderRadius: 9, padding: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              {'\u2713'} Accept
            </button>
            <button disabled={busy === r.id} onClick={() => { if (confirm(`Decline the request from ${r.firstName} ${r.lastName}? They will not be notified.`)) decide(r, 'decline'); }}
              style={{ background: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: 9, padding: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              {busy === r.id ? '...' : 'Decline'}
            </button>
          </div>
        </div>
      ))}

      {loaded && recent.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={labelStyle}>Recently decided</p>
          {recent.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px dashed #F3E6D8' }}>
              <span style={{ color: '#3A2F1F' }}>{r.firstName} {r.lastName}</span>
              <span style={{ color: r.status === 'accepted' ? '#2E7D32' : '#8A7B6C', fontWeight: 700 }}>{r.status === 'accepted' ? 'Accepted' : 'Declined'}</span>
            </div>
          ))}
        </div>
      )}

      {accepting && (
        <div onClick={() => setAccepting(null)} role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #F0E4D6', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: 400, padding: '22px 20px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: 1.2 }}>Accept join request</p>
            <p style={{ margin: '2px 0 4px', fontSize: 18, fontWeight: 800, color: '#4A1F38' }}>{accepting.firstName} {accepting.lastName}</p>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#8A7B6C' }}>Joins {accepting.groupName}. Leave a field empty to use the group default.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>Position</label><input value={opts.position} onChange={e => setOpts(o => ({ ...o, position: e.target.value }))} placeholder="Next" inputMode="numeric" style={fieldStyle} /></div>
              <div><label style={labelStyle}>Amount</label><input value={opts.expectedAmount} onChange={e => setOpts(o => ({ ...o, expectedAmount: e.target.value }))} placeholder="Group" inputMode="decimal" style={fieldStyle} /></div>
              <div><label style={labelStyle}>Currency</label><input value={opts.currency} onChange={e => setOpts(o => ({ ...o, currency: e.target.value }))} placeholder="Group" style={fieldStyle} /></div>
            </div>
            {acceptError && <p style={{ margin: '12px 0 0', fontSize: 12.5, color: '#C62828', fontWeight: 600 }}>{acceptError}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              <button onClick={() => setAccepting(null)} style={{ background: '#FBEEDD', color: '#6B2D4E', border: '1.5px solid #F0DCA8', borderRadius: 12, padding: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => decide(accepting, 'accept')} disabled={busy === accepting.id}
                style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#fff', border: 'none', borderRadius: 12, padding: 10, fontSize: 13, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}>
                {busy === accepting.id ? 'Adding...' : 'Accept and add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* After acceptance: the new member's personal invitation QR, like after Add Member. */}
      <QRCodeModal
        open={!!accepted}
        onClose={() => setAccepted(null)}
        invitationUrl={accepted?.inviteLink || ''}
        groupName={accepted?.groupName || 'UNIMUNITY'}
        groupType="tontine"
        personName={accepted?.fullName || ''}
      />
    </div>
  );
}
