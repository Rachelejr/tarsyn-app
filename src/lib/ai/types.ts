// UNIMUNITY AI Assistant - Phase 1: Foundation
// Shared types for the AI service abstraction layer described in the
// "IA Central" V1.0 spec. Nothing in this file calls any AI provider or
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
export interface AIContext {
  uid: string;
  email: string | null;
  userRole: 'admin' | 'member' | 'anonymous';
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
