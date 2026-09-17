// UNIMUNITY Support Widget - minimal shared translations
//
// The app has no single global i18n system today (the only precedent is a
// page-local `T` dict in src/app/page.tsx, and UnimunityAIPanel's own local
// `lang` state/dropdown for the 5 codes the site already supports:
// en/fr/ht/es/pt). Per the spec ("do not hard-code English-only text",
// "compatible with the application's translation/i18n architecture"), the
// brand-new strings this widget introduces (shared header, bottom nav,
// Home tab, AI welcome/footer) are routed through this small dictionary
// instead of being hard-coded in English, and the language selector is
// lifted to the whole widget (not just the AI tab) so Home benefits too.
//
// Messages' own existing UI strings ("No conversations yet.", "Type a
// message", etc.) are intentionally left as they already were - that is
// existing, preserved UI, not new text introduced by this task.
//
// widgetTitle vs the assistant's persona name: per Rachele's reference
// model (an AutoDS-style support widget), the panel's own header/title bar
// shows only the brand logo mark (no separate "UNIMUNITY" text label next
// to it), while the assistant's own persona name is shown separately,
// next to its avatar photo inside the AI chat itself.
//
// Persona name (Orben / Ornella): per Rachele's explicit instruction, the
// assistant's displayed first name now follows which avatar photo is
// shown - "Orben" for the male/admin-organizer portrait, "Ornella" for the
// female/member portrait - exactly the same way the photo itself already
// varies by persona (see RobotAvatar.tsx: "the avatar is a UI presentation
// decision, not a separate AI system"). This is still ONE central
// UNIMUNITY AI - see the note in aiService.ts - only the first name it
// introduces itself with changes with the persona/avatar shown, the same
// way a person's name doesn't change who they are. AGENT_NAMES/agentName
// below are the single source of truth for this; any dictionary string
// that needs to say the assistant's name uses the "{name}" placeholder
// and gets it filled in via agentName(persona) at render time, rather than
// hard-coding "Orben" or "Ornella" into translated text.
//
// aiSug1..aiSug4: the Member AI's suggested-question chips (per the
// "MEMBER CHAT / AI ASSISTANT - FINAL UI/UX DESIGN SPECIFICATION" -
// section 6). These are UI copy only, not new AI backend behavior: the
// questions are sent through the same /api/ai/chat call as any typed
// message, so today the AI answers them as generally as it can (it does
// not yet have real per-member Payment Grid/receipt data wired in - that
// would be an AI backend change and is out of scope here).
import type { AIPersona } from '../ai/RobotAvatar';

export type SupportLang = 'en' | 'fr' | 'ht' | 'es' | 'pt';

export const SUPPORT_LANGUAGES: { code: SupportLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ht', label: 'HT' },
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
];

// Single source of truth for the assistant's persona first name, keyed by
// which avatar photo is shown (see RobotAvatar.tsx's PERSONA_SRC - same
// keys, same meaning). Identical across all 5 languages: a first name is
// not translated.
export const AGENT_NAMES: Record<AIPersona, string> = {
  admin: 'Orben',
  member: 'Ornella',
};

export function agentName(persona: AIPersona): string {
  return AGENT_NAMES[persona];
}

type Dict = Record<string, string>;

