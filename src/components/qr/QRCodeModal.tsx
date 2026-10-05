'use client';

import { useEffect } from 'react';
import QRCodeInvitation, { type QRCodeInvitationProps } from './QRCodeInvitation';
import { qrT, detectQrLang } from './qrI18n';

// Dialog wrapper around QRCodeInvitation. Closes on the X button, on a click
// outside the card, or with the Escape key.
export default function QRCodeModal({ open, onClose, ...props }: QRCodeInvitationProps & { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const closeLabel = qrT(props.lang || detectQrLang(), 'qr.invitation.close');

  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: '#FFFFFF', borderRadius: 20, border: '1px solid #F0E4D6', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: 380, maxHeight: '92vh', overflowY: 'auto', padding: '22px 20px 18px', boxSizing: 'border-box' }}>
        <button onClick={onClose} aria-label={closeLabel} title={closeLabel}
          style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', border: '1px solid #F0E4D6', background: '#FBEEDD', color: '#6B2D4E', fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}>
          {'\u00D7'}
        </button>
        <QRCodeInvitation {...props} />
      </div>
    </div>
  );
}
