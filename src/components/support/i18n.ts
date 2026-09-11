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
// aiSug1..aiSug4: the Member AI's suggested-question chips (per the
// "MEMBER CHAT / AI ASSISTANT - FINAL UI/UX DESIGN SPECIFICATION" -
// section 6). These are UI copy only, not new AI backend behavior: the
// questions are sent through the same /api/ai/chat call as any typed
// message, so today the AI answers them as generally as it can (it does
// not yet have real per-member Payment Grid/receipt data wired in - that
// would be an AI backend change and is out of scope here).
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
    widgetTitle: 'UNIMUNITY AI',
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
    aiWelcome: 'Hello! How can I help you? I can help you understand your UNIMUNITY account and your Tontine.',
    aiFooter: 'UNIMUNITY AI — not a human. Use Messages to reach your organizer or team.',
    aiPlaceholder: 'Type a message',
    aiThinking: 'Thinking...',
    aiSuggestionsLabel: 'Suggestions',
    aiSug1: 'How does my Payment Grid work?',
    aiSug2: 'Where can I find my receipts?',
    aiSug3: 'What does my payment status mean?',
    aiSug4: 'How do I upload a document?',
  },
  fr: {
    widgetTitle: 'UNIMUNITY AI',
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
    aiWelcome: 'Bonjour ! Comment puis-je vous aider ? Je peux vous aider à comprendre votre compte UNIMUNITY et votre Tontine.',
    aiFooter: 'UNIMUNITY AI — pas une personne humaine. Utilisez Messages pour joindre votre organisateur ou votre équipe.',
    aiPlaceholder: 'Écrivez un message',
    aiThinking: 'Réflexion...',
    aiSuggestionsLabel: 'Suggestions',
    aiSug1: 'Comment fonctionne ma grille de paiement ?',
    aiSug2: 'Où puis-je trouver mes reçus ?',
    aiSug3: 'Que signifie le statut de mon paiement ?',
    aiSug4: 'Comment puis-je téléverser un document ?',
  },
  ht: {
    widgetTitle: 'UNIMUNITY AI',
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
    aiWelcome: 'Bonjou! Kijan mwen ka ede w? Mwen ka ede w konprann kont UNIMUNITY ou ak Tontine ou.',
    aiFooter: 'UNIMUNITY AI — se pa yon moun. Sèvi ak Mesaj pou kontakte òganizatè w oswa ekip ou.',
    aiPlaceholder: 'Ekri yon mesaj',
    aiThinking: 'Ap reflechi...',
    aiSuggestionsLabel: 'Sijesyon',
    aiSug1: 'Kijan Payment Grid mwen an fonksyone?',
    aiSug2: 'Kote mwen ka jwenn resi mwen yo?',
    aiSug3: 'Kisa estati peman mwen an vle di?',
    aiSug4: 'Kijan mwen ka telechaje yon dokiman?',
  },
  es: {
    widgetTitle: 'UNIMUNITY AI',
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
    aiWelcome: '¡Hola! ¿Cómo puedo ayudarte? Puedo ayudarte a entender tu cuenta de UNIMUNITY y tu Tontine.',
    aiFooter: 'UNIMUNITY AI — no es una persona humana. Usa Mensajes para contactar a tu organizador o equipo.',
    aiPlaceholder: 'Escribe un mensaje',
    aiThinking: 'Pensando...',
    aiSuggestionsLabel: 'Sugerencias',
    aiSug1: '¿Cómo funciona mi cuadrícula de pagos?',
    aiSug2: '¿Dónde puedo encontrar mis recibos?',
    aiSug3: '¿Qué significa el estado de mi pago?',
    aiSug4: '¿Cómo subo un documento?',
  },
  pt: {
    widgetTitle: 'UNIMUNITY AI',
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
    aiWelcome: 'Olá! Como posso ajudar você? Posso ajudar você a entender sua conta UNIMUNITY e sua Tontine.',
    aiFooter: 'UNIMUNITY AI — não é uma pessoa humana. Use Mensagens para falar com seu organizador ou equipe.',
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
