import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export interface ChatSummary {
  id: string;
  type: 'group' | 'private';
  groupId: string | null;
  name: string;
  participantIds: string[];
  lastMessage: { text: string; senderId: string; createdAt: any } | null;
  updatedAt: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
  readBy: string[];
}

// ---------------------------------------------------------------------------
// Crée (ou réutilise) un chat de groupe, en synchronisant participantIds avec
// la liste actuelle des membres actifs du groupe.
// ---------------------------------------------------------------------------
export async function getOrCreateGroupChat(groupId: string, groupName: string): Promise<string> {
  const chatsRef = collection(db, 'chats');
  const existingQ = query(chatsRef, where('type', '==', 'group'), where('groupId', '==', groupId));
  const existing = await getDocs(existingQ);

  const membersQ = query(collection(db, 'members'), where('groupId', '==', groupId), where('status', '==', 'active'));
  const membersSnap = await getDocs(membersQ);
  const participantIds = membersSnap.docs.map((d) => d.data().userId).filter(Boolean);

  if (!existing.empty) {
    const chatDoc = existing.docs[0];
    await updateDoc(doc(db, 'chats', chatDoc.id), { participantIds, name: groupName });
    return chatDoc.id;
  }

  const newChat = await addDoc(chatsRef, {
    type: 'group',
    groupId,
    name: groupName,
    participantIds,
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newChat.id;
}

// ---------------------------------------------------------------------------
// Crée (ou réutilise) un chat privé 1-à-1 entre deux utilisateurs.
// ---------------------------------------------------------------------------
export async function getOrCreatePrivateChat(
  userId: string,
  otherUserId: string,
  otherUserName: string
): Promise<string> {
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('type', '==', 'private'), where('participantIds', 'array-contains', userId));
  const snap = await getDocs(q);

  const existing = snap.docs.find((d) => {
    const ids: string[] = d.data().participantIds || [];
    return ids.includes(otherUserId) && ids.length === 2;
  });

  if (existing) return existing.id;

  const newChat = await addDoc(chatsRef, {
    type: 'private',
    groupId: null,
    name: otherUserName,
    participantIds: [userId, otherUserId],
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newChat.id;
}

// ---------------------------------------------------------------------------
// Écoute en temps réel la liste des chats d'un utilisateur, triés par
// dernière activité.
// ---------------------------------------------------------------------------
export function listenToUserChats(
  userId: string,
  callback: (chats: ChatSummary[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chats'),
    where('participantIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const chats: ChatSummary[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    callback(chats);
  });
}

// ---------------------------------------------------------------------------
// Écoute en temps réel les messages d'un chat, triés par date croissante.
// ---------------------------------------------------------------------------
export function listenToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const messages: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    callback(messages);
  });
}

// ---------------------------------------------------------------------------
// Envoie un message dans un chat et met à jour lastMessage + updatedAt.
// ---------------------------------------------------------------------------
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId,
    senderName,
    text: trimmed,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });

  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: { text: trimmed, senderId, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Marque tous les messages d'un chat comme lus par cet utilisateur.
// Ne doit jamais bloquer l'UI : erreurs uniquement loggées.
// ---------------------------------------------------------------------------
export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
  try {
    const messagesSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
    const updates = messagesSnap.docs
      .filter((d) => !(d.data().readBy || []).includes(userId))
      .map((d) =>
        updateDoc(doc(db, 'chats', chatId, 'messages', d.id), {
          readBy: [...(d.data().readBy || []), userId],
        })
      );
    await Promise.all(updates);
  } catch (err) {
    console.error('[chat] Failed to mark chat as read:', err);
  }
}