'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Footer from '@/components/Footer';
import { detectQrLang, QR_LANGS, type QrLang } from '@/components/qr/qrI18n';
import { refT, type RefKey } from '@/components/referral/referralI18n';
import { MEMBER_COUNTRIES } from '@/lib/memberOptions';

// Public page reached from a member's referral link or QR code.
// It only files a join request: nothing about the group is shown except
// its name and the first name of the member who sent the link.

type Lookup = { found: boolean; groupName?: string; referrerFirstName?: string };
type FieldName = 'firstName' | 'lastName' | 'email' | 'address' | 'phone';

// Country names in the visitor's language; the stored value stays English.
function countryLabel(code: string, lang: string): string {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code; } catch { return code; }
}

export default function ReferPage() {
  const params = useParams();
  const code = String(params?.code || '');
  const [lang, setLang] = useState<QrLang>(() => detectQrLang());
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', address: '', phone: '', country: '', nationality: '', gender: '', message: '' });
  const [badFields, setBadFields] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const t = (k: RefKey, vars?: Record<string, string>) => refT(lang, k, vars);
  const rtl = lang === 'ar';

  useEffect(() => {
    let cancelled = false;
    fetch('/api/referral/lookup?code=' + encodeURIComponent(code))
      .then(r => r.json())
      .then((d: Lookup) => { if (!cancelled) setLookup(d); })
      .catch(() => { if (!cancelled) setLookup({ found: false }); });
    return () => { cancelled = true; };
  }, [code]);

  const set = (k: keyof typeof form, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setBadFields(b => b.filter(x => x !== k));
  };

  const submit = async () => {
    // Same rules as the server, checked here first for quick feedback.
    const bad: string[] = [];
    if (form.firstName.trim().length < 2) bad.push('firstName');
    if (form.lastName.trim().length < 2) bad.push('lastName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) bad.push('email');
    if (form.address.trim().length < 5) bad.push('address');
    if (!/^\+?[0-9 ]{7,20}$/.test(form.phone.trim())) bad.push('phone');
    if (!form.country) bad.push('country');
    if (bad.length) { setBadFields(bad); setError(t('errFields')); return; }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/referral/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, lang, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setSent(true); }
      else if (data.error === 'invalid-fields') { setBadFields(data.fields || []); setError(t('errFields')); }
      else if (data.error === 'rate-limited') setError(t('errRate'));
      else if (data.error === 'too-many-pending') setError(t('errTooMany'));
      else if (data.error === 'invalid-link') setLookup({ found: false });
      else setError(t('errServer'));
    } catch {
      setError(t('errServer'));
    }
    setSending(false);
  };

  const labelCss: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#A08B7D', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.8 };
  const inputCss: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, fontSize: 14, color: '#3A2F1F', background: '#FFFDF9', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' };

  const field = (k: FieldName, type = 'text', autoComplete?: string) => (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A08B7D', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.8 }}>{t(k)} *</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} autoComplete={autoComplete} dir={k === 'email' || k === 'phone' ? 'ltr' : undefined}
        style={{ width: '100%', padding: '9px 11px', borderRadius: 10, fontSize: 14, color: '#3A2F1F', background: '#FFFDF9', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
          border: '1.5px solid ' + (badFields.includes(k) ? '#C62828' : '#EAD9BE') }} />
    </div>
  );

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 560px) { .rf-two, .rf-three { grid-template-columns: 1fr !important; } }
        .rf-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .rf-btn:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
      `}</style>
      <div style={{ flex: 1 }}>
        <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: 44, width: 'auto', display: 'block' }} />
          <select value={lang} onChange={e => setLang(e.target.value as QrLang)} aria-label="Language" dir="ltr"
            style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(251,238,221,0.5)', background: 'rgba(255,255,255,0.12)', color: '#FBEEDD', fontSize: 12.5, outline: 'none' }}>
            {QR_LANGS.map(l => <option key={l.code} value={l.code} style={{ color: '#3A2F1F' }}>{l.label}</option>)}
          </select>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #F0E4D6', borderRadius: 18, boxShadow: '0 2px 14px rgba(107,45,78,0.06)', overflow: 'hidden' }}>
            {!lookup ? (
              <p style={{ padding: 40, textAlign: 'center', color: '#8A7B6C', margin: 0 }}>{t('loading')}</p>
            ) : !lookup.found ? (
              <p style={{ padding: '40px 28px', textAlign: 'center', color: '#3A2F1F', margin: 0, lineHeight: 1.6 }}>{t('invalidLink')}</p>
            ) : sent ? (
              <div style={{ padding: '36px 28px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#66BB6A,#2E7D32)', color: '#fff', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{'\u2713'}</div>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#4A1F38' }}>{t('sentTitle')}</h2>
                <p style={{ margin: 0, fontSize: 14, color: '#8A7B6C', lineHeight: 1.6 }}>{t('sentBody')}</p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', padding: '18px 20px 14px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderBottom: '1px solid #F0E4D6' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: 1.2 }}>{t('title')}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#6B2D4E' }}>{t('invitedBy', { name: lookup.referrerFirstName || '' })}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 21, fontWeight: 800, color: '#3A1F2E' }}>{lookup.groupName}</p>
                </div>
                <div style={{ padding: '18px 22px 22px' }}>
                  <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#8A7B6C', lineHeight: 1.6 }}>{t('intro')}</p>
                  <div className="rf-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {field('firstName', 'text', 'given-name')}
                    {field('lastName', 'text', 'family-name')}
                    {field('email', 'email', 'email')}
                    {field('phone', 'tel', 'tel')}
                  </div>
                  <div style={{ marginBottom: 12 }}>{field('address', 'text', 'street-address')}</div>
                  <div className="rf-three" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelCss}>{t('country')} *</label>
                      <select value={form.country} onChange={e => set('country', e.target.value)} style={{ ...inputCss, border: '1.5px solid ' + (badFields.includes('country') ? '#C62828' : '#EAD9BE') }}>
                        <option value="">{t('selectCountry')}</option>
                        {MEMBER_COUNTRIES.map(c => (
                          <option key={c.value} value={c.value}>{c.code ? countryLabel(c.code, lang) : t('otherCountry')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelCss}>{t('nationality')} <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>({t('optional')})</span></label>
                      <input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder={t('nationalityHint')} maxLength={60} style={{ ...inputCss, border: '1.5px solid #EAD9BE' }} />
                    </div>
                    <div>
                      <label style={labelCss}>{t('gender')} <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>({t('optional')})</span></label>
                      <select value={form.gender} onChange={e => set('gender', e.target.value)} style={{ ...inputCss, border: '1.5px solid #EAD9BE' }}>
                        <option value="">{t('notSpecified')}</option>
                        <option value="Male">{t('male')}</option>
                        <option value="Female">{t('female')}</option>
                      </select>
                    </div>
                  </div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A08B7D', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {t('message')} <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>({t('optional')})</span>
                  </label>
                  <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} maxLength={500}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 10, fontSize: 14, color: '#3A2F1F', background: '#FFFDF9', border: '1.5px solid #EAD9BE', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', resize: 'vertical' }} />
                  {error && <p style={{ margin: '12px 0 0', fontSize: 13, color: '#C62828', fontWeight: 600 }}>{error}</p>}
                  <button onClick={submit} disabled={sending} className="rf-btn"
                    style={{ width: '100%', marginTop: 16, padding: 12, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
                    {sending ? t('sending') : t('submit')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
