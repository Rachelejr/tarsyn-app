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
  Firestore,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { db, storage } from './firebase';

// Every function below defaults to the admin/organizer Firestore instance
// (`db`) for backward compatibility, but accepts an explicit instance so
// the member portal - which runs on a SEPARATE Firebase App ("memberApp",
// see lib/firebase.ts) to avoid clobbering an admin's session in the same
// browser - can pass its own `memberDb` (and `memberStorage`). Without
// this, a signed-in member's Firestore calls went through the admin app
// with no matching auth token, so Firestore security rules silently
// denied every read (no onSnapshot error was surfaced), and the member's
// chat list stayed stuck on "No conversations yet." forever.

export interface ChatSummary {
  id: string;
  type: 'group' | 'private';
  groupId: string | null;
  memberId?: string | null;
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
  type?: 'text' | 'audio' | 'video' | 'file';
  mediaUrl?: string;
  mediaDuration?: number;
  fileName?: string;
  fileSize?: number;
  createdAt: any;
  readBy: string[];
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  replyTo?: { id: string; text: string; senderName: string } | null;
  forwarded?: boolean;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

export async function getOrCreateGroupChat(groupId: string, groupName: string, firestoreDb: Firestore = db): Promise<string> {
  const chatsRef = collection(firestoreDb, 'chats');
  const existingQ = query(chatsRef, where('type', '==', 'group'), where('groupId', '==', groupId));
  const existing = await getDocs(existingQ);

  const membersQ = query(collection(firestoreDb, 'members'), where('groupId', '==', groupId), where('status', '==', 'active'));
  const membersSnap = await getDocs(membersQ);
  const participantIds = membersSnap.docs.map((d) => d.data().userId).filter(Boolean);

  if (!existing.empty) {
    const chatDoc = existing.docs[0];
    await updateDoc(doc(firestoreDb, 'chats', chatDoc.id), { participantIds, name: groupName });
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

// `memberId` (the member's Firestore *document* ID, not their Auth uid) is
// the stable identity for a private chat. A member's `userId` (their
// Firebase Auth uid) can change later - e.g. they redo account setup and
// /api/join-confirm stamps a new uid onto their member record - and if a
// chat's `participantIds` still has the OLD uid, Firestore's security
// rules silently deny that member's read/write forever and their chat
// list stays stuck on "No conversations yet.", even though the admin can
// still see the conversation fine. Matching by `memberId` lets us notice
// that drift and self-heal the chat's participantIds automatically.
export async function getOrCreatePrivateChat(
  userId: string,
  otherUserId: string,
  otherUserName: string,
  memberId: string | null = null,
  firestoreDb: Firestore = db
): Promise<string> {
  const chatsRef = collection(firestoreDb, 'chats');
  const q = query(chatsRef, where('type', '==', 'private'), where('participantIds', 'array-contains', userId));
  const snap = await getDocs(q);

  if (memberId) {
    const byMemberId = snap.docs.find((d) => d.data().memberId === memberId);
    if (byMemberId) {
      const ids: string[] = byMemberId.data().participantIds || [];
      if (!ids.includes(otherUserId) || ids.length !== 2) {
        // The member's uid changed since this chat was created - heal it.
        await updateDoc(doc(firestoreDb, 'chats', byMemberId.id), {
          participantIds: [userId, otherUserId],
          name: otherUserName,
        });
      }
      return byMemberId.id;
    }
  }

  const existing = snap.docs.find((d) => {
    const ids: string[] = d.data().participantIds || [];
    return ids.includes(otherUserId) && ids.length === 2;
  });

  if (existing) {
    // Legacy chat created before memberId tracking existed - stamp it on
    // now so future uid changes for this member self-heal too.
    if (memberId && !existing.data().memberId) {
      await updateDoc(doc(firestoreDb, 'chats', existing.id), { memberId });
    }
    return existing.id;
  }

  const newChat = await addDoc(chatsRef, {
    type: 'private',
    groupId: null,
    memberId: memberId || null,
    name: otherUserName,
    participantIds: [userId, otherUserId],
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newChat.id;
}

// Re-checks a private chat's participantIds against its member record's
// CURRENT uid right before a message is sent, and repairs it if it drifted
// (see getOrCreatePrivateChat above for why this can happen). This covers
// the case where the organizer opens an already-broken chat straight from
// their chat list (instead of re-searching for the member), which
// otherwise never goes through the healing check above. Non-blocking: if
// anything here fails, the message still gets sent normally.
async function healPrivateChatIfNeeded(chatId: string, firestoreDb: Firestore): Promise<void> {
  try {
    const chatRef = doc(firestoreDb, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) return;
    const data = chatSnap.data() as any;
    if (data.type !== 'private' || !data.memberId) return;

    const memberSnap = await getDoc(doc(firestoreDb, 'members', data.memberId));
    if (!memberSnap.exists()) return;
    const memberData = memberSnap.data() as any;
    const currentUserId = memberData?.userId;
    const organizerId = memberData?.organizerId;
    if (!currentUserId || !organizerId) return;

    const ids: string[] = data.participantIds || [];
    if (!ids.includes(currentUserId) || !ids.includes(organizerId)) {
      await updateDoc(chatRef, { participantIds: [organizerId, currentUserId] });
    }
  } catch (err) {
    console.error('[chat] healPrivateChatIfNeeded failed (non-blocking):', err);
  }
}

export function listenToUserChats(
  userId: string,
  callback: (chats: ChatSummary[]) => void,
  firestoreDb: Firestore = db
): Unsubscribe {
  const q = query(
    collection(firestoreDb, 'chats'),
    where('participantIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const chats: ChatSummary[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    callback(chats);
  }, (err) => {
    console.error('[chat] listenToUserChats failed:', err);
  });
}

export function listenToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  firestoreDb: Firestore = db
): Unsubscribe {
  const q = query(collection(firestoreDb, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const messages: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    callback(messages);
  }, (err) => {
    console.error('[chat] listenToMessages failed:', err);
  });
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  options?: { replyTo?: { id: string; text: string; senderName: string } | null; forwarded?: boolean },
  firestoreDb: Firestore = db
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await healPrivateChatIfNeeded(chatId, firestoreDb);

  const payload: any = {
    senderId,
    senderName,
    text: trimmed,
    type: 'text',
    createdAt: serverTimestamp(),
    readBy: [senderId],
  };
  if (options?.replyTo) payload.replyTo = options.replyTo;
  if (options?.forwarded) payload.forwarded = true;

  await addDoc(collection(firestoreDb, 'chats', chatId, 'messages'), payload);

  await updateDoc(doc(firestoreDb, 'chats', chatId), {
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
  durationSeconds: number,
  firestoreDb: Firestore = db,
  storageInstance: FirebaseStorage = storage
): Promise<void> {
  await healPrivateChatIfNeeded(chatId, firestoreDb);

  const path = 'chats/' + chatId + '/media/' + Date.now() + '_' + senderId + '.webm';
  const storageRef = ref(storageInstance, path);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);

  const label = (type === 'audio' ? 'Voice message' : 'Video message') + ' - ' + formatDuration(durationSeconds);

  await addDoc(collection(firestoreDb, 'chats', chatId, 'messages'), {
    senderId,
    senderName,
    text: label,
    type,
    mediaUrl: url,
    mediaDuration: durationSeconds,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });

  await updateDoc(doc(firestoreDb, 'chats', chatId), {
    lastMessage: { text: label, senderId, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
}

// NEW: attach an arbitrary file (PDF, doc, image, etc. - anything the
// browser's file picker allows) to a chat, mirroring sendMediaMessage's
// upload-then-message pattern but for generic files instead of recorded
// audio/video. Storage/Firestore rules already allow this (storage.rules
// permits any authenticated write; the messages rule only checks
// senderId), so no rules changes were needed.
export async function sendFileMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  file: File,
  firestoreDb: Firestore = db,
  storageInstance: FirebaseStorage = storage
): Promise<void> {
  await healPrivateChatIfNeeded(chatId, firestoreDb);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = 'chats/' + chatId + '/files/' + Date.now() + '_' + senderId + '_' + safeName;
  const storageRef = ref(storageInstance, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await addDoc(collection(firestoreDb, 'chats', chatId, 'messages'), {
    senderId,
    senderName,
    text: file.name,
    type: 'file',
    mediaUrl: url,
    fileName: file.name,
    fileSize: file.size,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });

  await updateDoc(doc(firestoreDb, 'chats', chatId), {
    lastMessage: { text: '📎 ' + file.name, senderId, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
}

export async function markChatAsRead(chatId: string, userId: string, firestoreDb: Firestore = db): Promise<void> {
  try {
    const messagesSnap = await getDocs(collection(firestoreDb, 'chats', chatId, 'messages'));
    const updates = messagesSnap.docs
      .filter((d) => !(d.data().readBy || []).includes(userId))
      .map((d) =>
        updateDoc(doc(firestoreDb, 'chats', chatId, 'messages', d.id), {
          readBy: [...(d.data().readBy || []), userId],
        })
      );
    await Promise.all(updates);
  } catch (err) {
    console.error('[chat] Failed to mark chat as read:', err);
  }
}

export async function clearChat(chatId: string, firestoreDb: Firestore = db): Promise<void> {
  const messagesSnap = await getDocs(collection(firestoreDb, 'chats', chatId, 'messages'));
  const docs = messagesSnap.docs;

  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(firestoreDb);
    docs.slice(i, i + 450).forEach((d) => {
      batch.delete(doc(firestoreDb, 'chats', chatId, 'messages', d.id));
    });
    await batch.commit();
  }

  await updateDoc(doc(firestoreDb, 'chats', chatId), {
    lastMessage: null,
    updatedAt: serverTimestamp(),
  });
}

// NEW: delete a message only for the current user (it stays visible to others).
// Only touches the 'deletedFor' array field, which matches the existing
// Firestore rule for the messages subcollection.
export async function deleteMessageForMe(chatId: string, messageId: string, userId: string, firestoreDb: Firestore = db): Promise<void> {
  await updateDoc(doc(firestoreDb, 'chats', chatId, 'messages', messageId), {
    deletedFor: arrayUnion(userId),
  });
}

// NEW: delete a message for everyone (only the original sender is allowed to
// do this by the Firestore rule). Clears the text/media content but keeps
// the message document as a placeholder ("This message was deleted").
export async function deleteMessageForEveryone(chatId: string, messageId: string, firestoreDb: Firestore = db): Promise<void> {
  await updateDoc(doc(firestoreDb, 'chats', chatId, 'messages', messageId), {
    deletedForEveryone: true,
    text: '',
    mediaUrl: '',
  });
}