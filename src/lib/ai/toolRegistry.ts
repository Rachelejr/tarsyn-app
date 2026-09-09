// UNIMUNITY AI Assistant - Phase 1: Foundation
// Whitelisted tool registry. Empty on purpose in Phase 1 - no tool lets
// the AI read or write anything yet. Later phases will call registerTool()
// for specific, narrow, audited actions (e.g. "look up a member's
// balance"), never "run any Firestore query".

import { AIToolDefinition } from './types';

const registry = new Map<string, AIToolDefinition>();

export function registerTool(tool: AIToolDefinition): void {
  if (registry.has(tool.name)) {
    throw new Error(`AI tool "${tool.name}" is already registered.`);
  }
  registry.set(tool.name, tool);
}

export function getTool(name: string): AIToolDefinition | undefined {
  return registry.get(name);
}

export function listTools(): AIToolDefinition[] {
  return Array.from(registry.values());
}
