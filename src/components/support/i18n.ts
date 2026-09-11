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
export type SupportLang = 'en' | 'fr' | 'ht' | 'es' | 'pt';

export const SUPPORT_LANGUAGES: { code: SupportLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ht', label: 'HT' },
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
];

type Dict = Record<string, string>;

const STRINGS: Record<SupportLang, Dict> = {
  en: {
    widgetTitle: 'UNIMUNITY Assistant',
    navHome: 'Home',
    navMessages: 'Messages',
    navAI: 'AI',
    homeGreeting: 'How can we help?',
    homeSubtitle: 'Get help, chat with your team, or ask UNIMUNITY AI.',
    homeMessages: 'Messages',
    homeMessagesUnread: 'unread',
    homeMessagesEmpty: 'Chat with your team',
    homeAskAI: 'Ask UNIMUNITY AI',
    homeAskAISubtitle: 'Your intelligent assistant',
    aiWelcome: "Hello! I'm UNIMUNITY AI, your intelligent assistant. How can I help you today?",
    aiFooter: 'Automated assistant — not a human administrator. Use Messages to reach a person.',
    aiPlaceholder: 'Type a message',
    aiThinking: 'Thinking...',
  },
  fr: {
    widgetTitle: 'UNIMUNITY Assistant',
    navHome: 'Accueil',
    navMessages: 'Messages',
    navAI: 'IA',
    homeGreeting: 'Comment pouvons-nous vous aider ?',
    homeSubtitle: 'Obtenez de l’aide, discutez avec votre équipe ou posez une question à UNIMUNITY AI.',
    homeMessages: 'Messages',
    homeMessagesUnread: 'non lu(s)',
    homeMessagesEmpty: 'Discutez avec votre équipe',
    homeAskAI: 'Demander à UNIMUNITY AI',
    homeAskAISubtitle: 'Votre assistant intelligent',
    aiWelcome: 'Bonjour ! Je suis UNIMUNITY AI, votre assistant intelligent. Comment puis-je vous aider aujourd’hui ?',
    aiFooter: 'Assistant automatisé — pas un administrateur humain. Utilisez Messages pour joindre une personne.',
    aiPlaceholder: 'Écrivez un message',
    aiThinking: 'Réflexion...',
  },
  ht: {
    widgetTitle: 'UNIMUNITY Assistant',
    navHome: 'Akey',
    navMessages: 'Mesaj',
    navAI: 'AI',
    homeGreeting: 'Kijan nou ka ede w?',
    homeSubtitle: 'Jwenn èd, pale ak ekip ou, oswa poze UNIMUNITY AI yon kesyon.',
    homeMessages: 'Mesaj',
    homeMessagesUnread: 'pa li',
    homeMessagesEmpty: 'Pale ak ekip ou',
    homeAskAI: 'Mande UNIMUNITY AI',
    homeAskAISubtitle: 'Asistan entèlijan ou',
    aiWelcome: 'Bonjou! Mwen se UNIMUNITY AI, asistan entèlijan ou. Kijan mwen ka ede w jodi a?',
    aiFooter: 'Asistan otomatik — se pa yon administratè imen. Sèvi ak Mesaj pou kontakte yon moun.',
    aiPlaceholder: 'Ekri yon mesaj',
    aiThinking: 'Ap reflechi...',
  },
  es: {
    widgetTitle: 'UNIMUNITY Assistant',
    navHome: 'Inicio',
    navMessages: 'Mensajes',
    navAI: 'IA',
    homeGreeting: '¿Cómo podemos ayudarte?',
    homeSubtitle: 'Obtén ayuda, chatea con tu equipo o pregúntale a UNIMUNITY AI.',
    homeMessages: 'Mensajes',
    homeMessagesUnread: 'sin leer',
    homeMessagesEmpty: 'Chatea con tu equipo',
    homeAskAI: 'Preguntar a UNIMUNITY AI',
    homeAskAISubtitle: 'Tu asistente inteligente',
    aiWelcome: '¡Hola! Soy UNIMUNITY AI, tu asistente inteligente. ¿Cómo puedo ayudarte hoy?',
    aiFooter: 'Asistente automatizado — no es un administrador humano. Usa Mensajes para contactar a una persona.',
    aiPlaceholder: 'Escribe un mensaje',
    aiThinking: 'Pensando...',
  },
  pt: {
    widgetTitle: 'UNIMUNITY Assistant',
    navHome: 'Início',
    navMessages: 'Mensagens',
    navAI: 'IA',
    homeGreeting: 'Como podemos ajudar?',
    homeSubtitle: 'Obtenha ajuda, converse com sua equipe ou pergunte à UNIMUNITY AI.',
    homeMessages: 'Mensagens',
    homeMessagesUnread: 'não lida(s)',
    homeMessagesEmpty: 'Converse com sua equipe',
    homeAskAI: 'Perguntar à UNIMUNITY AI',
    homeAskAISubtitle: 'Sua assistente inteligente',
    aiWelcome: 'Olá! Sou a UNIMUNITY AI, sua assistente inteligente. Como posso ajudar você hoje?',
    aiFooter: 'Assistente automatizado — não é um administrador humano. Use Mensagens para falar com uma pessoa.',
    aiPlaceholder: 'Digite uma mensagem',
    aiThinking: 'Pensando...',
  },
};

export function t(lang: string, key: keyof typeof STRINGS['en']): string {
  const dict = STRINGS[lang as SupportLang] || STRINGS.en;
  return dict[key] ?? STRINGS.en[key];
}
