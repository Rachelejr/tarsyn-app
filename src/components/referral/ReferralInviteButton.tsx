'use client';

import { useEffect, useState } from 'react';
import QRCodeInvitation from '@/components/qr/QRCodeInvitation';
import { authHeaders } from '@/lib/authFetch';

// Member portal: "Invite someone" button. Opens the member's personal
// referral link + QR, and the requests they already sent. The person
// invited only files a request; the organizer decides.

type SentRequest = { id: string; firstName: string; lastName: string; status: string; createdAt: number | null };
type CodeResponse = { code?: string; link?: string; groupName?: string; requests?: SentRequest[]; disabled?: boolean; error?: string };

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: '#FBF0D9', color: '#9C7A2E' },
  accepted: { label: 'Accepted', bg: '#E8F5E9', color: '#2E7D32' },
  declined: { label: 'Not accepted', bg: '#F3EEE7', color: '#8A7B6C' },
  cancelled: { label: 'Cancelled', bg: '#F3EEE7', color: '#8A7B6C' },
};

export default function ReferralInviteButton({ memberId, buttonStyle }: { memberId: string; buttonStyle?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CodeResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openModal = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch('/api/referral/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders('member')) },
        body: JSON.stringify({ memberId }),
      });
      const json: CodeResponse = await res.json().catch(() => ({ error: 'Could not load your invitation link.' }));
      setData(res.ok ? json : { error: json.error || 'Could not load your invitation link.' });
    } catch {
      setData({ error: 'Could not load your invitation link.' });
    }
    setLoading(false);
  };

  return (
    <>
      <button className="qa-btn" onClick={openModal}
        style={buttonStyle || { background: '#FBEEDD', color: '#6B2D4E', border: '1.5px solid #F0E4D6', padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
        Invite Someone
      </button>

      {open && (
        <div onClick={() => setOpen(false)} role="dialog" aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', background: '#FFFFFF', borderRadius: 20, border: '1px solid #F0E4D6', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: 400, maxHeight: '92vh', overflowY: 'auto', padding: '22px 20px 18px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', border: '1px solid #F0E4D6', background: '#FBEEDD', color: '#6B2D4E', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
              {'\u00D7'}
            </button>

            {loading ? (
              <p style={{ textAlign: 'center', color: '#8A7B6C', fontSize: 13, margin: '30px 0' }}>Loading...</p>
            ) : data?.error ? (
              <p style={{ textAlign: 'center', color: '#C62828', fontSize: 13, fontWeight: 600, margin: '30px 0' }}>{data.error}</p>
            ) : data?.disabled ? (
              <p style={{ textAlign: 'center', color: '#8A7B6C', fontSize: 13, margin: '30px 0', lineHeight: 1.6 }}>Invitations are turned off for your membership. Contact your organizer.</p>
            ) : data?.link ? (
              <>
                <div style={{ background: '#FBF0D9', color: '#9C7A2E', border: '1px solid #EBD9A8', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 600, lineHeight: 1.5, margin: '18px 0 14px' }}>
                  Share this link or QR code. The person fills in a request, and your organizer decides whether they join.
                </div>
                <QRCodeInvitation invitationUrl={data.link} groupName={data.groupName || 'UNIMUNITY'} groupType="tontine" lang="en" />

                <div style={{ marginTop: 18, borderTop: '1px solid #F3E6D8', paddingTop: 12 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase', letterSpacing: 0.8 }}>Your requests ({data.requests?.length || 0})</p>
                  {(data.requests || []).length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12.5, color: '#8A7B6C' }}>No requests yet.</p>
                  ) : (data.requests || []).map(r => {
                    const s = STATUS[r.status] || STATUS.pending;
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px dashed #F3E6D8' }}>
                        <span style={{ fontSize: 13, color: '#3A2F1F', fontWeight: 600 }}>{r.firstName} {r.lastName}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 10, background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
