'use client';

// UNIMUNITY Support Widget - single unified floating window
// Replaces the two previously-independent floating components
// (ChatWidget.tsx + UnimunityAIPanel.tsx) with ONE launcher, ONE window,
// ONE position (bottom-right), with internal Home / Messages / AI
// navigation. See the "UNIMUNITY - FINAL SPECIFICATION" this implements.
//
// This file owns ONLY presentation/shell concerns: auth state (lifted up
// from the two old components so it exists once, not duplicated), device
// tier/responsive sizing, open/minimized/closed state, active tab, shared
// language selection, and the unread-message badge. It does not contain
// any AI or Messages business logic itself - that stays inside
// AIContent.tsx / MessagesContent.tsx exactly as it worked before.
import { useEffect, useState, type CSSProperties } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, memberAuth, db, memberDb, storage, memberStorage } from '@/lib/firebase';
import { SUPER_ADMIN_EMAIL } from '@/lib/ai/constants';
import { C, deviceTierFor, DeviceTier } from './theme';
import { t, SUPPORT_LANGUAGES, SupportLang } from './i18n';
import RobotAvatar from '../ai/RobotAvatar';
import HomeContent from './HomeContent';
import MessagesContent from './MessagesContent';
import AIContent from './AIContent';

type PanelState = 'closed' | 'open' | 'minimized';
type Tab = 'home' | 'messages' | 'ai';

const CloseIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const MinimizeIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="5" y1="19" x2="19" y2="19" /></svg>
);
const LauncherIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.or} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const HomeIcon = ({ size = 18, active = false }: { size?: number; active?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? C.bordeaux : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);
const MessagesIcon = ({ size = 18, active = false }: { size?: number; active?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? C.bordeaux : C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export default function UnimunitySupportWidget() {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [memberUser, setMemberUser] = useState<User | null>(null);
  const user = adminUser || memberUser;
  const isSuperAdmin = !!adminUser && adminUser.email === SUPER_ADMIN_EMAIL;
  const firestoreDb = adminUser ? db : memberDb;
  const storageInstance = adminUser ? storage : memberStorage;

  const [tier, setTier] = useState<DeviceTier>('desktop');
  const [panelState, setPanelState] = useState<PanelState>('closed');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [lang, setLang] = useState<SupportLang>('en');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAdminUser(u));
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = onAuthStateChanged(memberAuth, (u) => setMemberUser(u));
    return () => unsub();
  }, []);
  useEffect(() => {
    const check = () => setTier(deviceTierFor(window.innerWidth));
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!user) return null;
  const isMobile = tier === 'mobile';

  // The AI tab can never be shown for a non-Super-Admin account, even
  // transiently (e.g. Super Admin status changing mid-session) - derived
  // at render time rather than synced back into state in an effect.
  const effectiveTab: Tab = !isSuperAdmin && activeTab === 'ai' ? 'home' : activeTab;

  // Panel heights were bumped up a bit (~80px) from the first pass -
  // Rachele felt the window was too short - while still respecting the
  // spec's "never a large Dashboard-covering window" rule via the
  // viewport-relative caps (vh / calc(100vh - ...)).
  const panelStyle: CSSProperties = isMobile
    ? { right: 12, bottom: 12, width: 'calc(100vw - 24px)', height: 'min(78vh, 540px)', borderRadius: 18 }
    : tier === 'tablet'
      ? { right: 16, bottom: 16, width: 'min(320px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 32px))', borderRadius: 18 }
      : { right: 20, bottom: 20, width: 'min(320px, 92vw)', height: 'min(540px, calc(100vh - 40px))', borderRadius: 20 };

  return (
    <>
      {panelState === 'closed' && (
        <button
          onClick={() => setPanelState('open')}
          aria-label="Open UNIMUNITY Assistant"
          style={{
            position: 'fixed', right: 20, bottom: 20, zIndex: 1000,
            width: 60, height: 60, borderRadius: '50%', background: C.bordeaux,
            border: 'none', cursor: 'pointer', boxShadow: '0 6px 18px rgba(74,31,56,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LauncherIcon />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2, background: '#C62828', color: '#fff',
              fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
              border: `2px solid ${C.creme}`,
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {panelState === 'minimized' && (
        <div style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 1000,
          width: 'min(190px, calc(100vw - 40px))', height: 44, background: C.white, borderRadius: 14,
          border: `1px solid ${C.border}`, boxShadow: '0 10px 28px rgba(74,31,56,0.28)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}>
          <button onClick={() => setPanelState('open')} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Reopen UNIMUNITY Assistant">
            <RobotAvatar state="welcome" variant="head" size={28} />
          </button>
          <button onClick={() => setPanelState('open')} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: C.bordeauxDark }}>
            UNIMUNITY
            {unreadCount > 0 && (
              <span style={{ marginLeft: 6, background: C.bordeaux, color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '1px 6px' }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setPanelState('closed')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }} aria-label="Close UNIMUNITY Assistant">
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Always mounted once `user` exists (so Messages'/AI's listeners and
          conversation state stay alive across tab switches and while the
          widget is closed/minimized, exactly like the two original
          components already did) - only visibility is toggled. */}
      <div
        style={{
          position: 'fixed', ...panelStyle, zIndex: 1000, background: C.white,
          border: isMobile ? 'none' : `1px solid ${C.border}`,
          boxShadow: isMobile ? 'none' : '0 20px 48px rgba(74,31,56,0.34)',
          display: panelState === 'open' ? 'flex' : 'none',
          flexDirection: 'column', overflow: 'hidden', fontFamily: 'inherit',
        }}
      >
        <div style={{
          background: C.creme, padding: isMobile ? 'calc(10px + env(safe-area-inset-top)) 14px 10px' : '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `2px solid ${C.bordeaux}`, flexShrink: 0, gap: 8,
        }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.bordeauxDark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t(lang, 'widgetTitle')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportLang)}
              aria-label="Language"
              style={{
                fontSize: 11, fontWeight: 700, color: C.bordeaux, background: C.white,
                border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 4px', marginRight: 4,
              }}
            >
              {SUPPORT_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button onClick={() => setPanelState('minimized')} title="Minimize" style={{ background: 'none', border: 'none', color: C.bordeaux, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <MinimizeIcon />
            </button>
            <button onClick={() => setPanelState('closed')} title="Close" style={{ background: 'none', border: 'none', color: C.bordeaux, cursor: 'pointer', display: 'flex', padding: 4 }}>
              <CloseIcon />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, display: effectiveTab === 'home' ? 'flex' : 'none', flexDirection: 'column' }}>
            <HomeContent
              lang={lang}
              unreadCount={unreadCount}
              showAI={isSuperAdmin}
              onGoToMessages={() => setActiveTab('messages')}
              onGoToAI={() => setActiveTab('ai')}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: effectiveTab === 'messages' ? 'flex' : 'none', flexDirection: 'column' }}>
            <MessagesContent
              user={user}
              firestoreDb={firestoreDb}
              storageInstance={storageInstance}
              onUnreadCountChange={setUnreadCount}
            />
          </div>
          {isSuperAdmin && (
            <div style={{ position: 'absolute', inset: 0, display: effectiveTab === 'ai' ? 'flex' : 'none', flexDirection: 'column' }}>
              <AIContent lang={lang} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', borderTop: `1px solid ${C.border}`, flexShrink: 0, background: C.white }}>
          <button
            onClick={() => setActiveTab('home')}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: effectiveTab === 'home' ? C.bordeaux : C.muted,
            }}
          >
            <HomeIcon active={effectiveTab === 'home'} />
            <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t(lang, 'navHome')}</span>
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
              color: effectiveTab === 'messages' ? C.bordeaux : C.muted,
            }}
          >
            <div style={{ position: 'relative' }}>
              <MessagesIcon active={effectiveTab === 'messages'} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6, background: '#C62828', color: '#fff',
                  fontSize: 9, fontWeight: 800, borderRadius: 999, minWidth: 14, height: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t(lang, 'navMessages')}</span>
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('ai')}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 4px', background: 'none', border: 'none', cursor: 'pointer',
                color: effectiveTab === 'ai' ? C.bordeaux : C.muted,
              }}
            >
              <RobotAvatar state={effectiveTab === 'ai' ? 'welcome' : 'idle'} variant="head" size={20} />
              <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t(lang, 'navAI')}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
