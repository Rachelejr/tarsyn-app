'use client';
// UNIMUNITY Support Widget - AI tab content
//
// This is UnimunityAIPanel.tsx's original session/API logic, unchanged:
// same /api/ai/chat call, same idToken/message/lang/sessionId payload,
// same conversation history handling, same RobotAvatar states, same
// "automated assistant, not a human" footer, same never-claim-an-action
// wording. Nothing here talks to the AI backend differently than before.
//
// What moved out (now owned by the parent UnimunitySupportWidget, per the
// spec's "avoid duplicated listeners/authentication logic" rule):
//   - the Super Admin auth check (the parent only mounts this component at
//     all once it has confirmed the signed-in account is the Super Admin -
//     see UnimunitySupportWidget.tsx)
//   - the independent floating launcher, position, open/minimize/close
//   - the language selector (now shared with Home in the parent header)
//   - the "Expand" button and its 420x520 large mode - the unified widget
//     has one fixed compact size per the final spec ("AI EXPAND: controlled
//     responsive AI view, but NEVER a large Dashboard-covering window"),
//     so there is no separate expanded state to control anymore
import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { C } from './theme';
import { t, SupportLang } from './i18n';
import RobotAvatar from '../ai/RobotAvatar';

type ChatEntry = { role: 'user' | 'assistant'; content: string };

const DEFAULT_SUGGESTIONS = [
  'Analyze the platform',
  'Show me any issues',
  'Help me manage UNIMUNITY',
  'Check the configuration',
  'I have a question',
];

const SendIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.or} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

interface AIContentProps {
  lang: SupportLang;
}

export default function AIContent({ lang }: AIContentProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, sending]);

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

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14, boxSizing: 'border-box' }}>
        {entries.length === 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 4px' }}>
              <RobotAvatar state="welcome" variant="bust" size={72} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ flexShrink: 0, marginBottom: 2 }}>
                <RobotAvatar state="welcome" variant="head" size={26} />
              </div>
              <div style={{ background: C.creme, color: C.bordeauxDark, padding: '11px 14px', borderRadius: '10px 10px 10px 2px', fontSize: 13.5, lineHeight: 1.5, maxWidth: 280 }}>
                {t(lang, 'aiWelcome')}
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
              {t(lang, 'aiThinking')}
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: '#b91c1c', fontSize: 12.5 }}>{error}</div>
        )}

        <div style={{ marginTop: 'auto', fontSize: 10.5, color: C.muted, textAlign: 'center', fontStyle: 'italic', paddingTop: 8 }}>
          {t(lang, 'aiFooter')}
        </div>
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder={t(lang, 'aiPlaceholder')}
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
            width: 34, height: 34, borderRadius: '50%', background: C.bordeaux, border: 'none',
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
