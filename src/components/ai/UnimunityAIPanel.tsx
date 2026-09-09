'use client';

// UNIMUNITY AI Assistant - Phase 1: Super Admin mode
// The real, production assistant panel (talks to /api/ai/chat, unlike the
// internal-only /admin/ai-test page). Mounted globally in layout.tsx next
// to ChatWidget, but deliberately separate from it in every way: own
// launcher (bottom-left vs. Messages' bottom-right), own icon (the
// UNIMUNITY AI robot, never the Messages speech bubble), own data, own
// permissions, own history.
//
// Phase 1 gate: only the Super Admin account sees this at all. The panel
// itself is intentionally large and professional, not a small support
// widget - it supports open/minimize/expand/close and is fully responsive
// (full-screen on phones/narrow tablets, a large anchored panel on desktop).

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { SUPER_ADMIN_EMAIL } from '@/lib/ai/constants';
import RobotAvatar from './RobotAvatar';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  creme: '#FBEEDD',
  white: '#FFFFFF',
  border: '#EAD9BE',
  or: '#E9C77B',
  muted: '#6b7280',
  danger: '#b91c1c',
};

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ht', label: 'HT' },
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
];

// Generic, platform-level suggestions only - never a Tontine- or
// Church-specific one here. Module-specific suggestions are a later
// enhancement, shown only once the panel is context-aware of where the
// person actually is in the app.
const DEFAULT_SUGGESTIONS = [
  'Analyze the platform',
  'Show me any issues',
  'Help me manage UNIMUNITY',
  'Check the configuration',
  'I have a question',
];

type PanelState = 'closed' | 'open' | 'minimized';
type ChatEntry = { role: 'user' | 'assistant'; content: string };

const SparkleIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={C.or}><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" /></svg>
);
const SendIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.or} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const CloseIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const MinimizeIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="5" y1="19" x2="19" y2="19" /></svg>
);
const ExpandIcon = ({ size = 14, expanded = false }: { size?: number; expanded?: boolean }) => (
  expanded ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
);

