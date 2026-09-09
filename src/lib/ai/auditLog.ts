// UNIMUNITY AI Assistant - Phase 1: Foundation
// Every AI-related event (even a foundation health check) is logged here,
// separately from the app's existing `audit_logs` collection, so the AI
// layer's own activity can be reviewed independently, per the IA Central
// spec's audit requirement.

import { adminDb } from '@/lib/firebase-admin';
import { AIContext } from './types';

export async function logAIEvent(
  ctx: Pick<AIContext, 'uid' | 'email'>,
  type: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  try {
    await adminDb.collection('ai_audit_logs').add({
      uid: ctx.uid,
      email: ctx.email,
      type,
      detail,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    // Never let audit logging break the AI response itself.
    console.error('ai_audit_logs write failed:', e);
  }
}
