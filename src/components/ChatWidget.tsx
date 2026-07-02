'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { listenToUserChats, listenToMessages, sendMessage, markChatAsRead, getOrCreatePrivateChat, clearChat, ChatSummary, ChatMessage } from '@/lib/chat';

const C = {
  bordeaux: '#B24C72',
  bordeauxDark: '#8F3A5A',
  bg: '#FBEEDD',
  white: '#FFFFFF',
  border: '#EAD9BE',
  textGris: '#B24C72',
  textDark: '#8F3A5A',
  dore: '#E9C77B',
};

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  { label: 'Smileys', icon: '😀', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','💀','☠️','👻','👽','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'] },
  { label: 'Gestures', icon: '👋', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄','💋','🩸'] },
  { label: 'Hearts', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💌','💯'] },
  { label: 'People', icon: '🧑', emojis: ['👶','🧒','👦','👧','🧑','👨','👩','🧓','👴','👵','👮','🕵️','💂','👷','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','💆','💇','🚶','🧍','🧎','🏃','💃','🕺','👫','👬','👭','💏','💑','👪'] },
  { label: 'Animals', icon: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦏','🦛','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🐓','🦃','🦚','🦜','🦢','🦩','🦨','🦡','🐁','🐀','🐿️'] },
  { label: 'Nature', icon: '🌸', emojis: ['🌸','💐','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🪴','🌲','🌳','🌴','🌵','🌾','🌿','☘️','🍀','🍁','🍂','🍃','🍄','🌍','🌎','🌏','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌚','🌝','🌞','⭐','🌟','💫','✨','☀️','⛅','☁️','🌤️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌈','☂️','☔','⚡','🔥','💧','🌊'] },
  { label: 'Food', icon: '🍕', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🧂','🥤','🧃','🧊','☕','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🍽️','🍴','🥄'] },
  { label: 'Activities', icon: '⚽', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎮','🎲','🎯','🎳','🎰','🧩','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻'] },
  { label: 'Travel', icon: '🚗', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍️','🛺','🚲','🛴','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','⛽','🚧','🚦','🚥','🗺️','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻'] },
  { label: 'Objects', icon: '💡', emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','💽','💾','💿','📀','📷','📸','📹','🎥','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','💡','🔦','🏮','📔','📕','📖','📗','📘','📙','📚','📓','📒','📃','📜','📄','📰','🗞️','🔖','💰','💴','💵','💶','💷','💸','💳','🧾','✉️','📧','📨','📩','📤','📥','📦','📫','📪','📬','📭','📮','📝','✏️','✒️','🖋️','🖊️','🖌️','🖍️','📌','📍','✂️','🔒','🔓','🔏','🔐','🔑','🛋️','🪑','🚪','🪞','🛏️','🧸'] },
  { label: 'Symbols', icon: '✨', emojis: ['✨','🎉','🎊','🎈','🎁','🏆','🥇','⭐','🌟','💫','🔥','💯','✅','❌','⚠️','🚫','💢','💥','💦','💨','🕳️','💣','💤','♻️','🔱','📛','🔰','⭕','✔️','☑️','✳️','❇️','💠','🔘','🔵','🟢','🟡','🟠','🔴','🟣','⚫','⚪','🟤'] },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatName, setActiveChatName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{userId:string;name:string;email:string}[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [clearing, setClearing] = useState(false);
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

  const handleClearChat = async () => {
    if (!activeChatId) return;
    if (!confirm('Clear this entire conversation? This cannot be undone.')) return;
    setClearing(true);
    setShowMenu(false);
    try {
      await clearChat(activeChatId);
    } catch (e) {
      console.error(e);
    }
    setClearing(false);
  };

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

          <div style={{ background: C.white, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.bordeaux, borderBottom: `1px solid ${C.border}` }}>
            {activeChatId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => { setActiveChatId(null); setMessages([]); setShowMenu(false); }}
                  style={{ background: 'none', border: 'none', color: C.bordeaux, fontSize: '18px', cursor: 'pointer', padding: 0 }}>←</button>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: C.bordeaux, border: `1px solid ${C.border}` }}>
                  {activeChatName?.[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>{activeChatName}</span>
              </div>
            ) : (
              <span style={{ fontWeight: 700, fontSize: '15px' }}>💬 Chats</span>
            )}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
              {!activeChatId && (
                <button onClick={() => setShowSearch(!showSearch)}
                  style={{ background: 'none', border: 'none', color: C.bordeaux, fontSize: '16px', cursor: 'pointer' }}>➕</button>
              )}
              {activeChatId && (
                <button onClick={() => setShowMenu(!showMenu)}
                  style={{ background: 'none', border: 'none', color: C.bordeaux, fontSize: '18px', cursor: 'pointer' }}>⋮</button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: C.bordeaux, fontSize: '16px', cursor: 'pointer' }}>✕</button>

              {showMenu && activeChatId && (
                <div style={{ position: 'absolute', right: 0, top: '28px', background: C.white, borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', minWidth: '170px', zIndex: 30, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  <button onClick={handleClearChat} disabled={clearing}
                    style={{ width: '100%', padding: '10px 14px', background: C.white, border: 'none', color: '#C62828', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    {clearing ? 'Clearing...' : 'Clear conversation'}
                  </button>
                </div>
              )}
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
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bordeaux, fontWeight: 700, fontSize: '14px', flexShrink: 0, border: `1px solid ${C.border}` }}>
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
                        background: C.white,
                        border: `1px solid ${C.border}`,
                        boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
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
                <div style={{ background: C.white, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: `1px solid ${C.border}` }}>
                    {EMOJI_CATEGORIES.map((cat, i) => (
                      <button key={cat.label} onClick={() => setActiveCategory(i)}
                        style={{
                          padding: '6px 8px', background: activeCategory === i ? C.bg : C.white,
                          border: 'none', borderBottom: activeCategory === i ? `2px solid ${C.bordeaux}` : '2px solid transparent',
                          fontSize: '15px', cursor: 'pointer',
                        }}>
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', padding: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
                      <span key={i} onClick={() => addEmoji(emoji)}
                        style={{ fontSize: '18px', cursor: 'pointer', textAlign: 'center', padding: '3px', borderRadius: '6px' }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px', background: C.white, borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setShowEmoji(!showEmoji)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '0 2px' }}>😊</button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: '20px', border: `1px solid ${C.border}`, fontSize: '13px', outline: 'none', background: C.bg }}
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