const STRINGS: Record<SupportLang, Dict> = {
  en: {
    widgetTitle: 'UNIMUNITY',
    navHome: 'Home',
    navMessages: 'Messages',
    navAI: 'AI',
    homeGreeting: 'How can we help?',
    homeSubtitle: 'Get help, chat with your team, or ask {name}, your UNIMUNITY AI assistant.',
    homeMessages: 'Messages',
    homeMessagesUnread: 'unread',
    homeMessagesEmpty: 'Chat with your team',
    homeAskAI: 'Ask {name}',
    homeAskAISubtitle: 'Your intelligent assistant',
    homeQuickHelpLabel: 'Quick Help',
    homeQHGrid: 'Payment Grid',
    homeQHReceipts: 'Receipts',
    homeQHDocuments: 'Documents',
    homeQHStatus: 'Payment Status',
    aiWelcome: 'Hello! I\'m {name}. How can I help you? I can help you understand your UNIMUNITY account and your Tontine.',
    aiFooter: '{name} is an automated assistant, not a human. Use Messages to reach your organizer or team.',
    aiPlaceholder: 'Type a message',
    aiThinking: 'Thinking...',
    aiSuggestionsLabel: 'Suggestions',
    aiSug1: 'How does my Payment Grid work?',
    aiSug2: 'Where can I find my receipts?',
    aiSug3: 'What does my payment status mean?',
    aiSug4: 'How do I upload a document?',
  },
  fr: {
    widgetTitle: 'UNIMUNITY',
    navHome: 'Accueil',
    navMessages: 'Messages',
    navAI: 'IA',
    homeGreeting: 'Comment pouvons-nous vous aider ?',
    homeSubtitle: 'Obtenez de l’aide, discutez avec votre équipe ou posez une question à {name}, votre assistant IA UNIMUNITY.',
    homeMessages: 'Messages',
    homeMessagesUnread: 'non lu(s)',
    homeMessagesEmpty: 'Discutez avec votre équipe',
    homeAskAI: 'Demander à {name}',
    homeAskAISubtitle: 'Votre assistant intelligent',
    homeQuickHelpLabel: 'Aide rapide',
    homeQHGrid: 'Grille de paiement',
    homeQHReceipts: 'Reçus',
    homeQHDocuments: 'Documents',
    homeQHStatus: 'Statut de paiement',
    aiWelcome: 'Bonjour ! Je suis {name}. Comment puis-je vous aider ? Je peux vous aider à comprendre votre compte UNIMUNITY et votre Tontine.',
    aiFooter: '{name} est un assistant automatisé, pas une personne humaine. Utilisez Messages pour joindre votre organisateur ou votre équipe.',
    aiPlaceholder: 'Écrivez un message',
    aiThinking: 'Réflexion...',
    aiSuggestionsLabel: 'Suggestions',
    aiSug1: 'Comment fonctionne ma grille de paiement ?',
    aiSug2: 'Où puis-je trouver mes reçus ?',
    aiSug3: 'Que signifie le statut de mon paiement ?',
    aiSug4: 'Comment puis-je téléverser un document ?',
  },
  ht: {
    widgetTitle: 'UNIMUNITY',
    navHome: 'Akey',
    navMessages: 'Mesaj',
    navAI: 'AI',
    homeGreeting: 'Kijan nou ka ede w?',
    homeSubtitle: 'Jwenn èd, pale ak ekip ou, oswa poze {name}, asistan IA UNIMUNITY ou, yon kesyon.',
    homeMessages: 'Mesaj',
    homeMessagesUnread: 'pa li',
    homeMessagesEmpty: 'Pale ak ekip ou',
    homeAskAI: 'Mande {name}',
    homeAskAISubtitle: 'Asistan entèlijan ou',
    homeQuickHelpLabel: 'Èd Rapid',
    homeQHGrid: 'Payment Grid',
    homeQHReceipts: 'Resi',
    homeQHDocuments: 'Dokiman',
    homeQHStatus: 'Estati Peman',
    aiWelcome: 'Bonjou! Se mwen {name}. Kijan mwen ka ede w? Mwen ka ede w konprann kont UNIMUNITY ou ak Tontine ou.',
    aiFooter: '{name} se yon asistan otomatik, se pa yon moun. Sèvi ak Mesaj pou kontakte òganizatè w oswa ekip ou.',
    aiPlaceholder: 'Ekri yon mesaj',
    aiThinking: 'Ap reflechi...',
    aiSuggestionsLabel: 'Sijesyon',
    aiSug1: 'Kijan Payment Grid mwen an fonksyone?',
    aiSug2: 'Kote mwen ka jwenn resi mwen yo?',
    aiSug3: 'Kisa estati peman mwen an vle di?',
    aiSug4: 'Kijan mwen ka telechaje yon dokiman?',
  },
  es: {
    widgetTitle: 'UNIMUNITY',
    navHome: 'Inicio',
    navMessages: 'Mensajes',
    navAI: 'IA',
    homeGreeting: '¿Cómo podemos ayudarte?',
    homeSubtitle: 'Obtén ayuda, chatea con tu equipo o pregúntale a {name}, tu asistente de IA de UNIMUNITY.',
    homeMessages: 'Mensajes',
    homeMessagesUnread: 'sin leer',
    homeMessagesEmpty: 'Chatea con tu equipo',
    homeAskAI: 'Preguntar a {name}',
    homeAskAISubtitle: 'Tu asistente inteligente',
    homeQuickHelpLabel: 'Ayuda rápida',
    homeQHGrid: 'Cuadrícula de pagos',
    homeQHReceipts: 'Recibos',
    homeQHDocuments: 'Documentos',
    homeQHStatus: 'Estado de pago',
    aiWelcome: '¡Hola! Soy {name}. ¿Cómo puedo ayudarte? Puedo ayudarte a entender tu cuenta de UNIMUNITY y tu Tontine.',
    aiFooter: '{name} es un asistente automatizado, no una persona humana. Usa Mensajes para contactar a tu organizador o equipo.',
    aiPlaceholder: 'Escribe un mensaje',
    aiThinking: 'Pensando...',
    aiSuggestionsLabel: 'Sugerencias',
    aiSug1: '¿Cómo funciona mi cuadrícula de pagos?',
    aiSug2: '¿Dónde puedo encontrar mis recibos?',
    aiSug3: '¿Qué significa el estado de mi pago?',
    aiSug4: '¿Cómo subo un documento?',
  },
  pt: {
    widgetTitle: 'UNIMUNITY',
    navHome: 'Início',
    navMessages: 'Mensagens',
    navAI: 'IA',
    homeGreeting: 'Como podemos ajudar?',
    homeSubtitle: 'Obtenha ajuda, converse com sua equipe ou pergunte à {name}, sua assistente de IA da UNIMUNITY.',
    homeMessages: 'Mensagens',
    homeMessagesUnread: 'não lida(s)',
    homeMessagesEmpty: 'Converse com sua equipe',
    homeAskAI: 'Perguntar à {name}',
    homeAskAISubtitle: 'Sua assistente inteligente',
    homeQuickHelpLabel: 'Ajuda rápida',
    homeQHGrid: 'Grade de pagamentos',
    homeQHReceipts: 'Recibos',
    homeQHDocuments: 'Documentos',
    homeQHStatus: 'Status do pagamento',
    aiWelcome: 'Olá! Eu sou {name}. Como posso ajudar você? Posso ajudar você a entender sua conta UNIMUNITY e sua Tontine.',
    aiFooter: '{name} é uma assistente automatizada, não é uma pessoa humana. Use Mensagens para falar com seu organizador ou equipe.',
    aiPlaceholder: 'Digite uma mensagem',
    aiThinking: 'Pensando...',
    aiSuggestionsLabel: 'Sugestões',
    aiSug1: 'Como funciona minha grade de pagamentos?',
    aiSug2: 'Onde posso encontrar meus recibos?',
    aiSug3: 'O que significa o status do meu pagamento?',
    aiSug4: 'Como faço para enviar um documento?',
  },
};

export function t(lang: string, key: keyof typeof STRINGS['en']): string {
  const dict = STRINGS[lang as SupportLang] || STRINGS.en;
  return dict[key] ?? STRINGS.en[key];
}

// Convenience for the (few) dictionary strings that embed the assistant's
// name as a "{name}" placeholder - looks up the string then fills in the
// right persona name, so call sites never hard-code "Orben"/"Ornella".
export function tName(lang: string, key: keyof typeof STRINGS['en'], persona: AIPersona): string {
  return t(lang, key).replace('{name}', agentName(persona));
}
