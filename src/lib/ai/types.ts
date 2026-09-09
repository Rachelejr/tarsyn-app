// UNIMUNITY AI Assistant - Phase 1: Foundation
// Shared types for the AI service abstraction layer described in the
// "IA Central" spec. Nothing in this file calls any AI provider or
// touches Firestore - it only defines the shapes used by the rest of
// src/lib/ai/*.

export type AIRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIRole;
  content: string;
}

// Everything the AI is allowed to know about who is asking and what they
// can do. Built once per request by contextManager.ts and passed through
// the whole pipeline - the AI layer never looks anything up on its own.
//
// UNIMUNITY AI is a single central assistant for the whole platform, not
// one assistant per role. 'super_admin' is Phase 1's only active mode;
// 'admin' and 'member' already exist in this union so a later phase adds
// their modes by extending permissions/context scoping, not by building a
// second engine.
export interface AIContext {
  uid: string;
  email: string | null;
  userRole: 'super_admin' | 'admin' | 'member' | 'anonymous';
  module: 'tontine' | 'church' | null;
  groupId: string | null;
  lang: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  // JSON-schema-like shape describing the tool's input, for future use
  // once tools are wired to the model's tool-use API (Phase 4).
  inputSchema: Record<string, unknown>;
  requiresConfirmation: boolean;
  handler: (input: Record<string, unknown>, ctx: AIContext) => Promise<unknown>;
}

export interface AIServiceResult {
  text: string;
  toolCalls: { name: string; input: Record<string, unknown> }[];
  configured: boolean;
  error: string | null;
}

// One AI conversation session, stored at aiConversations/{uid}/sessions/{id}.
// Scoped to a single uid by construction (see conversationHistory.ts) so
// privacy holds regardless of role - orgId/workspaceId are reserved for
// future Admin/Member scoping and stay null for Super Admin's Phase 1
// platform-wide scope.
export interface AIConversationSession {
  uid: string;
  role: AIContext['userRole'];
  module: AIContext['module'];
  groupId: string | null;
  orgId: string | null;
  workspaceId: string | null;
  title: string | null;
  messageCount: number;
  lastMessagePreview: string;
}

export interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  lang: string;
}
