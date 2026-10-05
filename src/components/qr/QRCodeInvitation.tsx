'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { qrT, detectQrLang, QR_LANGS, type QrLang } from './qrI18n';

// Reusable invitation QR code. It only draws the invitation link it is
// given: it never creates or changes an invitation code, and access is still
// checked by the /join page and the backend when the link is opened.
//
// Usage:
//   <QRCodeInvitation invitationUrl={url} groupName={group.name} groupType="tontine" personName={member.fullName} />

export type QrGroupType = 'tontine' | 'church' | 'association' | 'investment' | string;

export interface QRCodeInvitationProps {
  invitationUrl: string;
  groupName: string;
  groupType?: QrGroupType;
  /** Set when the link is a personal invitation for one person. */
  personName?: string;
  /** Starting language; defaults to the browser language. */
  lang?: QrLang;
}

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38', or: '#E9C77B', orLight: '#F0DCA8',
  creme: '#FBEEDD', text: '#3A2F1F', muted: '#8A7B6C', border: '#F0E4D6',
};

// Only real UNIMUNITY invitation links are accepted, e.g.
// https://unimunity.com/join/ABC123 or https://unimunity.com/join-church/XYZ789
const INVITE_URL_RE = /^https:\/\/unimunity\.com\/[a-z-]+\/[A-Za-z0-9_-]{4,64}$/;

export function isValidInvitationUrl(url: string | null | undefined): url is string {
  return !!url && INVITE_URL_RE.test(url);
}

