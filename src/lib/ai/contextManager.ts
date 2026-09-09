// UNIMUNITY AI Assistant - Phase 1: Foundation
// Builds the one AIContext object the rest of the AI layer is allowed to
// see, from a verified Firebase ID token. This is the ONLY place that
// reads Firebase Auth/Firestore to establish who is asking - nothing
// downstream re-checks identity, so this must always run first.

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { AIContext } from './types';

export async function buildContext(idToken: string, lang: string = 'en'): Promise<AIContext> {
  const decoded = await adminAuth.verifyIdToken(idToken);
  const uid = decoded.uid;
  const email = decoded.email || null;

  let userRole: AIContext['userRole'] = 'member';
  const module: AIContext['module'] = null;

  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data() as any;
      if (data?.role === 'admin') userRole = 'admin';
    }
  } catch {
    // If we can't confirm admin status, fall back to the least-privileged
    // role rather than failing the request.
  }

  return {
    uid,
    email,
    userRole,
    module,
    groupId: null,
    lang,
  };
}
