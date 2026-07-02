'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { listenToMessages, sendMessage, markChatAsRead, clearChat, ChatMessage } from '@/lib/chat';

const C = {
  creme: '#FBEEDD',
  white: '#FFFFFF',
  gold: '#E9C77B',
  bordeaux: '#6E93AC',
  texteGris: '#6E93AC',
  texteFonce: '#4A6B85',
  border: '#EAD9BE',
};

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  { label: 'Smileys', icon: '😀', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'] },
  { label: 'Gestures', icon: '👋', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦵','🦶','👂','👃','🧠','🦷','🦴','👀','👁️','👅','👄'] },
  { label: 'Hearts', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️'] },
  { label: 'People', icon: '🧑', emojis: ['👶','🧒','👦','👧','🧑','👨','👩','🧓','👴','👵','👮','🕵️','💂','👷','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟'] },
  { label: 'Animals', icon: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦏','🦛','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩'] },
  { label: 'Food', icon: '🍕', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🧂','🥤','🧃','🧊','☕','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃'] },
  { label: 'Activities', icon: '⚽', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️'] },
  { label: 'Travel', icon: '🚗', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍️','🛺','🚲','🛴','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','⛽','🚧','🚦','🚥'] },
  { label: 'Objects', icon: '💡', emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','💽','💾','💿','📀','📷','📸','📹','🎥','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','💡','🔦','🏮','📔','📕','📖','📗','📘','📙','📚','📓','📒','📃','📜','📄','📰','🗞️','🔖','💰','💴','💵','💶','💷','💸','💳','🧾','✉️','📧','📨','📩','📤','📥','📦','📫','📪','📬','📭','📮','📝','✏️','✒️','🖋️','🖊️','🖌️','🖍️','📌','📍','✂️','🔒','🔓','🔏','🔐','🔑'] },
  { label: 'Symbols', icon: '✨', emojis: ['✨','🎉','🎊','🎈','🎁','🏆','🥇','⭐','🌟','💫','🔥','💯','✅','❌','⚠️','🚫','💢','💥','💦','💨','🕳️','💣','💤','♻️','🔱','📛','🔰','⭕','✔️','☑️','✳️','❇️','💠','🔘','🔵','🟢','🟡','🟠','🔴','🟣','⚫','⚪','🟤'] },
];

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
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setShowEmoji(false);
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleClearChat = async () => {
    if (!confirm('Clear this entire conversation? This cannot be undone.')) return;
    setClearing(true);
    setShowMenu(false);
    try {
      await clearChat(chatId);
    } catch (e) {
      console.error(e);
    }
    setClearing(false);
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.creme }}>
        <p style={{ color: C.bordeaux, fontSize: '18px', fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: C.white, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        position: 'sticky', top: 0, zIndex: 10, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard/chat')}
            style={{ background: 'transparent', border: 'none', color: C.bordeaux, fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}>
            ←
          </button>
          <span style={{ color: C.bordeaux, fontWeight: 800, fontSize: '16px' }}>{chatName}</span>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(!showMenu)}
            style={{ background: 'transparent', border: 'none', color: C.bordeaux, fontSize: '20px', cursor: 'pointer', padding: '0 8px' }}>
            ⋮
          </button>
          {showMenu && (
            <div style={{ position: 'absolute', right: 0, top: '32px', background: C.white, borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: '180px', zIndex: 20, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <button onClick={handleClearChat} disabled={clearing}
                style={{ width: '100%', padding: '12px 16px', background: C.white, border: 'none', color: '#C62828', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                {clearing ? 'Clearing...' : 'Clear conversation'}
              </button>
            </div>
          )}
        </div>
      </nav>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box',
      }}>
        {messages.length === 0 && (
          <p style={{ color: C.texteGris, textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
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
                  <p style={{ margin: '0 0 2px 4px', color: C.texteGris, fontSize: '11px', fontWeight: 600 }}>{msg.senderName}</p>
                )}
                <div style={{
                  background: isMine ? C.gold : C.white,
                  color: C.texteFonce,
                  padding: '10px 14px',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '14px',
                  border: `1px solid ${C.border}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <p style={{
                  margin: '2px 4px 0', fontSize: '10px', color: C.texteGris,
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

      {showEmoji && (
        <div style={{
          background: C.white, borderTop: `1px solid ${C.border}`, maxWidth: '720px', width: '100%', margin: '0 auto',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button key={cat.label} onClick={() => setActiveCategory(i)}
                style={{
                  padding: '10px 14px', background: activeCategory === i ? C.creme : C.white,
                  border: 'none', borderBottom: activeCategory === i ? `2px solid ${C.bordeaux}` : '2px solid transparent',
                  fontSize: '18px', cursor: 'pointer', flexShrink: 0,
                }}>
                {cat.icon}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', padding: '10px', maxHeight: '220px', overflowY: 'auto' }}>
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
              <button key={i} onClick={() => handleEmojiClick(emoji)}
                style={{ background: 'none', border: 'none', fontSize: '22px', padding: '6px', cursor: 'pointer', borderRadius: '8px' }}
                onMouseOver={e => (e.currentTarget.style.background = C.creme)}
                onMouseOut={e => (e.currentTarget.style.background = 'none')}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        background: C.white, padding: '12px 20px', display: 'flex', gap: '8px', alignItems: 'center',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)', position: 'sticky', bottom: 0,
        maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box', borderTop: `1px solid ${C.border}`,
      }}>
        <button onClick={() => setShowEmoji(!showEmoji)}
          style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
          😊
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '12px 16px', border: `1.5px solid ${C.border}`, borderRadius: '24px',
            fontSize: '14px', outline: 'none', background: C.creme,
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{
            background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '50%',
            width: '44px', height: '44px', fontSize: '18px', cursor: 'pointer',
            opacity: (sending || !text.trim()) ? 0.5 : 1, flexShrink: 0,
          }}>
          →
        </button>
      </div>
    </div>
  );
}
