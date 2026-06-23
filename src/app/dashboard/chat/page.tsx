'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { listenToUserChats, getOrCreatePrivateChat, ChatSummary } from '@/lib/chat';

interface MemberResult {
  userId: string;
  name: string;
  email: string;
}

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
          data.userId &&
          data.userId !== user.uid &&
          !seen.has(data.userId) &&
          (data.name?.toLowerCase().includes(term.toLowerCase()) ||
            data.email?.toLowerCase().includes(term.toLowerCase()))
        ) {
          seen.add(data.userId);
          results.push({ userId: data.userId, name: data.name || 'Unknown', email: data.email || '' });
        }
      });
      setSearchResults(results.slice(0, 10));
    } catch (e) {
      console.error(e);
    }
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
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF0E6' }}>
        <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#6B2D4E', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/dashboard')} style={{ color: '#D4AF7A', fontWeight: 800, fontSize: '18px', cursor: 'pointer' }}>
          TARSYN
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'transparent', border: '1px solid rgba(212,175,122,0.5)', color: '#D4AF7A', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Dashboard
        </button>
      </nav>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ color: '#6B2D4E', fontSize: '26px', fontWeight: 800, margin: 0 }}>Chats</h1>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            style={{ background: '#6B2D4E', color: '#FAF0E6', padding: '10px 18px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            + New chat
          </button>
        </div>

        {showNewChat && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
            />
            {searching && <p style={{ color: '#7A5068', fontSize: '13px', margin: 0 }}>Searching...</p>}
            {searchResults.map((m) => (
              <div
                key={m.userId}
                onClick={() => startPrivateChat(m)}
                style={{ padding: '10px 8px', cursor: 'pointer', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF0E6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '14px' }}>{m.name}</span>
                <span style={{ color: '#7A5068', fontSize: '12px' }}>{m.email}</span>
              </div>
            ))}
          </div>
        )}

        {chats.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#7A5068' }}>
            No conversations yet. Start a new chat or open a group to begin.
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/dashboard/chat/${chat.id}`)}
                style={{ padding: '16px 20px', borderBottom: '1px solid #F0E5EA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF0E6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: chat.type === 'group' ? '#4A2D5E' : '#6B2D4E',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#D4AF7A', fontWeight: 800, fontSize: '16px', flexShrink: 0,
                }}>
                  {chat.type === 'group' ? '👥' : chat.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', color: '#6B2D4E', fontWeight: 700, fontSize: '14px' }}>{chat.name}</p>
                  <p style={{
                    margin: 0, color: '#7A5068', fontSize: '13px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {chat.lastMessage?.text || 'No messages yet'}
                  </p>
                </div>
                <span style={{ color: '#7A5068', fontSize: '11px', flexShrink: 0 }}>
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