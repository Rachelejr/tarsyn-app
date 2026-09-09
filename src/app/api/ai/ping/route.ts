// UNIMUNITY AI Assistant - Phase 1: Foundation
// Internal-only diagnostic endpoint. Not linked from any page yet - it
// exists purely to confirm the foundation (context -> permissions ->
// aiService -> audit log) works end-to-end before any user-facing UI is
// built in a later phase. Restricted to the super-admin account.

import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/ai/contextManager';
import { canUseAI } from '@/lib/ai/permissions';
import { callAI } from '@/lib/ai/aiService';
import { logAIEvent } from '@/lib/ai/auditLog';
import { SUPER_ADMIN_EMAIL } from '@/lib/ai/constants';

export async function POST(req: NextRequest) {
  try {
    const { idToken, message, lang } = await req.json();
    if (!idToken || !message) {
      return NextResponse.json({ error: 'Missing idToken or message' }, { status: 400 });
    }

    // Whichever language the caller says the user is using (the same 5
    // language codes the rest of the site uses: en/fr/ht/es/pt) - the AI
    // replies in that language, regardless of what language the message
    // itself was typed in. Defaults to English if not provided.
    const requestedLang = typeof lang === 'string' && lang.trim() ? lang.trim() : 'en';

    const ctx = await buildContext(idToken, requestedLang);
    if (ctx.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (!canUseAI(ctx)) {
      return NextResponse.json({ error: 'AI access not permitted for this account' }, { status: 403 });
    }

    const result = await callAI([{ role: 'user', content: String(message) }], ctx);
    await logAIEvent(ctx, 'foundation_ping', { configured: result.configured, hadError: !!result.error });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('ai/ping error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