function safeFileName(name: string): string {
  const cleaned = (name || 'group')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return 'UNIMUNITY-' + (cleaned || 'group') + '-QR.png';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export default function QRCodeInvitation({ invitationUrl, groupName, groupType = 'tontine', personName, lang }: QRCodeInvitationProps) {
  const [language, setLanguage] = useState<QrLang>(() => lang || detectQrLang());
  // The generated image is stored with the link it was made from, so a
  // stale image is never shown for another member's link.
  const [qr, setQr] = useState<{ url: string; data: string }>({ url: '', data: '' });
  const [copied, setCopied] = useState(false);
  const valid = isValidInvitationUrl(invitationUrl);
  const t = (k: Parameters<typeof qrT>[1]) => qrT(language, k);
  const rtl = language === 'ar';

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    // Generated locally in the browser - no external QR service.
    QRCode.toDataURL(invitationUrl, { errorCorrectionLevel: 'M', margin: 4, width: 640, color: { dark: '#000000', light: '#FFFFFF' } })
      .then(data => { if (!cancelled) setQr({ url: invitationUrl, data }); })
      .catch(() => { if (!cancelled) setQr({ url: invitationUrl, data: '' }); });
    return () => { cancelled = true; };
  }, [invitationUrl, valid]);

  const qrDataUrl = qr.url === invitationUrl ? qr.data : '';

  if (!valid) {
    return (
      <div style={{ background: '#FBF0D9', color: '#9C7A2E', border: '1px solid #EBD9A8', borderRadius: 12, padding: '12px 14px', fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
        {t('qr.invitation.invalid')}
      </div>
    );
  }

  // PNG with the QR plus the group / person name, ready to share.
  const handleDownload = async () => {
    if (!qrDataUrl) return;
    const img = new Image();
    img.src = qrDataUrl;
    await new Promise(res => { img.onload = res; });
    const W = 800, qr = 640, top = 40;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = top + qr + (personName ? 170 : 130);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (W - qr) / 2, top, qr, qr);
    ctx.textAlign = 'center';
    ctx.fillStyle = C.bordeauxDark;
    ctx.font = 'bold 34px Arial, sans-serif';
    ctx.fillText(groupName.slice(0, 40), W / 2, top + qr + 46);
    let y = top + qr + 90;
    if (personName) {
      ctx.fillStyle = C.bordeaux;
      ctx.font = '26px Arial, sans-serif';
      ctx.fillText(t('qr.invitation.personalFor') + ' ' + personName.slice(0, 40), W / 2, y);
      y += 40;
    }
    ctx.fillStyle = C.muted;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText(t('qr.invitation.scanToJoin') + '  \u00b7  UNIMUNITY', W / 2, y);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = safeFileName(personName ? groupName + '-' + personName : groupName);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Prints only the A4 poster, through a hidden frame, never the dashboard.
  const handlePrint = () => {
    if (!qrDataUrl) return;
    const html = `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escapeHtml(groupName)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Arial, sans-serif; text-align: center; color: #3A2F1F; margin: 0; }
  .brand { font-size: 30px; font-weight: 800; letter-spacing: 4px; color: #6B2D4E; margin-top: 10mm; }
  .group { font-size: 34px; font-weight: 800; color: #4A1F38; margin: 10mm 0 3mm; }
  .person { font-size: 20px; color: #6B2D4E; margin-bottom: 4mm; }
  .qr { width: 120mm; height: 120mm; margin: 6mm auto; display: block; }
  .scan { font-size: 26px; font-weight: 700; color: #4A1F38; margin-top: 4mm; }
  .link { font-size: 12px; color: #8A7B6C; margin-top: 6mm; word-break: break-all; }
</style></head><body>
  <div class="brand">UNIMUNITY</div>
  <div class="group">${escapeHtml(groupName)}</div>
  ${personName ? `<div class="person">${escapeHtml(t('qr.invitation.personalFor'))} ${escapeHtml(personName)}</div>` : ''}
  <img class="qr" src="${qrDataUrl}" alt="QR" />
  <div class="scan">${escapeHtml(t('qr.invitation.scanToJoin'))}</div>
  <div class="link">${escapeHtml(invitationUrl)}</div>
</body></html>`;
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) { frame.remove(); return; }
    doc.open();
    doc.write(html);
    doc.close();
    const img = doc.querySelector('img');
    const go = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1500);
    };
    if (img && !img.complete) img.onload = go; else setTimeout(go, 50);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = invitationUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btn = (primary?: boolean): React.CSSProperties => ({
    flex: 1, minWidth: 0, padding: '10px 8px', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer',
    border: primary ? 'none' : '1.5px solid ' + C.orLight,
    background: primary ? 'linear-gradient(135deg,#6B2D4E,#4A1F38)' : C.creme,
    color: primary ? '#FFFFFF' : C.bordeaux,
    boxShadow: primary ? '0 6px 16px rgba(107,45,78,0.24)' : 'none',
    whiteSpace: 'nowrap',
  });

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ fontFamily: 'Inter, sans-serif', color: C.text }} data-group-type={groupType}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: 1.2 }}>{t('qr.invitation.title')}</p>
        <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: C.bordeauxDark }}>{groupName}</p>
        {personName && (
          <p style={{ margin: '3px 0 0', fontSize: 13, color: C.bordeaux }}>{t('qr.invitation.personalFor')} <strong>{personName}</strong></p>
        )}
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid ' + C.border, borderRadius: 16, padding: 12, margin: '14px auto 8px', width: 'min(280px, 100%)', boxSizing: 'border-box', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        {qrDataUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={qrDataUrl} alt={t('qr.invitation.scanToJoin')} style={{ width: '100%', height: 'auto', display: 'block' }} />
          : <div style={{ aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>...</div>}
      </div>
      <p style={{ textAlign: 'center', margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: C.bordeauxDark }}>{t('qr.invitation.scanToJoin')}</p>
      {personName && <p style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{t('qr.invitation.personalNote')}</p>}

      <div dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFDF9', border: '1.5px solid #EAD9BE', borderRadius: 10, padding: '6px 6px 6px 10px', margin: '8px 0 12px' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: 'monospace', color: C.bordeaux, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invitationUrl}</span>
        <button onClick={handleCopy} style={{ border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: copied ? '#2E7D32' : C.bordeaux, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
          {copied ? '\u2713 ' + t('qr.invitation.linkCopied') : t('qr.invitation.copyLink')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleDownload} disabled={!qrDataUrl} style={btn(true)}>{'\u2B07'} {t('qr.invitation.download')}</button>
        <button onClick={handlePrint} disabled={!qrDataUrl} style={btn()}>{'\u{1F5A8}\uFE0F'} {t('qr.invitation.print')}</button>
      </div>

      <div dir="ltr" style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <select value={language} onChange={e => setLanguage(e.target.value as QrLang)} aria-label="Language"
          style={{ padding: '5px 10px', borderRadius: 10, border: '1.5px solid #EAD9BE', background: '#FFFDF9', color: C.text, fontSize: 12, outline: 'none' }}>
          {QR_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
    </div>
  );
}
