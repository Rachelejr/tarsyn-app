'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { listenToUserChats, getOrCreatePrivateChat, ChatSummary } from '@/lib/chat';

const C = {
  ink: '#1F1320',
  bordeaux: '#6B2D4E',
  dore: '#D4AF7A',
  creme: '#FAF0E6',
  sauge: '#8FA68E',
  roseClair: '#EDD9E5',
  texteGris: '#7A5068',
};

interface MemberResult { userId: string; name: string; email: string; }

export default function ChatListPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToUserChats(user.uid, (data) => {
      setChats(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const membersSnap = await getDocs(collection(db, 'members'));
      const results: MemberResult[] = [];
      const seen = new Set<string>();
      membersSnap.docs.forEach((d) => {
        const data = d.data();
        if (
          data.userId && data.userId !== user.uid && !seen.has(data.userId) &&
          (data.name?.toLowerCase().includes(term.toLowerCase()) || data.email?.toLowerCase().includes(term.toLowerCase()))
        ) {
          seen.add(data.userId);
          results.push({ userId: data.userId, name: data.name || 'Unknown', email: data.email || '' });
        }
      });
      setSearchResults(results.slice(0, 10));
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  const startPrivateChat = async (member: MemberResult) => {
    if (!user) return;
    const chatId = await getOrCreatePrivateChat(user.uid, member.userId, member.name);
    router.push(`/dashboard/chat/${chatId}`);
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.creme }}>
        <p style={{ color: C.bordeaux, fontSize: '15px', fontWeight: 600, letterSpacing: '0.3px' }}>Opening the circle.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <style>{`
        .circle-row { transition: background 0.15s ease, transform 0.15s ease; }
        .circle-row:hover { background: ${C.roseClair}; }
        .circle-search:focus { border-color: ${C.dore} !important; box-shadow: 0 0 0 3px rgba(212,175,122,0.2); }
        .circle-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .circle-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(31,19,32,0.25); }
        .result-row:hover { background: ${C.creme}; }
      `}</style>

      <nav style={{ background: C.ink, padding: '18px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.dore }} />
          <span style={{ color: C.dore, fontWeight: 700, fontSize: '13px', letterSpacing: '3px', fontFamily: 'Georgia, serif' }}>LE CERCLE</span>
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'transparent', border: `1px solid rgba(212,175,122,0.4)`, color: C.dore, padding: '7px 18px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', letterSpacing: '0.5px' }}>
          Dashboard
        </button>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h1 style={{ color: C.ink, fontSize: '32px', fontWeight: 400, margin: 0, letterSpacing: '-0.5px' }}>Conversations</h1>
          <button className="circle-btn" onClick={() => setShowNewChat(!showNewChat)}
            style={{ background: C.ink, color: C.dore, padding: '10px 20px', borderRadius: '24px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            + Start
          </button>
        </div>
        <p style={{ color: C.texteGris, fontSize: '14px', margin: '0 0 32px', fontFamily: 'Inter, sans-serif' }}>
          Every voice in your circle, in one quiet place.
        </p>

        {showNewChat && (
          <div style={{ background: 'white', borderRadius: '4px', padding: '18px', marginBottom: '24px', border: `1px solid ${C.roseClair}` }}>
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search a member by name or email."
              className="circle-search"
              style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${C.roseClair}`, borderRadius: '4px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '4px', fontFamily: 'Inter, sans-serif' }}
            />
            {searching && <p style={{ color: C.texteGris, fontSize: '12px', margin: '10px 0 0', fontFamily: 'Inter, sans-serif' }}>Searching.</p>}
            {searchResults.map((m) => (
              <div key={m.userId} className="result-row" onClick={() => startPrivateChat(m)}
                style={{ padding: '12px 8px', cursor: 'pointer', borderRadius: '4px', display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                <span style={{ color: C.ink, fontWeight: 700, fontSize: '14px', fontFamily: 'Georgia, serif' }}>{m.name}</span>
                <span style={{ color: C.texteGris, fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>{m.email}</span>
              </div>
            ))}
            {searchTerm.trim().length >= 2 && !searching && searchResults.length === 0 && (
              <p style={{ color: C.texteGris, fontSize: '12px', margin: '10px 0 0', fontFamily: 'Inter, sans-serif' }}>No one matches yet.</p>
            )}
          </div>
        )}

        {chats.length === 0 ? (
          <div style={{ borderTop: `1px solid ${C.ink}`, paddingTop: '40px', textAlign: 'center' }}>
            <p style={{ color: C.ink, fontSize: '18px', fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>The circle is quiet.</p>
            <p style={{ color: C.texteGris, fontSize: '13px', fontFamily: 'Inter, sans-serif', margin: 0 }}>Start a conversation or open a group to begin.</p>
          </div>
        ) : (
          <div style={{ borderTop: `1px solid ${C.ink}` }}>
            {chats.map((chat) => (
              <div key={chat.id} className="circle-row" onClick={() => router.push(`/dashboard/chat/${chat.id}`)}
                style={{ padding: '18px 8px', borderBottom: `1px solid ${C.roseClair}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${C.dore}`, background: chat.type === 'group' ? C.ink : C.bordeaux,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.dore, fontWeight: 700, fontSize: '16px', fontFamily: 'Georgia, serif',
                }}>
                  {chat.type === 'group' ? String.fromCharCode(9678) : chat.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', color: C.ink, fontWeight: 700, fontSize: '15px', fontFamily: 'Georgia, serif' }}>{chat.name}</p>
                  <p style={{ margin: 0, color: C.texteGris, fontSize: '13px', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {chat.lastMessage?.text || 'No messages yet'}
                  </p>
                </div>
                <span style={{ color: C.texteGris, fontSize: '11px', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>
                  {formatTime(chat.lastMessage?.createdAt || chat.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
