'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCodeModal from '@/components/qr/QRCodeModal';
import { authHeaders } from '@/lib/authFetch';
import {
  MAX_PARTS, MEMBER_COLOR_TAGS, MEMBER_CURRENCIES, MEMBER_ROLES, MEMBER_STATUSES, MEMBER_TYPES,
} from '@/lib/memberOptions';

// Organizer dashboard: join requests proposed by members, for the
// organizer's own groups. Accept creates the member like Add Member;
// Decline closes the request without telling the person.

type JoinRequest = {
  id: string; groupId: string; groupName: string; referrerName: string;
  firstName: string; lastName: string; email: string; phone: string; address: string; message: string;
  country?: string; nationality?: string; gender?: string;
  status: string; createdAt: number | null;
};
type Accepted = { fullName: string; inviteLink: string; groupName: string; tynId: string; emailSent: boolean };

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 10, border: '1.5px solid #EAD9BE', fontSize: 13,
  color: '#3A2F1F', background: '#FFFDF9', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
};
type AcceptOpts = {
  position: string; shares: string; payoutDates: string[]; status: string;
  expectedAmount: string; currency: string; memberType: string; role: string; colorTag: string; notes: string;
};
const EMPTY_OPTS: AcceptOpts = {
  position: '', shares: '1', payoutDates: [''], status: 'pending',
  expectedAmount: '', currency: '', memberType: 'Regular', role: 'member', colorTag: '', notes: '',
};
const sectionTitle: React.CSSProperties = { margin: '16px 0 8px', fontSize: 12.5, fontWeight: 800, color: '#6B2D4E', display: 'flex', alignItems: 'center', gap: 6 };

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase', letterSpacing: 0.7, margin: '0 0 4px' };

export default function JoinRequestsCard() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [accepting, setAccepting] = useState<JoinRequest | null>(null);
  const [opts, setOpts] = useState<AcceptOpts>(EMPTY_OPTS);
  const setOpt = (k: keyof AcceptOpts, v: string) => setOpts(o => ({ ...o, [k]: v }));
  // Same rule as Add Member: one payout date per part.
  const setShares = (v: string) => setOpts(o => {
    const n = Math.min(MAX_PARTS, Math.max(1, parseInt(v, 10) || 1));
    const dates = Array.from({ length: n }, (_, i) => o.payoutDates[i] || '');
    return { ...o, shares: v, payoutDates: dates };
  });
  const setDateAt = (i: number, v: string) => setOpts(o => ({ ...o, payoutDates: o.payoutDates.map((d, k) => (k === i ? v : d)) }));
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
            {(r.country || r.nationality) && <><br />{[r.country, r.nationality].filter(Boolean).join(' \u00b7 ')}</>}
          </p>
          {r.message && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6B2D4E', fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{'\u201C'}{r.message}{'\u201D'}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 10 }}>
            <button disabled={busy === r.id} onClick={() => { setAccepting(r); setOpts(EMPTY_OPTS); setAcceptError(''); }}
              style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#fff', border: 'none', borderRadius: 9, padding: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
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
            style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #F0E4D6', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '22px 22px 18px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}>
            <style>{`
              .ja-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 12px; }
              @media (max-width: 560px) { .ja-grid { grid-template-columns: 1fr 1fr; } }
              .ja-in:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
            `}</style>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: 1.2 }}>Accept join request</p>
            <p style={{ margin: '2px 0 2px', fontSize: 19, fontWeight: 800, color: '#4A1F38' }}>{accepting.firstName} {accepting.lastName}</p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#8A7B6C' }}>Joins {accepting.groupName} {'\u00b7'} proposed by {accepting.referrerName || 'a member'}</p>

            {/* What the person filled in (read only). */}
            <div style={{ marginTop: 12, background: '#FDF6EC', border: '1px solid #F3E6D8', borderRadius: 12, padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px 14px', fontSize: 12.5, color: '#3A2F1F' }}>
              {[
                ['Email', accepting.email], ['Phone', accepting.phone], ['Address', accepting.address],
                ['Country', accepting.country], ['Nationality', accepting.nationality], ['Gender', accepting.gender],
              ].map(([k, v]) => (
                <div key={k} style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase', letterSpacing: 0.6 }}>{k}</span>
                  <span style={{ wordBreak: 'break-word' }}>{v || '\u2014'}</span>
                </div>
              ))}
            </div>

            <p style={sectionTitle}>{'\u{1F4B0}'} Contribution &amp; Rotation</p>
            <div className="ja-grid">
              <div><label style={labelStyle}>Position</label><input className="ja-in" value={opts.position} onChange={e => setOpt('position', e.target.value)} placeholder="Next free" inputMode="numeric" style={fieldStyle} /></div>
              <div><label style={labelStyle}>Number of parts</label><input className="ja-in" type="number" min={1} max={MAX_PARTS} value={opts.shares} onChange={e => setShares(e.target.value)} style={fieldStyle} /></div>
              <div><label style={labelStyle}>Status</label>
                <select className="ja-in" value={opts.status} onChange={e => setOpt('status', e.target.value)} style={fieldStyle}>
                  {MEMBER_STATUSES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
              {opts.payoutDates.map((d, i) => (
                <div key={i}>
                  <label style={labelStyle}>{opts.payoutDates.length > 1 ? `Payout date - part ${i + 1}/${opts.payoutDates.length}` : 'Payout date'}</label>
                  <input className="ja-in" type="date" value={d} onChange={e => setDateAt(i, e.target.value)} style={fieldStyle} />
                </div>
              ))}
              <div><label style={labelStyle}>Amount (per part)</label><input className="ja-in" value={opts.expectedAmount} onChange={e => setOpt('expectedAmount', e.target.value)} placeholder="Group amount" inputMode="decimal" style={fieldStyle} /></div>
              <div><label style={labelStyle}>Currency</label>
                <select className="ja-in" value={opts.currency} onChange={e => setOpt('currency', e.target.value)} style={fieldStyle}>
                  <option value="">Group currency</option>
                  {MEMBER_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <p style={sectionTitle}>{'\u{1F464}'} Profile</p>
            <div className="ja-grid">
              <div><label style={labelStyle}>Member type</label>
                <select className="ja-in" value={opts.memberType} onChange={e => setOpt('memberType', e.target.value)} style={fieldStyle}>
                  {MEMBER_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Role</label>
                <select className="ja-in" value={opts.role} onChange={e => setOpt('role', e.target.value)} style={fieldStyle}>
                  {MEMBER_ROLES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Color tag</label>
                <select className="ja-in" value={opts.colorTag} onChange={e => setOpt('colorTag', e.target.value)} style={fieldStyle}>
                  <option value="">None</option>
                  {MEMBER_COLOR_TAGS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Notes</label>
              <textarea className="ja-in" value={opts.notes} onChange={e => setOpt('notes', e.target.value.slice(0, 500))} rows={2} placeholder="Optional notes..." style={{ ...fieldStyle, resize: 'vertical' }} />
            </div>

            <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#A08B7D' }}>Empty position, amount or currency use the group default.</p>
            {acceptError && <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#C62828', fontWeight: 600 }}>{acceptError}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
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
