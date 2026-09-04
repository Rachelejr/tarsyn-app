'use client';
import { useEffect, useRef, useState } from 'react';
import { auth, memberAuth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { listenToUserChats, listenToMessages, sendMessage, sendMediaMessage, markChatAsRead, getOrCreatePrivateChat, clearChat, deleteMessageForMe, deleteMessageForEveryone, ChatSummary, ChatMessage } from '@/lib/chat';
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

// --- Modern line-style icons (replace old emoji icons) ---
const MicIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const VideoIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const SendIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
  </svg>
);
const TrashIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
  </svg>
);
const CheckIcon = ({ size = 13, double = false, color = '#9CA3AF' }: { size?: number; double?: boolean; color?: string }) => (
  <svg width={double ? size + 4 : size} height={size} viewBox="0 0 20 12" fill="none">
    <path d="M1 6l4 4L13 1" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    {double && <path d="M6 6l4 4L18 1" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);

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

// Small deterministic gradient per name, so each avatar has a distinct but stable color.
// All variations stay within the UNIMUNITY brand palette (bordeaux / or / crème).
const AVATAR_GRADIENTS = [
  ['#6B2D4E', '#9C4A6E'],
  ['#4A1F38', '#6B2D4E'],
  ['#8A5A2D', '#E9C77B'],
  ['#7D2E5E', '#B4548E'],
  ['#9C6B2D', '#D4A05A'],
  ['#5E2D4A', '#8A4A6E'],
];
function avatarGradient(name: string) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [memberUser, setMemberUser] = useState<any>(null);
  const user = adminUser || memberUser;
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

  // --- NEW: message action menu (delete for me / everyone) ---
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [openMsgMenu, setOpenMsgMenu] = useState<string | null>(null);

  // --- NEW: reply, forward, profile ---
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<ChatMessage | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAdminUser(u));
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = onAuthStateChanged(memberAuth, (u) => setMemberUser(u));
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
    const membersQ = query(collection(db, 'members'), where('organizerId', '==', user.uid));
    const membersSnap = await getDocs(membersQ);
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
    try {
      const chatId = await getOrCreatePrivateChat(user.uid, member.userId, member.name);
      setActiveChatId(chatId);
      setActiveChatName(member.name);
      setShowSearch(false);
      setSearchTerm('');
      setSearchResults([]);
    } catch (err: any) {
      alert('CHAT DEBUG: ' + (err?.code || 'unknown') + ' - ' + (err?.message || String(err)));
    }
  };
  const handleSend = async () => {
    if (!text.trim() || !user || !activeChatId) return;
    const senderName = user.displayName || user.email?.split('@')[0] || 'Member';
    const toSend = text.trim();
    const reply = replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName } : null;
    setText('');
    setShowEmoji(false);
    setReplyingTo(null);
    await sendMessage(activeChatId, user.uid, senderName, toSend, { replyTo: reply });
  };
  const handleForwardTo = async (targetChatId: string) => {
    if (!forwardingMsg || !user) return;
    const senderName = user.displayName || user.email?.split('@')[0] || 'Member';
    await sendMessage(targetChatId, user.uid, senderName, forwardingMsg.text, { forwarded: true });
    setForwardingMsg(null);
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

  // --- NEW: delete handlers ---
  const handleDeleteForMe = async (messageId: string) => {
    if (!activeChatId || !user) return;
    setOpenMsgMenu(null);
    try {
      await deleteMessageForMe(activeChatId, messageId, user.uid);
    } catch (e) { console.error(e); }
  };
  const handleDeleteForEveryone = async (messageId: string) => {
    if (!activeChatId) return;
    if (!confirm('Delete this message for everyone?')) return;
    setOpenMsgMenu(null);
    try {
      await deleteMessageForEveryone(activeChatId, messageId);
    } catch (e) { console.error(e); }
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

  const activeChatSummary = chats.find((c) => c.id === activeChatId);
  const otherParticipantId = activeChatSummary?.type === 'private'
    ? activeChatSummary.participantIds.find((id) => id !== user.uid)
    : null;

  const visibleMessages = messages.filter((m) => !(m.deletedFor || []).includes(user.uid));

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: 'Inter, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .cw-msg-action-btn{transition:opacity .12s ease, background .12s ease;}
        .cw-msg-action-btn:hover{background:rgba(0,0,0,0.06) !important;}
        .cw-menu-item:hover{background:${C.bg} !important;}
        .cw-launcher-btn{transition:transform .18s ease, box-shadow .18s ease;}
        .cw-launcher-btn:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 8px 22px rgba(74,31,56,0.38) !important;}
      `}} />
      {!open && (
        <button onClick={() => setOpen(true)} className="cw-launcher-btn"
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: `linear-gradient(145deg, ${C.bordeaux}, ${C.bordeauxDark})`,
            border: `2px solid ${C.dore}`, cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(74,31,56,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.dore} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}
      {open && (
        <div style={{ width: '340px', height: '480px', background: C.white, borderRadius: '16px', boxShadow: '0 12px 36px rgba(74,31,56,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', border: `1px solid ${C.border}` }}>
          <div style={{ background: `linear-gradient(120deg, ${C.bordeaux}, ${C.bordeauxDark})`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.white, borderBottom: `2px solid ${C.dore}` }}>
            {activeChatId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => { setActiveChatId(null); setMessages([]); setShowMenu(false); }}
                  style={{ background: 'none', border: 'none', color: C.bordeaux, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M15 18l-6-6 6-6' /></svg></button>
                <div onClick={() => setShowProfileModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${avatarGradient(activeChatName)[0]}, ${avatarGradient(activeChatName)[1]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)', border: `1.5px solid ${C.dore}`,
                }}>
                  {activeChatName?.[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ fontWeight: 700, fontSize: '14px', color: C.bordeaux }}>{activeChatName}</span>
                </div>
              </div>
            ) : (
              <span style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: C.bordeaux, letterSpacing: '0.3px' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.bordeaux} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Messages
              </span>
            )}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
              {!activeChatId && (
                <button onClick={() => setShowSearch(!showSearch)}
                  style={{ background: 'none', border: 'none', color: C.bordeaux, fontSize: '18px', fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>+</button>
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
                chats.map((chat) => {
                  const grad = avatarGradient(chat.name || '?');
                  return (
                    <div key={chat.id} onClick={() => { setActiveChatId(chat.id); setActiveChatName(chat.name); }}
                      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: `1px solid ${C.bg}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: chat.type === 'group' ? C.bg : `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: chat.type === 'group' ? C.bordeaux : 'white', fontWeight: 700, fontSize: '14px', flexShrink: 0,
                        boxShadow: chat.type === 'group' ? 'none' : '0 1px 3px rgba(0,0,0,0.2)',
                        border: chat.type === 'group' ? `1px solid ${C.border}` : 'none',
                      }}>
                        {chat.type === 'group' ? '👥' : chat.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '13px', color: C.textDark }}>{chat.name}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: C.textGris, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chat.lastMessage?.text || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          {activeChatId && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', background: C.bg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                onClick={() => setOpenMsgMenu(null)}>
                {visibleMessages.length === 0 && (
                  <p style={{ textAlign: 'center', color: C.textGris, fontSize: '12px', marginTop: '30px' }}>Say hello 👋</p>
                )}
                {visibleMessages.flatMap((m, idx) => {
                  const isMine = m.senderId === user.uid;
                  const isDeleted = !!m.deletedForEveryone;
                  const currentLabel = formatDateLabel(m.createdAt);
                  const prevLabel = idx > 0 ? formatDateLabel(visibleMessages[idx - 1].createdAt) : null;
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
                  const isRead = !isDeleted && isMine && otherParticipantId ? (m.readBy || []).includes(otherParticipantId) : false;
                  items.push(
                    <div key={m.id}
                      style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', position: 'relative' }}
                      onMouseEnter={() => setHoveredMsgId(m.id)}
                      onMouseLeave={() => setHoveredMsgId((v) => (v === m.id ? null : v))}
                      onContextMenu={(e) => { if (!isDeleted) { e.preventDefault(); e.stopPropagation(); setOpenMsgMenu(m.id); } }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', maxWidth: '84%' }}>
                        {isMine && !isDeleted && (hoveredMsgId === m.id || openMsgMenu === m.id) && (
                          <button className="cw-msg-action-btn" onClick={(e) => { e.stopPropagation(); setOpenMsgMenu(openMsgMenu === m.id ? null : m.id); }}
                            style={{ background: 'none', border: 'none', color: C.textGris, fontSize: '14px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', order: -1 }}>
                            ⋮
                          </button>
                        )}
                        <div style={{
                          padding: isDeleted ? '8px 11px' : (m.type === 'audio' || m.type === 'video') ? '6px' : '8px 11px',
                          borderRadius: isMine ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                          background: C.white,
                          border: `1px solid ${C.border}`,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        }}>
                          {isDeleted ? (
                            <p style={{ margin: 0, fontSize: '12.5px', color: C.textGris, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <TrashIcon size={12} /> This message was deleted
                            </p>
                          ) : (
                            <>
                              {m.forwarded && (
                                <p style={{ margin: '0 0 3px', fontSize: '10px', color: C.textGris, fontStyle: 'italic' }}>↪ Forwarded</p>
                              )}
                              {m.replyTo && (
                                <div style={{ borderLeft: `3px solid ${C.dore}`, background: C.bg, borderRadius: '4px', padding: '4px 7px', marginBottom: '4px' }}>
                                  <p style={{ margin: 0, fontSize: '10.5px', fontWeight: 700, color: C.bordeaux }}>{m.replyTo.senderName}</p>
                                  <p style={{ margin: 0, fontSize: '11px', color: C.textGris, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '190px' }}>{m.replyTo.text}</p>
                                </div>
                              )}
                            </>
                          )}
                          {isDeleted ? null : m.type === 'audio' && m.mediaUrl ? (
                            <div>
                              <audio controls src={m.mediaUrl} style={{ width: '190px', display: 'block' }} />
                              <p style={{ margin: '3px 2px 0', fontSize: '10px', color: C.textGris, display: 'flex', alignItems: 'center', gap: '4px' }}><MicIcon size={11} /> Voice message</p>
                            </div>
                          ) : m.type === 'video' && m.mediaUrl ? (
                            <div>
                              <video controls src={m.mediaUrl} style={{ width: '200px', borderRadius: '8px', display: 'block' }} />
                              <p style={{ margin: '3px 2px 0', fontSize: '10px', color: C.textGris, display: 'flex', alignItems: 'center', gap: '4px' }}><VideoIcon size={11} /> Video message</p>
                            </div>
                          ) : (
                            <p style={{ margin: 0, fontSize: '13px', color: C.textDark, wordBreak: 'break-word' }}>{m.text}</p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '3px' }}>
                            <span style={{ fontSize: '10px', color: C.textGris }}>{formatTime(m.createdAt)}</span>
                            {isMine && !isDeleted && <CheckIcon size={12} double={isRead} color={isRead ? '#4FA3E3' : '#B8B0AA'} />}
                          </div>
                        </div>
                        {!isMine && !isDeleted && (hoveredMsgId === m.id || openMsgMenu === m.id) && (
                          <button className="cw-msg-action-btn" onClick={(e) => { e.stopPropagation(); setOpenMsgMenu(openMsgMenu === m.id ? null : m.id); }}
                            style={{ background: 'none', border: 'none', color: C.textGris, fontSize: '14px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}>
                            ⋮
                          </button>
                        )}
                      </div>
                      {openMsgMenu === m.id && (
                        <div onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute', top: '100%', marginTop: '2px',
                            [isMine ? 'right' : 'left']: 0,
                            background: C.white, borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                            border: `1px solid ${C.border}`, minWidth: '160px', zIndex: 40, overflow: 'hidden',
                          } as React.CSSProperties}>
                          <button className="cw-menu-item" onClick={() => { setReplyingTo(m); setOpenMsgMenu(null); }}
                            style={{ width: '100%', padding: '9px 13px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: C.textDark, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            ↩ Reply
                          </button>
                          <button className="cw-menu-item" onClick={() => { setForwardingMsg(m); setOpenMsgMenu(null); }}
                            style={{ width: '100%', padding: '9px 13px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: C.textDark, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            ↪ Forward
                          </button>
                          {isMine && (
                            <button className="cw-menu-item" onClick={() => handleDeleteForEveryone(m.id)}
                              style={{ width: '100%', padding: '9px 13px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <TrashIcon size={12} /> Delete for everyone
                            </button>
                          )}
                          <button className="cw-menu-item" onClick={() => handleDeleteForMe(m.id)}
                            style={{ width: '100%', padding: '9px 13px', background: 'none', border: 'none', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: C.textDark, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <TrashIcon size={12} /> Delete for me
                          </button>
                        </div>
                      )}
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, flexShrink: 0, display: 'flex' }}><TrashIcon size={16} /></button>
                  {isRecording ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.danger, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ color: C.textDark, fontSize: '12.5px', fontWeight: 600 }}>{formatSeconds(recordSeconds)}</span>
                      </div>
                      <button onClick={stopRecording}
                        style={{ background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '50%', width: '34px', height: '34px', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>⏹</button>
                    </>
                  ) : (
                    <>
                      <audio controls src={previewUrl} style={{ flex: 1, minWidth: 0, height: '32px' }} />
                      <button onClick={sendRecordedMedia} disabled={uploadingMedia}
                        style={{ background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', opacity: uploadingMedia ? 0.6 : 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {uploadingMedia ? '...' : <SendIcon size={14} />}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {replyingTo && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '7px 12px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ borderLeft: `3px solid ${C.bordeaux}`, paddingLeft: '8px', minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '10.5px', fontWeight: 700, color: C.bordeaux }}>Replying to {replyingTo.senderName}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: C.textGris, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyingTo.text}</p>
                      </div>
                      <button onClick={() => setReplyingTo(null)}
                        style={{ background: 'none', border: 'none', color: C.textGris, fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                    </div>
                  )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px', background: C.white, borderTop: `1px solid ${C.border}` }}>
                  <button onClick={() => setShowEmoji(!showEmoji)}
                    style={{ background: 'none', border: 'none', fontSize: '19px', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>😊</button>
                  <button onClick={() => startRecording('audio')} title="Voice message"
                    style={{ background: 'none', border: 'none', color: C.bordeaux, cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex' }}>
                    <MicIcon size={18} />
                  </button>
                  <button onClick={() => setRecordingMode('video')} title="Video message"
                    style={{ background: 'none', border: 'none', color: C.bordeaux, cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex' }}>
                    <VideoIcon size={18} />
                  </button>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message"
                    style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: '20px', border: `1px solid ${C.border}`, fontSize: '13px', outline: 'none', background: C.bg }}
                  />
                  <button onClick={handleSend}
                    style={{ background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SendIcon size={15} />
                  </button>
                </div>
                </>
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
          {forwardingMsg && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '20px' }}
              onClick={() => setForwardingMsg(null)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: '14px', padding: '16px', maxWidth: '320px', width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ color: C.bordeaux, fontSize: '15px', fontWeight: 800, margin: '0 0 4px' }}>Forward message</h3>
                <p style={{ color: C.textGris, fontSize: '11.5px', margin: '0 0 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{forwardingMsg.text}</p>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {chats.filter((c) => c.id !== activeChatId).length === 0 ? (
                    <p style={{ color: C.textGris, fontSize: '12.5px', textAlign: 'center', marginTop: '20px' }}>No other conversations.</p>
                  ) : (
                    chats.filter((c) => c.id !== activeChatId).map((c) => {
                      const grad = avatarGradient(c.name || '?');
                      return (
                        <div key={c.id} onClick={() => handleForwardTo(c.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 8px', borderRadius: '8px', cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: 'white', flexShrink: 0 }}>
                            {c.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span style={{ fontSize: '13px', color: C.textDark, fontWeight: 600 }}>{c.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <button onClick={() => setForwardingMsg(null)}
                  style={{ marginTop: '10px', padding: '9px', background: 'transparent', color: C.bordeaux, border: `1.5px solid ${C.bordeaux}`, borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {showProfileModal && activeChatId && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '20px' }}
              onClick={() => setShowProfileModal(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: '14px', padding: '24px', maxWidth: '300px', width: '100%', textAlign: 'center' }}>
                <div style={{
                  width: '76px', height: '76px', borderRadius: '50%', margin: '0 auto 14px',
                  background: `linear-gradient(135deg, ${avatarGradient(activeChatName)[0]}, ${avatarGradient(activeChatName)[1]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '28px', color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}>
                  {activeChatName?.[0]?.toUpperCase() || '?'}
                </div>
                <h3 style={{ color: C.bordeaux, fontSize: '17px', fontWeight: 800, margin: '0 0 4px' }}>{activeChatName}</h3>
                <p style={{ color: C.textGris, fontSize: '12px', margin: '0 0 18px' }}>UNIMUNITY member</p>
                <button onClick={() => setShowProfileModal(false)}
                  style={{ width: '100%', padding: '10px', background: C.bordeaux, color: C.dore, border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}