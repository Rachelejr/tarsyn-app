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
  deleteDoc,
  writeBatch,
  arrayUnion,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

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
  type?: 'text' | 'audio' | 'video';
  mediaUrl?: string;
  mediaDuration?: number;
  createdAt: any;
  readBy: string[];
  deletedFor?: string[];
  deletedForEveryone?: boolean;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

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
    type: 'text',
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });

  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: { text: trimmed, senderId, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
}

export async function sendMediaMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  blob: Blob,
  type: 'audio' | 'video',
  durationSeconds: number
): Promise<void> {
  const path = 'chats/' + chatId + '/media/' + Date.now() + '_' + senderId + '.webm';
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);

  const label = (type === 'audio' ? 'Voice message' : 'Video message') + ' - ' + formatDuration(durationSeconds);

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId,
    senderName,
    text: label,
    type,
    mediaUrl: url,
    mediaDuration: durationSeconds,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });

  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: { text: label, senderId, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
}

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

export async function clearChat(chatId: string): Promise<void> {
  const messagesSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
  const docs = messagesSnap.docs;

  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => {
      batch.delete(doc(db, 'chats', chatId, 'messages', d.id));
    });
    await batch.commit();
  }

  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: null,
    updatedAt: serverTimestamp(),
  });
}

// NEW: delete a message only for the current user (it stays visible to others).
// Only touches the 'deletedFor' array field, which matches the existing
// Firestore rule for the messages subcollection.
export async function deleteMessageForMe(chatId: string, messageId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    deletedFor: arrayUnion(userId),
  });
}

// NEW: delete a message for everyone (only the original sender is allowed to
// do this by the Firestore rule). Clears the text/media content but keeps
// the message document as a placeholder ("This message was deleted").
export async function deleteMessageForEveryone(chatId: string, messageId: string): Promise<void> {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    deletedForEveryone: true,
    text: '',
    mediaUrl: '',
  });
}