'use client';

// UNIMUNITY AI Assistant - Phase 1: Foundation
// Minimal internal test page for the /api/ai/ping diagnostic endpoint.
// Not linked from any navigation - reserved for the super-admin account,
// purely to confirm the AI foundation works end-to-end before any real
// user-facing assistant UI is built in a later phase.

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const SUPER_ADMIN_EMAIL = 'rachelejr779@gmail.com';

// Same 5 languages the rest of the site supports (see the T dict in
// src/app/page.tsx) - this test page lets you pick one so you can confirm
// the AI actually replies in that language, not just English.
const TEST_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'ht', label: 'Kreyol ayisyen' },
  { code: 'es', label: 'Espanol' },
  { code: 'pt', label: 'Portugues' },
];

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38', or: '#E9C77B',
  creme: '#FBEEDD', border: '#EAD9BE', muted: '#6b7280',
};

export default function AiTestPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('Hello! Can you introduce yourself?');
  const [lang, setLang] = useState('en');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ text: string; configured: boolean; error: string | null } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email === SUPER_ADMIN_EMAIL) setAuthorized(true);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/ai/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, message, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ text: '', configured: false, error: data.error || `HTTP ${res.status}` });
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setResult({ text: '', configured: false, error: e?.message || 'Request failed' });
    } finally {
      setSending(false);
    }
  };

  if (checking) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif', color: C.bordeaux }}>Checking access...</div>;
  }

  if (!authorized) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif', color: C.bordeaux }}>Not authorized.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ color: C.bordeauxDark, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>AI Foundation - Test Page</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
          Internal only. Sends a message through the AI foundation (context {'->'} permissions {'->'} aiService {'->'} audit log)
          and shows exactly what comes back, including whether the AI is configured yet.
        </p>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.bordeaux, marginBottom: 6 }}>
          Reply in:
        </label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`,
            fontSize: 13, marginBottom: 16, background: 'white', color: C.bordeauxDark,
          }}
        >
          {TEST_LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: 12, borderRadius: 8, border: `1.5px solid ${C.border}`,
            fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12,
          }}
        />

        <button
          onClick={send}
          disabled={sending}
          style={{
            padding: '10px 20px', background: C.bordeaux, color: 'white', border: 'none',
            borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending ? 'default' : 'pointer',
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>

        {result && (
          <div style={{
            marginTop: 24, padding: 16, borderRadius: 10, background: 'white',
            border: `1px solid ${C.border}`, fontSize: 14, color: C.bordeauxDark, whiteSpace: 'pre-wrap',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, marginBottom: 8 }}>
              CONFIGURED: {String(result.configured)}
            </div>
            {result.error && (
              <div style={{ color: '#b91c1c', marginBottom: 8 }}>
                Error: {result.error}
              </div>
            )}
            {result.text && <div>{result.text}</div>}
            {!result.text && !result.error && (
              <div style={{ color: C.muted }}>(empty response)</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
