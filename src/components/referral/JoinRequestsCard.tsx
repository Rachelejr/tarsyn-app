'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

type AcceptOpts = {
  position: string; shares: string; payoutDates: string[]; status: string;
  expectedAmount: string; currency: string; memberType: string; role: string; colorTag: string; notes: string;
};
const EMPTY_OPTS: AcceptOpts = {
  position: '', shares: '1', payoutDates: [''], status: 'pending',
  expectedAmount: '', currency: '', memberType: 'Regular', role: 'member', colorTag: '', notes: '',
};

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
  // The Accept window is drawn over the whole page (portal), not inside this
  // card: the card is animated with a transform, which would trap it.
  // It only opens after a click, so document always exists by then.
  useEffect(() => {
    if (!accepting) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccepting(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [accepting]);

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

      {accepting && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setAccepting(null)} role="dialog" aria-modal="true" aria-label="Accept join request" className="ja-overlay">
          <style>{`
            .ja-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px;
              background: rgba(44,16,32,0.55); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); animation: ja-fade .18s ease; font-family: Inter, sans-serif; }
            .ja-box { width: 100%; max-width: 640px; max-height: calc(100vh - 40px); display: flex; flex-direction: column; background: #FFFDF9;
              border-radius: 22px; overflow: hidden; box-shadow: 0 30px 80px rgba(44,16,32,0.35); animation: ja-pop .2s ease; }
            .ja-body { overflow-y: auto; padding: 18px 24px 8px; }
            .ja-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; }
            .ja-three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 14px; }
            .ja-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 16px; }
            .ja-sec { display: flex; align-items: center; gap: 8px; margin: 20px 0 10px; font-size: 12px; font-weight: 800; color: #6B2D4E;
              text-transform: uppercase; letter-spacing: .9px; }
            .ja-sec::after { content: ''; flex: 1; height: 1px; background: #F0E4D6; }
            .ja-lab { display: block; font-size: 10.5px; font-weight: 700; color: #A08B7D; text-transform: uppercase; letter-spacing: .7px; margin: 0 0 5px; }
            .ja-in { width: 100%; height: 40px; padding: 0 12px; border-radius: 11px; border: 1.5px solid #EAD9BE; background: #FFFFFF; color: #3A2F1F;
              font-size: 13.5px; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
            textarea.ja-in { height: auto; padding: 10px 12px; resize: vertical; }
            .ja-in:focus { border-color: #E9C77B; box-shadow: 0 0 0 3px rgba(233,199,123,.25); }
            .ja-foot { display: flex; gap: 10px; padding: 14px 24px; border-top: 1px solid #F0E4D6; background: #FFFFFF; }
            .ja-btn { flex: 1; height: 44px; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; transition: filter .15s, transform .15s; }
            .ja-btn:not(:disabled):hover { filter: brightness(1.05); transform: translateY(-1px); }
            @keyframes ja-fade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ja-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
            @media (max-width: 560px) {
              .ja-two, .ja-three { grid-template-columns: 1fr; }
              .ja-info { grid-template-columns: 1fr 1fr; }
              .ja-body { padding: 16px 16px 8px; } .ja-foot { padding: 12px 16px; }
            }
          `}</style>
          <div className="ja-box" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#6B2D4E 0%,#4A1F38 100%)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div aria-hidden style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#F3D58F,#E9C77B)', color: '#4A1F38',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}>
                {((accepting.firstName[0] || '') + (accepting.lastName[0] || '')).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, color: '#E9C77B', textTransform: 'uppercase', letterSpacing: 1.4 }}>Accept join request</p>
                <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>{accepting.firstName} {accepting.lastName}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'rgba(251,238,221,.85)' }}>
                  Joins <b style={{ color: '#FBEEDD' }}>{accepting.groupName}</b> {'\u00b7'} proposed by {accepting.referrerName || 'a member'}
                </p>
              </div>
              <button onClick={() => setAccepting(null)} aria-label="Close"
                style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(251,238,221,.35)', background: 'rgba(255,255,255,.08)', color: '#FBEEDD', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>
                {'\u00d7'}
              </button>
            </div>

            <div className="ja-body">
              {/* What the person filled in (read only) */}
              <p className="ja-sec" style={{ marginTop: 0 }}>Applicant</p>
              <div className="ja-info" style={{ background: '#FDF6EC', border: '1px solid #F3E6D8', borderRadius: 14, padding: '12px 14px' }}>
                {[
                  ['Email', accepting.email], ['Phone', accepting.phone], ['Country', accepting.country],
                  ['Address', accepting.address], ['Nationality', accepting.nationality], ['Gender', accepting.gender],
                ].map(([k, v]) => (
                  <div key={k} style={{ minWidth: 0 }}>
                    <span className="ja-lab" style={{ marginBottom: 2 }}>{k}</span>
                    <span style={{ fontSize: 13, color: '#3A2F1F', wordBreak: 'break-word' }}>{v || '\u2014'}</span>
                  </div>
                ))}
              </div>
              {accepting.message && (
                <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#6B2D4E', fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{'\u201C'}{accepting.message}{'\u201D'}</p>
              )}

              <p className="ja-sec">Contribution &amp; rotation</p>
              <div className="ja-two">
                <div><label className="ja-lab">Position</label><input className="ja-in" value={opts.position} onChange={e => setOpt('position', e.target.value)} placeholder="Next free position" inputMode="numeric" /></div>
                <div><label className="ja-lab">Number of parts</label><input className="ja-in" type="number" min={1} max={MAX_PARTS} value={opts.shares} onChange={e => setShares(e.target.value)} /></div>
                <div><label className="ja-lab">Amount per part</label><input className="ja-in" value={opts.expectedAmount} onChange={e => setOpt('expectedAmount', e.target.value)} placeholder="Group amount" inputMode="decimal" /></div>
                <div><label className="ja-lab">Currency</label>
                  <select className="ja-in" value={opts.currency} onChange={e => setOpt('currency', e.target.value)}>
                    <option value="">Group currency</option>
                    {MEMBER_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {opts.payoutDates.map((d, i) => (
                  <div key={i}>
                    <label className="ja-lab">{opts.payoutDates.length > 1 ? `Payout date \u00b7 part ${i + 1}/${opts.payoutDates.length}` : 'Payout date'}</label>
                    <input className="ja-in" type="date" value={d} onChange={e => setDateAt(i, e.target.value)} />
                  </div>
                ))}
                <div><label className="ja-lab">Status</label>
                  <select className="ja-in" value={opts.status} onChange={e => setOpt('status', e.target.value)}>
                    {MEMBER_STATUSES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </div>
              </div>

              <p className="ja-sec">Profile</p>
              <div className="ja-three">
                <div><label className="ja-lab">Member type</label>
                  <select className="ja-in" value={opts.memberType} onChange={e => setOpt('memberType', e.target.value)}>
                    {MEMBER_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div><label className="ja-lab">Role</label>
                  <select className="ja-in" value={opts.role} onChange={e => setOpt('role', e.target.value)}>
                    {MEMBER_ROLES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </div>
                <div><label className="ja-lab">Color tag</label>
                  <select className="ja-in" value={opts.colorTag} onChange={e => setOpt('colorTag', e.target.value)}>
                    <option value="">None</option>
                    {MEMBER_COLOR_TAGS.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="ja-lab">Notes <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>(optional)</span></label>
                <textarea className="ja-in" value={opts.notes} onChange={e => setOpt('notes', e.target.value.slice(0, 500))} rows={2} placeholder="Anything to remember about this member..." />
              </div>
              <p style={{ margin: '10px 0 6px', fontSize: 11.5, color: '#A08B7D' }}>An empty position, amount or currency uses the group default.</p>
              {acceptError && <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: '#C62828', fontWeight: 600 }}>{acceptError}</p>}
            </div>

            <div className="ja-foot">
              <button className="ja-btn" onClick={() => setAccepting(null)}
                style={{ background: '#FBEEDD', color: '#6B2D4E', border: '1.5px solid #F0DCA8' }}>Cancel</button>
              <button className="ja-btn" onClick={() => decide(accepting, 'accept')} disabled={busy === accepting.id}
                style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FFFFFF', border: 'none', boxShadow: '0 6px 16px rgba(107,45,78,.28)', opacity: busy ? 0.7 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
                {busy === accepting.id ? 'Adding...' : '\u2713 Accept and add'}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
