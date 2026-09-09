// UNIMUNITY AI Assistant - Phase 1: Foundation
// The single abstraction point that talks to the AI provider. Nothing
// else in the codebase should call an AI API directly - everything goes
// through callAI() so the provider, model, and safety behavior can change
// in one place. Per the IA Central spec: the app must fully function if
// the AI is down or not configured, so this never throws - it always
// returns an AIServiceResult, with `configured`/`error` telling the caller
// what happened.

import { AIContext, AIMessage, AIServiceResult } from './types';
import { listTools } from './toolRegistry';

const DEFAULT_MODEL = 'claude-haiku-5';
const MAX_TOKENS = 1024;

function systemPrompt(ctx: AIContext): string {
  return [
    'You are the UNIMUNITY assistant, built into a platform that helps organizers run rotating savings groups (tontines/sols) and church communities.',
    `Reply in this language: ${ctx.lang}.`,
    'You cannot currently take any action, read any group data, or change anything in the account - that capability has not been enabled yet. If asked to do something, say so plainly and suggest the person use the dashboard directly.',
    'Never invent information about a specific group, member, or payment - you have no access to that data yet.',
  ].join(' ');
}

export async function callAI(messages: AIMessage[], ctx: AIContext): Promise<AIServiceResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { text: '', toolCalls: [], configured: false, error: 'ANTHROPIC_API_KEY is not set.' };
  }

  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt(ctx),
        messages: messages.map(m => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { text: '', toolCalls: [], configured: true, error: `AI provider error ${res.status}: ${errText.slice(0, 300)}` };
    }

    const data = await res.json();
    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      : '';

    // Phase 1 registers no tools, so listTools() is always empty - this
    // line exists so the plumbing for tool calls is already in place for
    // Phase 4 without changing this function's signature later.
    void listTools();

    return { text, toolCalls: [], configured: true, error: null };
  } catch (e: any) {
    return { text: '', toolCalls: [], configured: true, error: e?.message || 'AI request failed.' };
  }
}
