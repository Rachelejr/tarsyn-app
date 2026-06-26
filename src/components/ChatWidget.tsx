'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { listenToUserChats, listenToMessages, sendMessage, markChatAsRead, getOrCreatePrivateChat, ChatSummary, ChatMessage } from '@/lib/chat';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A2D5E',
  bubbleMine: '#F3E3CE',
  bg: '#FAF0E6',
  white: '#FFFFFF',
  textGris: '#7A5068',
  textDark: '#2C1A3E',
  dore: '#D4AF7A',
};

const EMOJIS = ['😀','😂','😍','👍','🙏','❤️','😢','😮','🎉','🔥','💰','✅'];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatName, setActiveChatName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{userId:string;name:string;email:string}[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToUserChats(user.uid, (data) => setChats(data));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!activeChatId || !user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'chats', activeChatId));
      if (snap.exists()) setActiveChatName(snap.data().name || 'Chat');
    })();
    const unsub = listenToMessages(activeChatId, (msgs) => {
      setMessages(msgs);
      markChatAsRead(activeChatId, user.uid);
    });
    return () => unsub();
  }, [activeChatId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim().length < 2 || !user) { setSearchResults([]); return; }
    const membersSnap = await getDocs(collection(db, 'members'));
    const results: {userId:string;name:string;email:string}[] = [];
    const seen = new Set<string>();
    membersSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.userId && data.userId !== user.uid && !seen.has(data.userId) &&
        (data.name?.toLowerCase().includes(term.toLowerCase()) || data.email?.toLowerCase().includes(term.toLowerCase()))) {
        seen.add(data.userId);
        results.push({ userId: data.userId, name: data.name || 'Unknown', email: data.email || '' });
      }
    });
    setSearchResults(results.slice(0, 8));
  };

  const startChat = async (member: {userId:string;name:string}) => {
    if (!user) return;
    const chatId = await getOrCreatePrivateChat(user.uid, member.userId, member.name);
    setActiveChatId(chatId);
    setActiveChatName(member.name);
    setShowSearch(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!text.trim() || !user || !activeChatId) return;
    const senderName = user.displayName || user.email?.split('@')[0] || 'Member';
    const toSend = text.trim();
    setText('');
    setShowEmoji(false);
    await sendMessage(activeChatId, user.uid, senderName, toSend);
  };

  const addEmoji = (emoji: string) => setText((t) => t + emoji);

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: 'Inter, sans-serif' }}>
      {!open && (
        <button onClick={() => setOpen(true)}
          style={{ width: '58px', height: '58px', borderRadius: '50%', background: C.bordeaux, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.25)', fontSize: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          💬
        </button>
      )}

      {open && (
        <div style={{ width: '340px', height: '480px', background: C.white, borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ background: C.bordeaux, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
            {activeChatId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => { setActiveChatId(null); setMessages([]); }}
                  style={{ background: 'none', border: 'none', color: C.dore, fontSize: '18px', cursor: 'pointer', padding: 0 }}>←</button>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: C.bordeauxDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: C.dore }}>
                  {activeChatName?.[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>{activeChatName}</span>
              </div>
            ) : (
              <span style={{ fontWeight: 700, fontSize: '15px' }}>💬 Chats</span>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              {!activeChatId && (
                <button onClick={() => setShowSearch(!showSearch)}
                  style={{ background: 'none', border: 'none', color: C.dore, fontSize: '16px', cursor: 'pointer' }}>➕</button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: C.dore, fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>
          </div>

          {!activeChatId && (
            <div style={{ flex: 1, overflowY: 'auto', background: C.white }}>
              {showSearch && (
                <div style={{ padding: '10px', borderBottom: `1px solid ${C.bg}` }}>
                  <input autoFocus value={searchTerm} onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search a member..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '20px', border: `1px solid ${C.bg}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  {searchResults.map((m) => (
                    <div key={m.userId} onClick={() => startChat(m)}
                      style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', color: C.textDark, borderRadius: '6px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <strong>{m.name}</strong><br/>
                      <span style={{ color: C.textGris, fontSize: '11px' }}>{m.email}</span>
                    </div>
                  ))}
                </div>
              )}
              {chats.length === 0 ? (
                <p style={{ textAlign: 'center', color: C.textGris, fontSize: '13px', marginTop: '40px' }}>No conversations yet.</p>
              ) : (
                chats.map((chat) => (
                  <div key={chat.id} onClick={() => { setActiveChatId(chat.id); setActiveChatName(chat.name); }}
                    style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: `1px solid ${C.bg}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: C.bordeaux, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dore, fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                      {chat.type === 'group' ? '👥' : chat.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '13px', color: C.textDark }}>{chat.name}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: C.textGris, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chat.lastMessage?.text || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeChatId && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', background: C.bg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {messages.length === 0 && (
                  <p style={{ textAlign: 'center', color: C.textGris, fontSize: '12px', marginTop: '30px' }}>Say hello 👋</p>
                )}
                {messages.map((m) => {
                  const isMine = m.senderId === user.uid;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%', padding: '8px 11px', borderRadius: isMine ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                        background: isMine ? C.bubbleMine : C.white,
                        boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                      }}>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textDark, wordBreak: 'break-word' }}>{m.text}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.textGris, textAlign: 'right' }}>{formatTime(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {showEmoji && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px', background: C.white, borderTop: `1px solid ${C.bg}` }}>
                  {EMOJIS.map((e) => (
                    <span key={e} onClick={() => addEmoji(e)} style={{ fontSize: '20px', cursor: 'pointer' }}>{e}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px', background: C.white, borderTop: `1px solid ${C.bg}` }}>
                <button onClick={() => setShowEmoji(!showEmoji)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '0 2px' }}>😊</button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: '20px', border: `1px solid ${C.bg}`, fontSize: '13px', outline: 'none' }}
                />
                <button onClick={handleSend}
                  style={{ background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '15px', flexShrink: 0 }}>
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
