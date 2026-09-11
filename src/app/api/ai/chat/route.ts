// UNIMUNITY AI Assistant - production route
// Real production endpoint behind the support widget's AI tab. Unlike
// /api/ai/ping (kept as a purely internal diagnostic tool, never linked
// from the UI), this route persists conversation history and is what the
// actual assistant panel talks to.
//
// Gate: any signed-in role (super_admin, admin, or member) may use this
// route - see canUseAIChat in permissions.ts. Context/permissions/history
// architecture is shared across all three roles unchanged; only each
// role's own tool/context scoping (still unbuilt - Phase 1 registers no
// tools, see toolRegistry.ts) will differ later.

import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/ai/contextManager';
import { canUseAIChat } from '@/lib/ai/permissions';
import { callAI } from '@/lib/ai/aiService';
import { logAIEvent } from '@/lib/ai/auditLog';
import { createSession, appendMessage, getRecentMessages, getSessionDoc } from '@/lib/ai/conversationHistory';

export async function POST(req: NextRequest) {
  try {
    const { idToken, message, lang, sessionId: incomingSessionId } = await req.json();
    if (!idToken || !message) {
      return NextResponse.json({ error: 'Missing idToken or message' }, { status: 400 });
    }

    // Same 5 language codes as the rest of the site - defaults to English.
    const requestedLang = typeof lang === 'string' && lang.trim() ? lang.trim() : 'en';

    // The backend re-verifies identity, role, and permission on every
    // single call - UNIMUNITY AI is never itself the security boundary.
    const ctx = await buildContext(idToken, requestedLang);
    if (!canUseAIChat(ctx)) {
      return NextResponse.json({ error: 'AI access not permitted for this account' }, { status: 403 });
    }

    // A session lives at aiConversations/{uid}/sessions/{id} - re-verify
    // any incoming sessionId actually belongs to this uid before writing
    // to it, rather than trusting whatever the client sends.
    let sessionId = typeof incomingSessionId === 'string' && incomingSessionId ? incomingSessionId : null;
    if (sessionId) {
      const existing = await getSessionDoc(ctx.uid, sessionId);
      if (!existing) sessionId = null;
    }
    if (!sessionId) {
      sessionId = await createSession(ctx);
    }

    await appendMessage(ctx.uid, sessionId, { role: 'user', content: String(message), lang: requestedLang });

    // Context passed to the model is limited to this session's recent
    // messages only - never a scan across the user's other sessions.
    const recent = await getRecentMessages(ctx.uid, sessionId);
    const result = await callAI(recent, ctx);

    if (result.text) {
      await appendMessage(ctx.uid, sessionId, { role: 'assistant', content: result.text, lang: requestedLang });
    }

    await logAIEvent(ctx, 'chat_message', { sessionId, configured: result.configured, hadError: !!result.error });

    return NextResponse.json({ ...result, sessionId });
  } catch (e: any) {
    console.error('ai/chat error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
