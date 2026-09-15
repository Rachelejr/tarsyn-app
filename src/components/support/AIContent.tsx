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
import type { User } from 'firebase/auth';
import { C } from './theme';
import { t, tName, agentName, SupportLang } from './i18n';
import RobotAvatar, { AIPersona } from '../ai/RobotAvatar';

type ChatEntry = { role: 'user' | 'assistant'; content: string };

const SendIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.or} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

interface AIContentProps {
  lang: SupportLang;
  persona: AIPersona;
  user: User;
}

export default function AIContent({ lang, persona, user }: AIContentProps) {
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
      // Bug found once member accounts could actually reach this component
      // (previously only the Super Admin account - signed in via `auth` -
      // ever got this far): this used to read `auth.currentUser` directly,
      // which is the ADMIN Firebase Auth instance and is always null for a
      // member session (members sign in via the separate `memberAuth`
      // instance - see lib/firebase.ts). That silently sent idToken as
      // undefined, and the backend correctly rejected it as "Missing
      // idToken or message". Fixed by taking the already-resolved `user`
      // (adminUser || memberUser) as a prop from the parent widget, the
      // same pattern MessagesContent already uses.
      const idToken = await user.getIdToken();
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

  const suggestions = [t(lang, 'aiSug1'), t(lang, 'aiSug2'), t(lang, 'aiSug3'), t(lang, 'aiSug4')];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.ivoire }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
        {entries.length === 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '4px 0 6px' }}>
              <RobotAvatar state="welcome" variant="bust" size={76} persona={persona} />
              <div style={{ fontWeight: 800, fontSize: 13.5, color: C.bordeauxDark, letterSpacing: 0.2 }}>
                {agentName(persona)}
              </div>
            </div>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, color: C.bordeauxDark, padding: '13px 15px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.55, boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              {tName(lang, 'aiWelcome', persona)}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 }}>
              {t(lang, 'aiSuggestionsLabel')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.white,
                    color: C.bordeauxDark, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                    boxShadow: '0 1px 4px rgba(74,31,56,0.05)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {entries.map((e, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: e.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
            {e.role === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 2 }}>
                <RobotAvatar state="welcome" variant="head" size={20} persona={persona} />
                <span style={{ fontSize: 11, fontWeight: 800, color: C.bordeauxDark }}>{agentName(persona)}</span>
              </div>
            )}
            <div style={{
              background: e.role === 'user' ? C.bordeaux : C.white,
              color: e.role === 'user' ? C.white : C.bordeauxDark,
              border: e.role === 'user' ? 'none' : `1px solid ${C.border}`,
              padding: '11px 14px',
              borderRadius: e.role === 'user' ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
              fontSize: 13.5, lineHeight: 1.55, maxWidth: '82%', whiteSpace: 'pre-wrap',
              boxShadow: e.role === 'user' ? 'none' : '0 1px 6px rgba(74,31,56,0.05)',
            }}>
              {e.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 2 }}>
              <RobotAvatar state="thinking" variant="head" size={20} persona={persona} />
              <span style={{ fontSize: 11, fontWeight: 800, color: C.bordeauxDark }}>{agentName(persona)}</span>
            </div>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, color: C.muted, padding: '11px 14px', borderRadius: '3px 14px 14px 14px', fontSize: 13 }}>
              {t(lang, 'aiThinking')}
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: '#b91c1c', fontSize: 12.5 }}>{error}</div>
        )}

        <div style={{ marginTop: 'auto', fontSize: 10.5, color: C.muted, textAlign: 'center', paddingTop: 8 }}>
          {tName(lang, 'aiFooter', persona)}
        </div>
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, boxSizing: 'border-box', background: C.white }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder={t(lang, 'aiPlaceholder')}
          disabled={sending}
          style={{
            flex: 1, padding: '10px 15px', borderRadius: 22, border: `1px solid ${C.border}`,
            background: C.creme, fontSize: 13, color: C.bordeauxDark, outline: 'none',
          }}
        />
        <button
          onClick={() => send()}
          disabled={sending || !input.trim()}
          aria-label="Send"
          style={{
            width: 36, height: 36, borderRadius: '50%', background: C.bordeaux, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: sending || !input.trim() ? 'default' : 'pointer', opacity: sending || !input.trim() ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(107,45,78,0.3)',
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
