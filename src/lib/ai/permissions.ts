// UNIMUNITY AI Assistant - Phase 1: Foundation
// Deny-by-default permission checks. Per the IA Central spec: the AI must
// never grant itself access, and every capability must be explicitly
// allowed here before it can be used elsewhere in the AI layer. The AI
// itself is never the security boundary - every check here re-runs on
// the backend for every request, regardless of what the client claims.

import { AIContext } from './types';

// Can this role use UNIMUNITY AI at all, once its mode is built? This is
// the general architecture-level answer (used by the internal /api/ai/ping
// diagnostic) - super_admin, admin and member are all eventually allowed.
// It is deliberately NOT the gate that decides what ships today - see
// canUseAIChat below.
export function canUseAI(ctx: AIContext): boolean {
  return ctx.userRole === 'super_admin' || ctx.userRole === 'admin' || ctx.userRole === 'member';
}

// The production gate for the assistant (/api/ai/chat and the widget's AI
// tab). Opened from Super-Admin-only to every signed-in role per Rachele's
// explicit confirmation that members need UNIMUNITY AI too, to understand
// the app's different features - exactly the "loosening this one function"
// this was designed for, not a new engine. Delegates to canUseAI so the
// two stay in sync; kept as its own named export since the production
// route and the internal /api/ai/ping diagnostic may need to diverge again
// later (e.g. a role gaining tool access before it's ready for the other).
export function canUseAIChat(ctx: AIContext): boolean {
  return canUseAI(ctx);
}

// Can this person run a specific tool? Phase 1 ships with zero registered
// tools (see toolRegistry.ts), so this always returns false for now - it
// exists so later phases add capabilities here explicitly, one at a time,
// instead of the AI ever assuming access.
export function canRunTool(_toolName: string, _ctx: AIContext): boolean {
  return false;
}

// Destructive or data-changing tools must always be confirmed by the user
// before running, regardless of what canRunTool says. Enforced again here
// (not just in the UI) so a future bug in the UI can't skip confirmation.
export function requiresConfirmation(tool: { requiresConfirmation: boolean }): boolean {
  return tool.requiresConfirmation !== false;
}
