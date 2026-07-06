'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { listenToUserChats, listenToMessages, sendMessage, sendMediaMessage, markChatAsRead, getOrCreatePrivateChat, clearChat, ChatSummary, ChatMessage } from '@/lib/chat';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  bg: '#FBEEDD',
  white: '#FFFFFF',
  border: '#EAD9BE',
  textGris: '#6B2D4E',
  textDark: '#4A1F38',
  dore: '#E9C77B',
  danger: '#C62828',
  dangerBg: '#FFEBEE',
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
  { label: 'Flags', icon: '🏳️', emojis: ['🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🇺🇸','🇨🇦','🇬🇧','🇫🇷','🇩🇪','🇪🇸','🇮🇹','🇵🇹','🇧🇷','🇲🇽','🇭🇹','🇯🇲','🇩🇴','🇹🇹','🇧🇸','🇧🇧','🇬🇾','🇸🇷','🇳🇬','🇬🇭','🇸🇳','🇨🇮','🇨🇲','🇨🇩','🇰🇪','🇪🇹','🇿🇦','🇪🇬','🇲🇦','🇩🇿','🇹🇳','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇦🇺','🇳🇿','🇷🇺','🇺🇦','🇵🇱','🇳🇱','🇧🇪','🇨🇭','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇬🇷','🇹🇷','🇸🇦','🇦🇪','🇮🇱','🇱🇧','🇺🇳'] },
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

  const [recordingMode, setRecordingMode] = useState<null | 'audio' | 'video'>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const formatSeconds = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m + ':' + String(s).padStart(2, '0');
  };

  const formatDateLabel = (ts: any) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const dOnly = new Date(d); dOnly.setHours(0, 0, 0, 0);
    if (dOnly.getTime() === today.getTime()) return 'Today';
    if (dOnly.getTime() === yesterday.getTime()) return 'Yesterday';
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  async function startRecording(type: 'audio' | 'video') {
    setMediaError('');
    try {
      const constraints: MediaStreamConstraints =
        type === 'audio' ? { audio: true } : { audio: true, video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.play().catch(() => {});
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: type === 'audio' ? 'audio/webm' : 'video/webm',
        });
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingMode(type);
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setMediaError(
        type === 'audio'
          ? 'Microphone access was denied or is unavailable.'
          : 'Camera/microphone access was denied or is unavailable.'
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function cancelRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
    setRecordingMode(null);
    setPreviewBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setRecordSeconds(0);
    setMediaError('');
  }

  async function sendRecordedMedia() {
    if (!previewBlob || !recordingMode || !user || !activeChatId) return;
    setUploadingMedia(true);
    setMediaError('');
    const senderName = user.displayName || user.email?.split('@')[0] || 'Member';
    try {
      await sendMediaMessage(activeChatId, user.uid, senderName, previewBlob, recordingMode, recordSeconds);
      setUploadingMedia(false);
      cancelRecording();
    } catch (e) {
      console.error(e);
      setMediaError('Failed to send. Please check your connection and try again.');
      setUploadingMedia(false);
    }
  }

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
        <div style={{ width: '340px', height: '480px', background: C.white, borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

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
                {messages.flatMap((m, idx) => {
                  const isMine = m.senderId === user.uid;
                  const currentLabel = formatDateLabel(m.createdAt);
                  const prevLabel = idx > 0 ? formatDateLabel(messages[idx - 1].createdAt) : null;
                  const items: React.ReactNode[] = [];

                  if (currentLabel && currentLabel !== prevLabel) {
                    items.push(
                      <div key={'sep-' + m.id} style={{ textAlign: 'center', margin: '6px 0' }}>
                        <span style={{ background: C.white, color: C.textGris, fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                          {currentLabel}
                        </span>
                      </div>
                    );
                  }

                  items.push(
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '80%',
                        padding: m.type === 'audio' || m.type === 'video' ? '6px' : '8px 11px',
                        borderRadius: isMine ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                        background: C.white,
                        border: `1px solid ${C.border}`,
                        boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                      }}>
                        {m.type === 'audio' && m.mediaUrl ? (
                          <div>
                            <audio controls src={m.mediaUrl} style={{ width: '190px', display: 'block' }} />
                            <p style={{ margin: '3px 2px 0', fontSize: '10px', color: C.textGris }}>🎤 Voice message</p>
                          </div>
                        ) : m.type === 'video' && m.mediaUrl ? (
                          <div>
                            <video controls src={m.mediaUrl} style={{ width: '200px', borderRadius: '8px', display: 'block' }} />
                            <p style={{ margin: '3px 2px 0', fontSize: '10px', color: C.textGris }}>🎥 Video message</p>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '13px', color: C.textDark, wordBreak: 'break-word' }}>{m.text}</p>
                        )}
                        <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.textGris, textAlign: 'right' }}>{formatTime(m.createdAt)}</p>
                      </div>
                    </div>
                  );

                  return items;
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

              {mediaError && (
                <div style={{ background: C.dangerBg, color: C.danger, fontSize: '11px', fontWeight: 600, padding: '6px 12px' }}>
                  ⚠ {mediaError}
                </div>
              )}

              {recordingMode === 'audio' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: C.white, borderTop: `1px solid ${C.border}` }}>
                  <button onClick={cancelRecording} disabled={uploadingMedia}
                    style={{ background: 'none', border: 'none', fontSize: '17px', cursor: 'pointer', color: C.danger, flexShrink: 0 }}>🗑️</button>
                  {isRecording ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.danger, display: 'inline-block' }} />
                        <span style={{ color: C.textDark, fontSize: '12.5px', fontWeight: 600 }}>{formatSeconds(recordSeconds)}</span>
                      </div>
                      <button onClick={stopRecording}
                        style={{ background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '50%', width: '34px', height: '34px', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>⏹</button>
                    </>
                  ) : (
                    <>
                      <audio controls src={previewUrl} style={{ flex: 1, height: '32px' }} />
                      <button onClick={sendRecordedMedia} disabled={uploadingMedia}
                        style={{ background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '50%', width: '34px', height: '34px', fontSize: '14px', cursor: 'pointer', opacity: uploadingMedia ? 0.6 : 1, flexShrink: 0 }}>
                        {uploadingMedia ? '...' : '➤'}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px', background: C.white, borderTop: `1px solid ${C.border}` }}>
                  <button onClick={() => setShowEmoji(!showEmoji)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '0 2px' }}>😊</button>
                  <button onClick={() => startRecording('audio')} title="Voice message"
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '0 2px' }}>🎤</button>
                  <button onClick={() => setRecordingMode('video')} title="Video message"
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '0 2px' }}>🎥</button>
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
              )}
            </>
          )}

          {recordingMode === 'video' && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.75)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px',
            }}>
              <div style={{ background: C.white, borderRadius: '20px', padding: '20px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
                <h3 style={{ color: C.bordeaux, fontSize: '15px', fontWeight: 800, margin: '0 0 12px' }}>
                  {isRecording ? 'Recording video...' : previewUrl ? 'Preview' : 'Record a video message'}
                </h3>

                {previewUrl ? (
                  <video controls src={previewUrl} style={{ width: '100%', borderRadius: '12px', marginBottom: '14px', maxHeight: '280px', background: '#000' }} />
                ) : (
                  <video ref={videoPreviewRef} style={{ width: '100%', borderRadius: '12px', marginBottom: '14px', maxHeight: '280px', background: '#000', transform: 'scaleX(-1)' }} />
                )}

                {isRecording && (
                  <p style={{ color: C.danger, fontWeight: 700, fontSize: '13px', margin: '0 0 14px' }}>
                    ● {formatSeconds(recordSeconds)}
                  </p>
                )}

                {mediaError && (
                  <p style={{ color: C.danger, fontSize: '11.5px', margin: '0 0 12px' }}>{mediaError}</p>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={cancelRecording} disabled={uploadingMedia}
                    style={{ flex: 1, padding: '10px', background: 'transparent', color: C.bordeaux, border: '2px solid ' + C.bordeaux, borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                    Discard
                  </button>
                  {isRecording ? (
                    <button onClick={stopRecording}
                      style={{ flex: 1, padding: '10px', background: C.danger, color: 'white', border: 'none', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                      ⏹ Stop
                    </button>
                  ) : previewUrl ? (
                    <button onClick={sendRecordedMedia} disabled={uploadingMedia}
                      style={{ flex: 1, padding: '10px', background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                      {uploadingMedia ? 'Sending...' : 'Send'}
                    </button>
                  ) : (
                    <button onClick={() => startRecording('video')}
                      style={{ flex: 1, padding: '10px', background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                      ● Start
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}