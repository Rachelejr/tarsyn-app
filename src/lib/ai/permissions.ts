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

// The actual Phase 1 gate for the production assistant (/api/ai/chat and
// the UnimunityAIPanel UI): Super Admin mode only. Admin and Member modes
// reuse the exact same context/permission/history architecture - turning
// them on later is loosening this one function, not building a new engine.
export function canUseAIChat(ctx: AIContext): boolean {
  return ctx.userRole === 'super_admin';
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
