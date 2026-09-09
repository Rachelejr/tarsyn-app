// UNIMUNITY AI Assistant - Phase 1: Foundation
// Deny-by-default permission checks. Per the IA Central spec: the AI must
// never grant itself access, and every capability must be explicitly
// allowed here before it can be used elsewhere in the AI layer.

import { AIContext } from './types';

// Can this person talk to the AI at all? For now: must be a signed-in
// admin or member. Anonymous visitors get no AI access.
export function canUseAI(ctx: AIContext): boolean {
  return ctx.userRole === 'admin' || ctx.userRole === 'member';
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
