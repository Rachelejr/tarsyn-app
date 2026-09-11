'use client';

// UNIMUNITY Support Widget - Home tab ("community center")
// Deliberately lightweight: a greeting plus real shortcuts into Messages
// and AI. No search, no notifications/reminders, no "recent activity" -
// those would need data sources this widget doesn't have, and the spec is
// explicit that Home must never invent information or fake notifications.
// The one piece of live data shown here (the unread count) comes straight
// from MessagesContent's own state via the parent - nothing is guessed.

import { C } from './theme';
import { t, SupportLang } from './i18n';
import RobotAvatar, { AIPersona } from '../ai/RobotAvatar';

interface HomeContentProps {
  lang: SupportLang;
  unreadCount: number;
  showAI: boolean;
  persona: AIPersona;
  onGoToMessages: () => void;
  onGoToAI: () => void;
}

function ChatBubbleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.bordeaux} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function ChevronIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function HomeContent({ lang, unreadCount, showAI, persona, onGoToMessages, onGoToAI }: HomeContentProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.bordeauxDark }}>{t(lang, 'homeGreeting')}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{t(lang, 'homeSubtitle')}</div>
      </div>

      <button
        onClick={onGoToMessages}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px',
          borderRadius: 14, border: `1px solid ${C.border}`, background: C.white,
          cursor: 'pointer', textAlign: 'left', width: '100%', boxSizing: 'border-box',
          boxShadow: '0 1px 6px rgba(74,31,56,0.05)',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: C.creme,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ChatBubbleIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: C.bordeauxDark, display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.3 }}>
            {t(lang, 'homeMessages')}
            {unreadCount > 0 && (
              <span style={{
                background: C.bordeaux, color: C.white, fontSize: 10.5, fontWeight: 800,
                borderRadius: 999, padding: '1px 7px', lineHeight: 1.5,
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>
            {unreadCount > 0 ? `${unreadCount} ${t(lang, 'homeMessagesUnread')}` : t(lang, 'homeMessagesEmpty')}
          </div>
        </div>
        <ChevronIcon />
      </button>

      {showAI && (
        <button
          onClick={onGoToAI}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px',
            borderRadius: 14, border: `1px solid ${C.border}`, background: C.white,
            cursor: 'pointer', textAlign: 'left', width: '100%', boxSizing: 'border-box',
            boxShadow: '0 1px 6px rgba(74,31,56,0.05)',
          }}
        >
          <div style={{ flexShrink: 0, display: 'flex' }}>
            <RobotAvatar state="welcome" variant="head" size={40} persona={persona} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: C.bordeauxDark, lineHeight: 1.3 }}>{t(lang, 'homeAskAI')}</div>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{t(lang, 'homeAskAISubtitle')}</div>
          </div>
          <ChevronIcon />
        </button>
      )}
    </div>
  );
}