export default function UnimunityAIPanel() {
  const [authorized, setAuthorized] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>('closed');
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lang, setLang] = useState('en');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAuthorized(!!u && u.email === SUPER_ADMIN_EMAIL));
    return () => unsub();
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, sending]);

  if (!authorized) return null;

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setError('');
    setEntries(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, message: text, lang, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else {
        if (data.sessionId) setSessionId(data.sessionId);
        if (data.error) setError(data.error);
        if (data.text) setEntries(prev => [...prev, { role: 'assistant', content: data.text }]);
      }
    } catch (e: any) {
      setError(e?.message || 'Request failed');
    } finally {
      setSending(false);
    }
  };

  // --- Closed: just the launcher, bottom-left, distinct from Messages ---
  if (panelState === 'closed') {
    return (
      <button
        onClick={() => setPanelState('open')}
        aria-label="Open UNIMUNITY AI"
        style={{
          position: 'fixed', left: 20, bottom: 20, zIndex: 1000,
          width: 60, height: 60, borderRadius: '50%', background: C.bordeaux,
          border: 'none', cursor: 'pointer',
          boxShadow: `0 6px 18px rgba(74,31,56,0.4)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: C.or, opacity: 0.18 }} />
        <RobotAvatar state="welcome" variant="head" size={40} />
      </button>
    );
  }

  // --- Minimized: a small reopenable bar, session stays alive ---
  if (panelState === 'minimized') {
    return (
      <div
        style={{
          position: 'fixed', left: 20, bottom: 20, zIndex: 1000,
          width: 270, height: 56, background: C.white, borderRadius: 16,
          border: `1px solid ${C.border}`, boxShadow: '0 10px 28px rgba(74,31,56,0.28)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      >
        <button onClick={() => setPanelState('open')} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Reopen UNIMUNITY AI">
          <RobotAvatar state={sending ? 'thinking' : 'welcome'} variant="head" size={30} />
        </button>
        <button onClick={() => setPanelState('open')} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: C.bordeauxDark }}>
          UNIMUNITY AI
        </button>
        <button onClick={() => setPanelState('closed')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }} aria-label="Close UNIMUNITY AI">
          <CloseIcon />
        </button>
      </div>
    );
  }

  // --- Open (default large panel, or expanded, or full-screen on mobile) ---
  const panelStyle: CSSProperties = isMobile
    ? { position: 'fixed', inset: 0, borderRadius: 0, width: '100%', height: '100%' }
    : expanded
      ? {
          position: 'fixed', left: 20, bottom: 20,
          width: 'min(920px, 94vw)', height: 'min(860px, calc(100vh - 40px))',
          borderRadius: 20,
        }
      : {
          position: 'fixed', left: 20, bottom: 20,
          width: 'min(480px, 92vw)', height: 'min(720px, calc(100vh - 40px))',
          borderRadius: 20,
        };

  return (
    <div
      style={{
        ...panelStyle,
        zIndex: 1000, background: C.white, border: isMobile ? 'none' : `1px solid ${C.border}`,
        boxShadow: isMobile ? 'none' : '0 20px 48px rgba(74,31,56,0.34)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'inherit',
      }}
    >
      <div style={{
        background: C.creme, padding: '14px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: `2px solid ${C.bordeaux}`, flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <RobotAvatar state={sending ? 'thinking' : 'welcome'} variant="head" size={38} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.bordeauxDark, display: 'flex', alignItems: 'center', gap: 6 }}>
              <SparkleIcon /> UNIMUNITY AI
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Intelligent assistant</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Reply language"
            style={{
              fontSize: 11, fontWeight: 700, color: C.bordeaux, background: C.white,
              border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 4px', marginRight: 4,
            }}
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {!isMobile && (
            <button onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'} style={{ background: 'none', border: 'none', color: C.bordeaux, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <ExpandIcon expanded={expanded} />
            </button>
          )}
          <button onClick={() => setPanelState('minimized')} title="Minimize" style={{ background: 'none', border: 'none', color: C.bordeaux, cursor: 'pointer', display: 'flex', padding: 4 }}>
            <MinimizeIcon />
          </button>
          <button onClick={() => setPanelState('closed')} title="Close" style={{ background: 'none', border: 'none', color: C.bordeaux, cursor: 'pointer', display: 'flex', padding: 4 }}>
            <CloseIcon />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, boxSizing: 'border-box' }}>
        {entries.length === 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 6px' }}>
              <RobotAvatar state="welcome" variant="bust" size={88} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ flexShrink: 0, marginBottom: 2 }}>
                <RobotAvatar state="welcome" variant="head" size={26} />
              </div>
              <div style={{ background: C.creme, color: C.bordeauxDark, padding: '11px 14px', borderRadius: '10px 10px 10px 2px', fontSize: 13.5, lineHeight: 1.5, maxWidth: 320 }}>
                Hello! I'm UNIMUNITY AI, your intelligent assistant. How can I help you today?
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 }}>
              Suggestions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEFAULT_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    padding: '9px 14px', borderRadius: 20, border: `1.5px solid ${C.or}`, background: C.white,
                    color: C.bordeauxDark, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {entries.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: e.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {e.role === 'assistant' && (
              <div style={{ flexShrink: 0, marginBottom: 2 }}>
                <RobotAvatar state="welcome" variant="head" size={26} />
              </div>
            )}
            <div style={{
              background: e.role === 'user' ? C.bordeaux : C.creme,
              color: e.role === 'user' ? C.white : C.bordeauxDark,
              padding: '11px 14px',
              borderRadius: e.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              fontSize: 13.5, lineHeight: 1.5, maxWidth: '78%', whiteSpace: 'pre-wrap',
            }}>
              {e.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flexShrink: 0, marginBottom: 2 }}>
              <RobotAvatar state="thinking" variant="head" size={26} />
            </div>
            <div style={{ background: C.creme, color: C.muted, padding: '11px 14px', borderRadius: '10px 10px 10px 2px', fontSize: 13 }}>
              ...
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: C.danger, fontSize: 12.5 }}>{error}</div>
        )}

        <div style={{ marginTop: 'auto', fontSize: 10.5, color: C.muted, textAlign: 'center', fontStyle: 'italic', paddingTop: 8 }}>
          Automated assistant &mdash; not a human administrator. Use Messages to reach a person.
        </div>
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Type a message"
          disabled={sending}
          style={{
            flex: 1, padding: '9px 14px', borderRadius: 20, border: `1px solid ${C.border}`,
            background: C.creme, fontSize: 13, color: C.bordeauxDark, outline: 'none',
          }}
        />
        <button
          onClick={() => send()}
          disabled={sending || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: C.bordeaux, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: sending || !input.trim() ? 'default' : 'pointer', opacity: sending || !input.trim() ? 0.6 : 1,
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
