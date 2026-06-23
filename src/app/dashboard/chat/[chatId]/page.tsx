'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { listenToMessages, sendMessage, markChatAsRead, ChatMessage } from '@/lib/chat';

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;

  const [user, setUser] = useState<any>(null);
  const [chatName, setChatName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!chatId) return;
    const loadChat = async () => {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        setChatName(chatDoc.data().name || 'Chat');
      }
    };
    loadChat();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = listenToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    if (user && chatId && messages.length > 0) {
      markChatAsRead(chatId, user.uid);
    }
  }, [user, chatId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    const senderName = user.displayName || user.email?.split('@')[0] || 'User';
    try {
      await sendMessage(chatId, user.uid, senderName, text);
      setText('');
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF0E6' }}>
        <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: '#6B2D4E', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.push('/dashboard/chat')}
          style={{ background: 'transparent', border: 'none', color: '#D4AF7A', fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}>
          ←
        </button>
        <span style={{ color: '#D4AF7A', fontWeight: 800, fontSize: '16px' }}>{chatName}</span>
      </nav>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box',
      }}>
        {messages.length === 0 && (
          <p style={{ color: '#7A5068', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
            No messages yet. Say hello! 👋
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === user?.uid;
          const isRead = (msg.readBy || []).length > 1;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%' }}>
                {!isMine && (
                  <p style={{ margin: '0 0 2px 4px', color: '#7A5068', fontSize: '11px', fontWeight: 600 }}>{msg.senderName}</p>
                )}
                <div style={{
                  background: isMine ? '#6B2D4E' : 'white',
                  color: isMine ? '#FAF0E6' : '#2C1A3E',
                  padding: '10px 14px',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <p style={{
                  margin: '2px 4px 0', fontSize: '10px', color: '#7A5068',
                  textAlign: isMine ? 'right' : 'left',
                }}>
                  {formatTime(msg.createdAt)} {isMine && (isRead ? '· Read ✓✓' : '· Sent ✓')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        background: 'white', padding: '12px 20px', display: 'flex', gap: '10px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)', position: 'sticky', bottom: 0,
        maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box',
      }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '12px 16px', border: '1.5px solid #E8D5E0', borderRadius: '24px',
            fontSize: '14px', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{
            background: '#6B2D4E', color: '#FAF0E6', border: 'none', borderRadius: '50%',
            width: '44px', height: '44px', fontSize: '18px', cursor: 'pointer',
            opacity: (sending || !text.trim()) ? 0.5 : 1, flexShrink: 0,
          }}>
          →
        </button>
      </div>
    </div>
  );
}