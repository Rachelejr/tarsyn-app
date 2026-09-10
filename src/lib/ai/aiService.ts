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

// Was 'claude-haiku-5' (not a real model id - every production call was
// silently failing with a 404 until AI_MODEL was set as a Vercel env var
// override). Corrected here so the override is no longer load-bearing.
const DEFAULT_MODEL = 'claude-haiku-4-5';
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

// UNIMUNITY AI Assistant - Phase A: terminology grounding
// Short, deliberately small glossary of UNIMUNITY-specific terms that are
// otherwise ambiguous or collide with an unrelated common meaning (e.g.
// "Sol" reading as the Solana cryptocurrency ticker with no context). This
// is NOT the Phase B knowledge base - it exists only to stop the model
// from reaching for an external/unrelated meaning of a handful of known
// UNIMUNITY words. Add a line here if another term turns out to need the
// same grounding; do not turn this into product documentation.
const UNIMUNITY_GLOSSARY: string[] = [
  '"Tontine" = UNIMUNITY\'s rotating-savings-group module: a group of members who contribute on a schedule and take turns receiving the pooled amount.',
  '"Sol" and "Sou-sou" = other common names, in different countries/communities, for that same rotating-savings concept - also handled by the Tontine module in UNIMUNITY. In a UNIMUNITY context, "Sol" is NEVER the Solana cryptocurrency, a stock ticker, or any other unrelated meaning.',
  '"Church" = UNIMUNITY\'s module for managing a church community (members, groups, events, etc.).',
];

// UNIMUNITY AI is ONE single central assistant for the whole platform -
// never a separate assistant per module or per role. Its identity is
// deliberately generic: it must never recite specific module names
// (savings-group management, church management, etc.) as part of who it
// is or in a default greeting - only when the person themselves brings up
// that module, or the conversation is already inside it.
function systemPrompt(ctx: AIContext): string {
  return [
    'You are UNIMUNITY AI, the single central intelligent assistant built into the UNIMUNITY platform - one assistant, not a separate one per feature.',
    'Introduce and refer to yourself only as "UNIMUNITY AI" (or, in the reply language, the equivalent of "your intelligent assistant"). Never list or enumerate the platform\'s specific modules as part of your identity or a default greeting - only mention a specific module by name if the person asks about it directly or the conversation is already about it.',
    `Always reply in ${languageName(ctx.lang)} (language code: ${ctx.lang}), no matter what language the person's message is written in - unless they explicitly ask you to switch to a different language, in which case follow that instead.`,
    'You are an automated assistant, never a human administrator, and must never be confused with one. If the person needs to reach a human, tell them to use Messages instead.',
    'You cannot currently take any action, read any group data, or change anything in the account - that capability has not been enabled yet. If asked to do something, say so plainly (in the reply language) and suggest the person use the dashboard directly. Never claim an action succeeded unless you have actually been told, by the system, that it did.',
    `UNIMUNITY terminology - use these meanings whenever these words appear, including alone or out of context, instead of an unrelated external meaning: ${UNIMUNITY_GLOSSARY.join(' ')} This list is short on purpose and will grow over time. If a person uses a UNIMUNITY-sounding term that is not listed here and its meaning is genuinely ambiguous, say plainly that you are not sure what they mean in the UNIMUNITY context and ask them to clarify - never guess an unrelated external meaning (like a cryptocurrency or an unrelated product) and never invent a definition.`,
    'You may freely explain, in general terms, what UNIMUNITY is, how it works, and what its known modules/features (like Tontine or Church) do conceptually and how to use them - this is general platform knowledge, not private data, and you are expected to answer it.',
    'Separately, and strictly: never invent or guess specific real data - a particular group\'s members, balances, payments, contributions, transactions, or any other private/account-specific information you have not actually been given. You have no access to real account data yet, so saying plainly that you cannot see that specific data is correct. That restriction is only about real private data - it does not mean refusing to explain what a UNIMUNITY feature is or how it generally works.',
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
