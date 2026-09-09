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

const SUPER_ADMIN_EMAIL = 'rachelejr779@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { idToken, message } = await req.json();
    if (!idToken || !message) {
      return NextResponse.json({ error: 'Missing idToken or message' }, { status: 400 });
    }

    const ctx = await buildContext(idToken, 'en');
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
