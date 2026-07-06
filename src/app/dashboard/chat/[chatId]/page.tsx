'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { listenToMessages, sendMessage, sendMediaMessage, markChatAsRead, clearChat, ChatMessage } from '@/lib/chat';

const C = {
  creme: '#FBEEDD',
  white: '#FFFFFF',
  gold: '#E9C77B',
  bordeaux: '#6B2D4E',
  texteGris: '#6B2D4E',
  texteFonce: '#4A1F38',
  border: '#EAD9BE',
  danger: '#C62828',
  dangerBg: '#FFEBEE',
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
  { label: 'Flags', icon: '🏳️', emojis: ['🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🇺🇸','🇨🇦','🇬🇧','🇫🇷','🇩🇪','🇪🇸','🇮🇹','🇵🇹','🇧🇷','🇲🇽','🇭🇹','🇯🇲','🇩🇴','🇹🇹','🇧🇸','🇧🇧','🇬🇾','🇸🇷','🇳🇬','🇬🇭','🇸🇳','🇨🇮','🇨🇲','🇨🇩','🇰🇪','🇪🇹','🇿🇦','🇪🇬','🇲🇦','🇩🇿','🇹🇳','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇦🇺','🇳🇿','🇷🇺','🇺🇦','🇵🇱','🇳🇱','🇧🇪','🇨🇭','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇬🇷','🇹🇷','🇸🇦','🇦🇪','🇮🇱','🇱🇧','🇺🇳'] },
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const formatSeconds = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m + ':' + String(s).padStart(2, '0');
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
    if (!previewBlob || !recordingMode || !user) return;
    setUploadingMedia(true);
    setMediaError('');
    const senderName = user.displayName || user.email?.split('@')[0] || 'User';
    try {
      await sendMediaMessage(chatId, user.uid, senderName, previewBlob, recordingMode, recordSeconds);
      setUploadingMedia(false);
      cancelRecording();
    } catch (e) {
      console.error(e);
      setMediaError('Failed to send. Please check your connection and try again.');
      setUploadingMedia(false);
    }
  }

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
                  padding: msg.type === 'audio' || msg.type === 'video' ? '8px' : '10px 14px',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '14px',
                  border: `1px solid ${C.border}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  wordBreak: 'break-word',
                }}>
                  {msg.type === 'audio' && msg.mediaUrl ? (
                    <div>
                      <audio controls src={msg.mediaUrl} style={{ width: '220px', display: 'block' }} />
                      <p style={{ margin: '4px 2px 0', fontSize: '11px', color: C.texteGris }}>🎤 Voice message</p>
                    </div>
                  ) : msg.type === 'video' && msg.mediaUrl ? (
                    <div>
                      <video controls src={msg.mediaUrl} style={{ width: '240px', borderRadius: '10px', display: 'block' }} />
                      <p style={{ margin: '4px 2px 0', fontSize: '11px', color: C.texteGris }}>🎥 Video message</p>
                    </div>
                  ) : (
                    msg.text
                  )}
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

      {mediaError && (
        <div style={{
          background: C.dangerBg, color: C.danger, fontSize: '12.5px', fontWeight: 600,
          padding: '8px 20px', maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box',
        }}>
          ⚠ {mediaError}
        </div>
      )}

      {recordingMode === 'audio' ? (
        <div style={{
          background: C.white, padding: '12px 20px', display: 'flex', gap: '12px', alignItems: 'center',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.04)', position: 'sticky', bottom: 0,
          maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box', borderTop: `1px solid ${C.border}`,
        }}>
          <button onClick={cancelRecording} disabled={uploadingMedia}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: C.danger, flexShrink: 0 }}>
            🗑️
          </button>

          {isRecording ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: C.danger, display: 'inline-block' }} />
                <span style={{ color: C.texteFonce, fontSize: '14px', fontWeight: 600 }}>Recording... {formatSeconds(recordSeconds)}</span>
              </div>
              <button onClick={stopRecording}
                style={{ background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}>
                ⏹
              </button>
            </>
          ) : (
            <>
              <audio controls src={previewUrl} style={{ flex: 1, height: '36px' }} />
              <button onClick={sendRecordedMedia} disabled={uploadingMedia}
                style={{ background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '18px', cursor: 'pointer', opacity: uploadingMedia ? 0.6 : 1, flexShrink: 0 }}>
                {uploadingMedia ? '...' : '→'}
              </button>
            </>
          )}
        </div>
      ) : recordingMode === 'video' ? (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.75)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
        }}>
          <div style={{ background: C.white, borderRadius: '20px', padding: '20px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 12px' }}>
              {isRecording ? 'Recording video...' : previewUrl ? 'Preview' : 'Record a video message'}
            </h3>

            {previewUrl ? (
              <video controls src={previewUrl} style={{ width: '100%', borderRadius: '12px', marginBottom: '14px', maxHeight: '320px', background: '#000' }} />
            ) : (
              <video ref={videoPreviewRef} style={{ width: '100%', borderRadius: '12px', marginBottom: '14px', maxHeight: '320px', background: '#000', transform: 'scaleX(-1)' }} />
            )}

            {isRecording && (
              <p style={{ color: C.danger, fontWeight: 700, fontSize: '14px', margin: '0 0 14px' }}>
                ● {formatSeconds(recordSeconds)}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cancelRecording} disabled={uploadingMedia}
                style={{ flex: 1, padding: '11px', background: 'transparent', color: C.bordeaux, border: '2px solid ' + C.bordeaux, borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Discard
              </button>
              {isRecording ? (
                <button onClick={stopRecording}
                  style={{ flex: 1, padding: '11px', background: C.danger, color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  ⏹ Stop
                </button>
              ) : previewUrl ? (
                <button onClick={sendRecordedMedia} disabled={uploadingMedia}
                  style={{ flex: 1, padding: '11px', background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {uploadingMedia ? 'Sending...' : 'Send'}
                </button>
              ) : (
                <button onClick={() => startRecording('video')}
                  style={{ flex: 1, padding: '11px', background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  ● Start
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: C.white, padding: '12px 20px', display: 'flex', gap: '8px', alignItems: 'center',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.04)', position: 'sticky', bottom: 0,
          maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box', borderTop: `1px solid ${C.border}`,
        }}>
          <button onClick={() => setShowEmoji(!showEmoji)}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
            😊
          </button>
          <button onClick={() => startRecording('audio')} title="Record a voice message"
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
            🎤
          </button>
          <button onClick={() => setRecordingMode('video')} title="Record a video message"
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
            🎥
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
      )}
    </div>
  );
}