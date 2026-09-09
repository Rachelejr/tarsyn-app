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

// The same 5 language codes used across the rest of the site (LANGUAGES /
// the T dict in src/app/page.tsx). Any other code is passed through as-is
// so the model can still try, but these are named explicitly so the model
// never has to guess what a bare 2-3 letter code means.
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  ht: 'Haitian Creole',
  es: 'Spanish',
  pt: 'Portuguese',
};

function languageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

function systemPrompt(ctx: AIContext): string {
  return [
    'You are the UNIMUNITY assistant, built into a platform that helps organizers run rotating savings groups (tontines/sols) and church communities. UNIMUNITY supports members and organizers worldwide, so always be ready to help someone in their own language.',
    `Always reply in ${languageName(ctx.lang)} (language code: ${ctx.lang}), no matter what language the person's message is written in - unless they explicitly ask you to switch to a different language, in which case follow that instead.`,
    'You cannot currently take any action, read any group data, or change anything in the account - that capability has not been enabled yet. If asked to do something, say so plainly (in the reply language) and suggest the person use the dashboard directly.',
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
