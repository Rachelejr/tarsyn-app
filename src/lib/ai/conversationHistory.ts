// UNIMUNITY AI Assistant - Phase 1: Conversation history
// Persists AI conversations in Firestore, strictly isolated per user BY
// CONSTRUCTION: every path starts with aiConversations/{uid}, so a
// Firestore rule keyed on that one path segment is enough to guarantee no
// user - regardless of role - can ever read or write another user's AI
// history. See firestore.rules for the matching rule.
//
// This exact shape is what lets a future Admin or Member mode reuse this
// module unchanged: each just gets their own aiConversations/{their uid}/
// sessions/... - nothing here is Super-Admin-specific.
//
// Context handed to the model for any one reply comes only from the
// CURRENT session's most recent messages (getRecentMessages) - never from
// a scan across a user's other sessions - so the AI is never given
// unlimited access to someone's past conversations.

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { AIContext, AIConversationMessage } from './types';

const RECENT_MESSAGES_LIMIT = 20;

function sessionsRef(uid: string) {
  return adminDb.collection('aiConversations').doc(uid).collection('sessions');
}

export async function createSession(
  ctx: Pick<AIContext, 'uid' | 'userRole' | 'module' | 'groupId'>
): Promise<string> {
  const doc = await sessionsRef(ctx.uid).add({
    uid: ctx.uid,
    role: ctx.userRole,
    module: ctx.module,
    groupId: ctx.groupId,
    // Reserved for future Admin/Member scoping - null for Super Admin's
    // platform-wide Phase 1 scope.
    orgId: null,
    workspaceId: null,
    title: null,
    messageCount: 0,
    lastMessagePreview: '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return doc.id;
}

export async function appendMessage(
  uid: string,
  sessionId: string,
  message: AIConversationMessage
): Promise<void> {
  const sessionDoc = sessionsRef(uid).doc(sessionId);
  await sessionDoc.collection('messages').add({
    role: message.role,
    content: message.content,
    lang: message.lang,
    createdAt: FieldValue.serverTimestamp(),
  });
  await sessionDoc.update({
    messageCount: FieldValue.increment(1),
    lastMessagePreview: message.content.slice(0, 140),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Only the current session's most recent messages - never a scan across a
// user's other sessions. This is the deliberate limit on how much history
// the AI is handed as context for any single reply.
export async function getRecentMessages(
  uid: string,
  sessionId: string,
  limit: number = RECENT_MESSAGES_LIMIT
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const snap = await sessionsRef(uid)
    .doc(sessionId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs
    .map(d => d.data())
    .reverse()
    .map(d => ({ role: d.role as 'user' | 'assistant', content: String(d.content || '') }));
}

export async function listSessions(uid: string, limit: number = 50) {
  const snap = await sessionsRef(uid).orderBy('updatedAt', 'desc').limit(limit).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getSessionDoc(uid: string, sessionId: string) {
  const doc = await sessionsRef(uid).doc(sessionId).get();
  const data = doc.data();
  return doc.exists && data ? { id: doc.id, ...data } : null;
}

// --- Deletion --------------------------------------------------------
// Not exposed in any UI yet - Phase 1 ships no delete button. Present now
// so a future "delete this conversation" control, or a retention-policy
// job, is additive on top of this module rather than a rebuild.
export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  const sessionDoc = sessionsRef(uid).doc(sessionId);
  const messages = await sessionDoc.collection('messages').get();
  const batch = adminDb.batch();
  messages.docs.forEach(d => batch.delete(d.ref));
  batch.delete(sessionDoc);
  await batch.commit();
}

export async function deleteAllSessions(uid: string): Promise<void> {
  const snap = await sessionsRef(uid).get();
  for (const doc of snap.docs) {
    await deleteSession(uid, doc.id);
  }
}
