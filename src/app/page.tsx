'use client';
import { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import DateTimeWeather from '@/components/DateTimeWeather';

// ============ 25 LANGUES + OTHER ============
const LANGUAGES = [
  { code: 'en',    label: '🇺🇸 English'           },
  { code: 'fr',    label: '🇫🇷 Français'           },
  { code: 'ht',    label: '🇭🇹 Kreyòl ayisyen'     },
  { code: 'kac',   label: '🇦🇬 Kreyòl Antiyè'      },
  { code: 'es',    label: '🇪🇸 Español'            },
  { code: 'pt',    label: '🇧🇷 Português'          },
  { code: 'ar',    label: '🇲🇦 العربية'            },
  { code: 'wo',    label: '🇸🇳 Wolof'              },
  { code: 'bm',    label: '🇲🇱 Bambara'            },
  { code: 'ln',    label: '🇨🇩 Lingala'            },
  { code: 'sw',    label: '🇰🇪 Kiswahili'          },
  { code: 'yo',    label: '🇳🇬 Yorùbá'             },
  { code: 'ig',    label: '🇳🇬 Igbo'               },
  { code: 'ha',    label: '🇳🇬 Hausa'              },
  { code: 'am',    label: '🇪🇹 Amharique'          },
  { code: 'so',    label: '🇸🇴 Somali'             },
  { code: 'mg',    label: '🇲🇬 Malagasy'           },
  { code: 'rw',    label: '🇷🇼 Kinyarwanda'        },
  { code: 'hi',    label: '🇮🇳 हिन्दी (Hindi)'    },
  { code: 'tl',    label: '🇵🇭 Filipino'           },
  { code: 'id',    label: '🇮🇩 Bahasa Indonesia'   },
  { code: 'vi',    label: '🇻🇳 Tiếng Việt'        },
  { code: 'nl',    label: '🇳🇱 Nederlands'         },
  { code: 'de',    label: '🇩🇪 Deutsch'            },
  { code: 'it',    label: '🇮🇹 Italiano'           },
  { code: 'other', label: '➕ Other / Autre'        },
];

const T: Record<string, Record<string, string>> = {
  en: { hero1:'The Smart Way to Manage', hero2:'Your Community', cta:'Create Free Account', signin:'Sign In', trusted:'BUILT FOR COMMUNITIES WORLDWIDE', sub:'Track contributions, manage members, organize your activities, and view your reports automatically.', auto:'AUTO MODE', expert:'EXPERT MODE', startAuto:'Start with Auto Mode', startExpert:'Start with Expert Mode', modeTitle:'How do you want to use UNIMUNITY?', modeSubtitle:'Choose the experience that fits your community.', tagline:'YOUR COMMUNITY. YOUR POWER.', trialBanner:'🎁 10-day free trial · No credit card required', chooseExperience:'CHOOSE YOUR EXPERIENCE', autoBadge:'100% AUTOMATIC — FOR EVERYONE', expertBadge:'FULL CONTROL — FOR ADMINS', autoFeat1:'One-click reminders for overdue members', autoFeat2:'Receipts generated automatically', autoFeat3:'Flexible rotation settings', autoFeat4:'Big buttons - no reading required', autoFeat5:'Works in 25 languages', expertFeat1:'Full analytics dashboard', expertFeat2:'Advanced settings and controls', expertFeat3:'Custom reports and exports', expertFeat4:'Complete member management', expertFeat5:'Full audit trail access', communitiesHeading:'COMMUNITIES AROUND THE WORLD', communitiesSub:'Every nation. Every community. One platform.', statFreeTrial:'Free Trial', statLanguages:'Languages Supported', statAutomatic:'Automatic & Secure', statPlans:'Plans - No Free Tier', howItWorksTitle:'How it works', howItWorksSub:'3 simple steps to get started', step1Title:'Create your group', step1Desc:'Sign up, choose your mode and invite your members in minutes.', step2Title:'Record contributions', step2Desc:'Each payment is confirmed instantly and a receipt is generated automatically.', step3Title:'UNIMUNITY handles the rest', step3Desc:'Manage your rotation, send reminders in one click, and view your reports automatically.', testimonialsTitle:'What our communities say', testimonialsSub:'Real reviews from real UNIMUNITY organizers and members', testimonialsSubEmpty:'Share your experience with UNIMUNITY', leaveTestimonial:'Leave a Testimonial', testimonialsCtaFallback:'Are you already using UNIMUNITY? Share your experience with future organizers.', roleOrganizer:'organizer', roleMember:'member', faqTitle:'Frequently Asked Questions', faqSub:'Everything you need to know about UNIMUNITY', faq1q:'Is UNIMUNITY free?', faq1a:'No - UNIMUNITY is a paid platform. There is a 10-day free trial, then organizers pay a one-time $24.99 lifetime access fee, plus a subscription plan starting at $24.99/month across 4 tiers (Starter, Pro, Business, Enterprise). Some groups also charge a one-time $9.99 member access fee. There is no free-forever plan.', faq2q:'How many members can a group have?', faq2a:'Unlimited. UNIMUNITY supports groups of 2 to 10,000+ members with no restrictions.', faq3q:'Is my data secure?', faq3a:'Absolutely. Each group has a completely isolated, encrypted space. No group can ever see another group\'s data.', faq4q:'Can I use UNIMUNITY in my language?', faq4a:'Yes! UNIMUNITY supports 25 languages with auto-detection. More languages are added regularly.', faq5q:'Do I need to be tech-savvy?', faq5a:'No. Auto Mode is designed for anyone - big buttons, automatic everything, no reading required.', stayUpdatedTitle:'Stay updated with UNIMUNITY', stayUpdatedSub:'Get notified when new languages and features are added', thankYouSubscribe:'✅ Thank you! You\'re on the list.', notifyMe:'Notify Me', addLanguageTitle:'➕ Add Your Language', addLanguageSub:'Your language isn\'t in the list? Tell us — we\'ll add it!', addLanguagePlaceholder:'Ex: Fon, Twi, Soninke, Zarma...', submitLanguage:'Submit Language', cancelBtn:'Cancel', languageSubmittedAlert:'✅ Thank you! "{lang}" has been submitted. We will add it soon!', enterLanguageNameAlert:'Please enter a language name.', enterValidEmailAlert:'Please enter a valid email.' },
  fr: { hero1:'La façon intelligente de gérer', hero2:'votre communauté', cta:'Créer un compte gratuit', signin:'Se connecter', trusted:'CONÇU POUR LES COMMUNAUTÉS DU MONDE ENTIER', sub:'Suivez les contributions, gérez les membres, organisez vos activités et consultez vos rapports automatiquement.', auto:'MODE AUTO', expert:'MODE EXPERT', startAuto:'Commencer en mode auto', startExpert:'Commencer en mode expert', modeTitle:'Comment souhaitez-vous utiliser UNIMUNITY ?', modeSubtitle:'Choisissez l’expérience adaptée à votre communauté.', tagline:'VOTRE COMMUNAUTÉ. VOTRE POUVOIR.', trialBanner:'🎁 Essai gratuit de 10 jours · Aucune carte de crédit requise', chooseExperience:'CHOISISSEZ VOTRE EXPÉRIENCE', autoBadge:'100% AUTOMATIQUE — POUR TOUS', expertBadge:'CONTRÔLE TOTAL — POUR LES ADMINS', autoFeat1:'Rappels envoyés en un clic pour les membres en retard', autoFeat2:'Reçus générés automatiquement', autoFeat3:'Paramètres de rotation flexibles', autoFeat4:'Gros boutons - aucune lecture requise', autoFeat5:'Fonctionne en 25 langues', expertFeat1:'Tableau de bord analytique complet', expertFeat2:'Paramètres et contrôles avancés', expertFeat3:'Rapports et exports personnalisés', expertFeat4:'Gestion complète des membres', expertFeat5:'Accès complet au journal d’audit', communitiesHeading:'DES COMMUNAUTÉS PARTOUT DANS LE MONDE', communitiesSub:'Chaque nation. Chaque communauté. Une seule plateforme.', statFreeTrial:'Essai gratuit', statLanguages:'Langues prises en charge', statAutomatic:'Automatique et sécurisé', statPlans:'Formules - Pas de version gratuite', howItWorksTitle:'Comment ça marche', howItWorksSub:'3 étapes simples pour commencer', step1Title:'Créez votre groupe', step1Desc:'Inscrivez-vous, choisissez votre mode et invitez vos membres en quelques minutes.', step2Title:'Enregistrez les contributions', step2Desc:'Chaque paiement est confirmé instantanément et un reçu est généré automatiquement.', step3Title:'UNIMUNITY s’occupe du reste', step3Desc:'Gérez votre rotation, envoyez des rappels en un clic, et consultez vos rapports automatiquement.', testimonialsTitle:'Ce que disent nos communautés', testimonialsSub:'De vrais avis de vrais organisateurs et membres UNIMUNITY', testimonialsSubEmpty:'Partagez votre expérience avec UNIMUNITY', leaveTestimonial:'Laisser un témoignage', testimonialsCtaFallback:'Vous utilisez déjà UNIMUNITY ? Partagez votre expérience avec les futurs organisateurs.', roleOrganizer:'organisateur', roleMember:'membre', faqTitle:'Questions fréquentes', faqSub:'Tout ce que vous devez savoir sur UNIMUNITY', faq1q:'UNIMUNITY est-il gratuit ?', faq1a:'Non - UNIMUNITY est une plateforme payante. Il y a un essai gratuit de 10 jours, puis les organisateurs paient des frais d’accès à vie de 24,99 $, plus un abonnement à partir de 24,99 $/mois réparti en 4 formules (Starter, Pro, Business, Enterprise). Certains groupes demandent aussi des frais d’accès uniques de 9,99 $ aux membres. Il n’y a pas de formule gratuite à vie.', faq2q:'Combien de membres un groupe peut-il avoir ?', faq2a:'Illimité. UNIMUNITY prend en charge des groupes de 2 à plus de 10 000 membres, sans restriction.', faq3q:'Mes données sont-elles sécurisées ?', faq3a:'Absolument. Chaque groupe dispose d’un espace entièrement isolé et chiffré. Aucun groupe ne peut jamais voir les données d’un autre groupe.', faq4q:'Puis-je utiliser UNIMUNITY dans ma langue ?', faq4a:'Oui ! UNIMUNITY prend en charge 25 langues avec détection automatique. D’autres langues sont ajoutées régulièrement.', faq5q:'Dois-je être à l’aise avec la technologie ?', faq5a:'Non. Le Mode Auto est conçu pour tout le monde - grands boutons, tout est automatique, aucune lecture requise.', stayUpdatedTitle:'Restez informé avec UNIMUNITY', stayUpdatedSub:'Soyez notifié lorsque de nouvelles langues et fonctionnalités sont ajoutées', thankYouSubscribe:'✅ Merci ! Vous êtes sur la liste.', notifyMe:'M’avertir', addLanguageTitle:'➕ Ajoutez votre langue', addLanguageSub:'Votre langue n’est pas dans la liste ? Dites-le-nous — nous l’ajouterons !', addLanguagePlaceholder:'Ex : Fon, Twi, Soninke, Zarma...', submitLanguage:'Envoyer la langue', cancelBtn:'Annuler', languageSubmittedAlert:'✅ Merci ! « {lang} » a été soumis. Nous l’ajouterons bientôt !', enterLanguageNameAlert:'Veuillez entrer un nom de langue.', enterValidEmailAlert:'Veuillez entrer un email valide.' },
  ht: { hero1:'Fason Entelijan pou Jere', hero2:'Kominote Ou', cta:'Kreye Kont Gratis', signin:'Konekte', trusted:'FÈT POU KOMINOTE TOUT KOTE SOU LATÈ', sub:'Swiv kontribisyon, jere manm, jenere resi ak rapò otomatikman.', auto:'MOD OTOMATIK', expert:'MOD EKSPÈ', startAuto:'Kòmanse ak Mod Otomatik', startExpert:'Kòmanse ak Mod Eksprè', modeTitle:'Kijan ou vle itilize UNIMUNITY?', modeSubtitle:'Chwazi eksperyans ki adapte pou kominote w.', tagline:'KOMINOTE OU. PISANS OU.', trialBanner:'🎁 Esè gratis 10 jou · Pa gen kat kredi obligatwa', chooseExperience:'CHWAZI ESPERYANS OU', autoBadge:'100% OTOMATIK — POU TOUT MOUN', expertBadge:'KONTWÒL TOTAL — POU ADMIN YO', autoFeat1:'Rapèl voye nan yon sèl klik pou manm ki an reta', autoFeat2:'Resi jenere otomatikman', autoFeat3:'Paramèt rotasyon fleksib', autoFeat4:'Gwo bouton - ou pa bezwen li anyen', autoFeat5:'Fonksyone nan 25 lang', expertFeat1:'Tablo bò analitik konplè', expertFeat2:'Anviwònman ak kontwòl avanse', expertFeat3:'Rapò ak ekspòte pèsonalize', expertFeat4:'Jesyon konplè manm yo', expertFeat5:'Aksè konplè nan istorik odit', communitiesHeading:'KOMINOTE TOUT KOTE SOU LATÈ', communitiesSub:'Chak nasyon. Chak kominote. Yon sèl platfòm.', statFreeTrial:'Esè gratis', statLanguages:'Lang sipòte', statAutomatic:'Otomatik ak an sekirite', statPlans:'Plan - Pa gen vèsyon gratis', howItWorksTitle:'Kijan sa fonksyone', howItWorksSub:'3 etap senp pou kòmanse', step1Title:'Kreye gwoup ou', step1Desc:'Enskri, chwazi mod ou epi envite manm ou yo nan kèk minit.', step2Title:'Anrejistre kontribisyon yo', step2Desc:'Chak peman konfime imedyatman e yon resi jenere otomatikman.', step3Title:'UNIMUNITY okipe rès la', step3Desc:'Jere wotasyon w, voye rapèl nan yon sèl klik, epi gade rapò w yo otomatikman.', testimonialsTitle:'Sa kominote nou yo di', testimonialsSub:'Vrè kòmantè ki soti nan vrè òganizatè ak manm UNIMUNITY', testimonialsSubEmpty:'Pataje eksperyans ou ak UNIMUNITY', leaveTestimonial:'Kite yon temwayaj', testimonialsCtaFallback:'Ou deja ap itilize UNIMUNITY? Pataje eksperyans ou ak fiti òganizatè yo.', roleOrganizer:'òganizatè', roleMember:'manm', faqTitle:'Kesyon Moun Poze Souvan', faqSub:'Tout sa ou bezwen konnen sou UNIMUNITY', faq1q:'Èske UNIMUNITY gratis?', faq1a:'Non - UNIMUNITY se yon platfòm peyan. Gen yon esè gratis 10 jou, epi apre sa òganizatè yo peye yon frè aksè yon sèl fwa pou tout tan ki koute $24.99, plis yon abònman ki kòmanse a $24.99/mwa nan 4 nivo (Starter, Pro, Business, Enterprise). Kèk gwoup mande tou yon frè aksè manm yon sèl fwa ki koute $9.99. Pa gen okenn plan gratis pou tout tan.', faq2q:'Konbyen manm yon gwoup ka genyen?', faq2a:'San limit. UNIMUNITY sipòte gwoup ki gen ant 2 rive plis pase 10,000 manm san restriksyon.', faq3q:'Èske done mwen yo an sekirite?', faq3a:'Wi, san dout. Chak gwoup gen yon espas totalman izole ak kripte. Yon gwoup pa janm ka wè done yon lòt gwoup.', faq4q:'Èske mwen ka itilize UNIMUNITY nan lang mwen?', faq4a:'Wi! UNIMUNITY sipòte 25 lang ak deteksyon otomatik. Gen plis lang k ap ajoute regilyèman.', faq5q:'Èske fòk mwen konn itilize teknoloji byen?', faq5a:'Non. Mod Otomatik fèt pou tout moun - gwo bouton, tout bagay otomatik, ou pa bezwen li anyen.', stayUpdatedTitle:'Rete enfòme ak UNIMUNITY', stayUpdatedSub:'Resevwa notifikasyon lè nouvo lang ak fonksyonalite ajoute', thankYouSubscribe:'✅ Mèsi! Ou sou lis la.', notifyMe:'Notifye m', addLanguageTitle:'➕ Ajoute lang ou', addLanguageSub:'Lang ou pa nan lis la? Di nou — n ap ajoute li!', addLanguagePlaceholder:'Pa egzanp: Fon, Twi, Soninke, Zarma...', submitLanguage:'Voye lang lan', cancelBtn:'Anile', languageSubmittedAlert:'✅ Mèsi! "{lang}" soumèt. Nou pral ajoute li byento!', enterLanguageNameAlert:'Tanpri antre non yon lang.', enterValidEmailAlert:'Tanpri antre yon imèl ki valid.' },
  es: { hero1:'La Forma Inteligente de Gestionar', hero2:'Tu Comunidad', cta:'Crear Cuenta Gratis', signin:'Iniciar Sesión', trusted:'CREADO PARA COMUNIDADES DE TODO EL MUNDO', sub:'Rastrea contribuciones, gestiona miembros, genera recibos e informes automáticamente.', auto:'MODO AUTO', expert:'MODO EXPERTO', startAuto:'Empezar en Modo Auto', startExpert:'Empezar en Modo Experto', modeTitle:'¿Cómo quieres usar UNIMUNITY?', modeSubtitle:'Elige la experiencia que se adapte a tu comunidad.', tagline:'TU COMUNIDAD. TU PODER.', trialBanner:'🎁 Prueba gratuita de 10 días · No se requiere tarjeta de crédito', chooseExperience:'ELIGE TU EXPERIENCIA', autoBadge:'100% AUTOMÁTICO — PARA TODOS', expertBadge:'CONTROL TOTAL — PARA ADMINISTRADORES', autoFeat1:'Recordatorios con un clic para miembros atrasados', autoFeat2:'Recibos generados automáticamente', autoFeat3:'Configuración de rotación flexible', autoFeat4:'Botones grandes - no requiere lectura', autoFeat5:'Funciona en 25 idiomas', expertFeat1:'Panel de análisis completo', expertFeat2:'Configuración y controles avanzados', expertFeat3:'Informes y exportaciones personalizados', expertFeat4:'Gestión completa de miembros', expertFeat5:'Acceso completo al registro de auditoría', communitiesHeading:'COMUNIDADES DE TODO EL MUNDO', communitiesSub:'Cada nación. Cada comunidad. Una sola plataforma.', statFreeTrial:'Prueba gratis', statLanguages:'Idiomas admitidos', statAutomatic:'Automático y seguro', statPlans:'Planes - Sin nivel gratuito', howItWorksTitle:'Cómo funciona', howItWorksSub:'3 pasos simples para empezar', step1Title:'Crea tu grupo', step1Desc:'Regístrate, elige tu modo e invita a tus miembros en minutos.', step2Title:'Registra las contribuciones', step2Desc:'Cada pago se confirma al instante y se genera un recibo automáticamente.', step3Title:'UNIMUNITY se encarga del resto', step3Desc:'Gestiona tu rotación, envía recordatorios con un clic y consulta tus informes automáticamente.', testimonialsTitle:'Lo que dicen nuestras comunidades', testimonialsSub:'Reseñas reales de organizadores y miembros reales de UNIMUNITY', testimonialsSubEmpty:'Comparte tu experiencia con UNIMUNITY', leaveTestimonial:'Dejar un testimonio', testimonialsCtaFallback:'¿Ya usas UNIMUNITY? Comparte tu experiencia con futuros organizadores.', roleOrganizer:'organizador', roleMember:'miembro', faqTitle:'Preguntas frecuentes', faqSub:'Todo lo que necesitas saber sobre UNIMUNITY', faq1q:'¿UNIMUNITY es gratis?', faq1a:'No - UNIMUNITY es una plataforma de pago. Hay una prueba gratuita de 10 días, luego los organizadores pagan una tarifa de acceso única de por vida de $24.99, más una suscripción desde $24.99/mes en 4 planes (Starter, Pro, Business, Enterprise). Algunos grupos también cobran una tarifa de acceso única de $9.99 a los miembros. No existe un plan gratuito para siempre.', faq2q:'¿Cuántos miembros puede tener un grupo?', faq2a:'Ilimitados. UNIMUNITY admite grupos de 2 a más de 10,000 miembros sin restricciones.', faq3q:'¿Mis datos están seguros?', faq3a:'Por supuesto. Cada grupo tiene un espacio completamente aislado y cifrado. Ningún grupo puede ver los datos de otro grupo.', faq4q:'¿Puedo usar UNIMUNITY en mi idioma?', faq4a:'¡Sí! UNIMUNITY admite 25 idiomas con detección automática. Se agregan más idiomas regularmente.', faq5q:'¿Necesito tener conocimientos tecnológicos?', faq5a:'No. El Modo Auto está diseñado para cualquier persona - botones grandes, todo automático, no requiere lectura.', stayUpdatedTitle:'Mantente al día con UNIMUNITY', stayUpdatedSub:'Recibe una notificación cuando se agreguen nuevos idiomas y funciones', thankYouSubscribe:'✅ ¡Gracias! Ya estás en la lista.', notifyMe:'Notificarme', addLanguageTitle:'➕ Agrega tu idioma', addLanguageSub:'¿Tu idioma no está en la lista? Dínoslo — ¡lo agregaremos!', addLanguagePlaceholder:'Ej: Fon, Twi, Soninke, Zarma...', submitLanguage:'Enviar idioma', cancelBtn:'Cancelar', languageSubmittedAlert:'✅ ¡Gracias! "{lang}" ha sido enviado. ¡Lo agregaremos pronto!', enterLanguageNameAlert:'Por favor, ingresa el nombre de un idioma.', enterValidEmailAlert:'Por favor, ingresa un correo electrónico válido.' },
  pt: { hero1:'A Forma Inteligente de Gerir', hero2:'Sua Comunidade', cta:'Criar Conta Grátis', signin:'Entrar', trusted:'CRIADO PARA COMUNIDADES EM TODO O MUNDO', sub:'Acompanhe contribuições, gerencie membros, gere recibos e relatórios automaticamente.', auto:'MODO AUTO', expert:'MODO ESPECIALISTA', startAuto:'Começar no Modo Auto', startExpert:'Começar no Modo Especialista', modeTitle:'Como você quer usar a UNIMUNITY?', modeSubtitle:'Escolha a experiência que combina com sua comunidade.', tagline:'SUA COMUNIDADE. SEU PODER.', trialBanner:'🎁 Teste grátis de 10 dias · Não é necessário cartão de crédito', chooseExperience:'ESCOLHA SUA EXPERIÊNCIA', autoBadge:'100% AUTOMÁTICO — PARA TODOS', expertBadge:'CONTROLE TOTAL — PARA ADMINISTRADORES', autoFeat1:'Lembretes com um clique para membros em atraso', autoFeat2:'Recibos gerados automaticamente', autoFeat3:'Configurações de rotação flexíveis', autoFeat4:'Botões grandes - sem necessidade de leitura', autoFeat5:'Funciona em 25 idiomas', expertFeat1:'Painel de análise completo', expertFeat2:'Configurações e controles avançados', expertFeat3:'Relatórios e exportações personalizados', expertFeat4:'Gestão completa de membros', expertFeat5:'Acesso completo ao registro de auditoria', communitiesHeading:'COMUNIDADES AO REDOR DO MUNDO', communitiesSub:'Cada nação. Cada comunidade. Uma única plataforma.', statFreeTrial:'Teste grátis', statLanguages:'Idiomas suportados', statAutomatic:'Automático e seguro', statPlans:'Planos - Sem versão gratuita', howItWorksTitle:'Como funciona', howItWorksSub:'3 passos simples para começar', step1Title:'Crie seu grupo', step1Desc:'Cadastre-se, escolha seu modo e convide seus membros em minutos.', step2Title:'Registre as contribuições', step2Desc:'Cada pagamento é confirmado instantaneamente e um recibo é gerado automaticamente.', step3Title:'A UNIMUNITY cuida do resto', step3Desc:'Gerencie sua rotação, envie lembretes com um clique e veja seus relatórios automaticamente.', testimonialsTitle:'O que nossas comunidades dizem', testimonialsSub:'Avaliações reais de organizadores e membros reais da UNIMUNITY', testimonialsSubEmpty:'Compartilhe sua experiência com a UNIMUNITY', leaveTestimonial:'Deixar um depoimento', testimonialsCtaFallback:'Você já usa a UNIMUNITY? Compartilhe sua experiência com futuros organizadores.', roleOrganizer:'organizador', roleMember:'membro', faqTitle:'Perguntas frequentes', faqSub:'Tudo o que você precisa saber sobre a UNIMUNITY', faq1q:'A UNIMUNITY é gratuita?', faq1a:'Não - a UNIMUNITY é uma plataforma paga. Há um teste gratuito de 10 dias, depois os organizadores pagam uma taxa de acesso vitalícia única de $24,99, mais uma assinatura a partir de $24,99/mês em 4 planos (Starter, Pro, Business, Enterprise). Alguns grupos também cobram uma taxa de acesso única de $9,99 dos membros. Não há um plano gratuito para sempre.', faq2q:'Quantos membros um grupo pode ter?', faq2a:'Ilimitado. A UNIMUNITY suporta grupos de 2 a mais de 10.000 membros sem restrições.', faq3q:'Meus dados estão seguros?', faq3a:'Com certeza. Cada grupo tem um espaço totalmente isolado e criptografado. Nenhum grupo pode ver os dados de outro grupo.', faq4q:'Posso usar a UNIMUNITY no meu idioma?', faq4a:'Sim! A UNIMUNITY suporta 25 idiomas com detecção automática. Mais idiomas são adicionados regularmente.', faq5q:'Preciso entender de tecnologia?', faq5a:'Não. O Modo Automático foi feito para qualquer pessoa - botões grandes, tudo automático, sem necessidade de leitura.', stayUpdatedTitle:'Fique por dentro da UNIMUNITY', stayUpdatedSub:'Seja notificado quando novos idiomas e recursos forem adicionados', thankYouSubscribe:'✅ Obrigado! Você está na lista.', notifyMe:'Notificar-me', addLanguageTitle:'➕ Adicione seu idioma', addLanguageSub:'Seu idioma não está na lista? Nos avise — vamos adicioná-lo!', addLanguagePlaceholder:'Ex: Fon, Twi, Soninke, Zarma...', submitLanguage:'Enviar idioma', cancelBtn:'Cancelar', languageSubmittedAlert:'✅ Obrigado! "{lang}" foi enviado. Vamos adicioná-lo em breve!', enterLanguageNameAlert:'Por favor, digite o nome de um idioma.', enterValidEmailAlert:'Por favor, digite um e-mail válido.' },
};
// Translation fallback rule: Manual -> Verified -> English -> key itself.
// Never expose broken/empty/mojibake text - always fall back to English first.
const t = (lang: string, key: string) => {
  const value = T[lang]?.[key];
  const isBroken = !value || value.includes('\ufffd') || value.trim().length === 0;
  if (!isBroken) return value;
  return T['en'][key] || key;
};

const MODULES = [
  {icon:'🤝',title:'Tontine / Sol',desc:'Cycles, rotation, receipts, organizer commission',tag:'V1 - PRIORITY'},
  {icon:'🏛️',title:'Association',desc:'Members, dues, events, votes, reports',tag:'V1'},
  {icon:'💼',title:'Investment',desc:'Projects, capital, returns, financial reports',tag:'V1'},
  {icon:'⛪',title:'Church',desc:'Tithes, offerings, projects, announcements',tag:'V1'},
  {icon:'🌾',title:'Agriculture',desc:'Cooperatives, harvests, group purchases',tag:'V2'},
  {icon:'🏥',title:'Health',desc:'Health mutuals, coverage, claims',tag:'V3'},
  {icon:'🏢',title:'Organization',desc:'Members, structure, governance, reports',tag:'V2'},
  {icon:'🤲',title:'Foundation',desc:'Donations, projects, impact reports, grants',tag:'V2'},
  {icon:'🏠',title:'Orphanage',desc:'Children records, sponsors, care plans, donations',tag:'V2'},
  {icon:'🎉',title:'Youth Club',desc:'Activities, members, events, fees',tag:'V3'},
  {icon:'🤝',title:'Cooperative',desc:'Shared resources, member shares, collective purchases',tag:'V2'},
  {icon:'🛒',title:'Commerce',desc:'Orders, inventory, group sales, vendor payouts',tag:'V3'},
];

const COMMUNITY_IMGS = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1611432579699-484f7990b127?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=700&h=400&fit=crop',
];

export default function HomePage() {
  const [lang, setLang]         = useState('en');
  const [customLang, setCustomLang] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [hoverCard, setHoverCard]   = useState<string|null>(null);
  const [hoverMode, setHoverMode]   = useState<string|null>(null);
  const [activeImg, setActiveImg]   = useState(0);
  const [mounted, setMounted]       = useState(false);
  const [openFaq, setOpenFaq]       = useState<number|null>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [email, setEmail]           = useState('');
  const [emailSent, setEmailSent]   = useState(false);
  const [testimonials, setTestimonials] = useState<{id:string; authorName:string; authorRole:string; rating:number; text:string}[]>([]);

  // These are recomputed on every render from the current `lang`, so every
  // section of the page - not just the hero - switches language together.
  const AUTO_FEATURES = [
    {icon:'🔔', key:t(lang,'autoFeat1')},
    {icon:'🧾', key:t(lang,'autoFeat2')},
    {icon:'🔄', key:t(lang,'autoFeat3')},
    {icon:'🔵', key:t(lang,'autoFeat4')},
    {icon:'🌍', key:t(lang,'autoFeat5')},
  ];
  const EXPERT_FEATURES = [
    {icon:'📊', key:t(lang,'expertFeat1')},
    {icon:'⚙️', key:t(lang,'expertFeat2')},
    {icon:'📋', key:t(lang,'expertFeat3')},
    {icon:'👥', key:t(lang,'expertFeat4')},
    {icon:'🔒', key:t(lang,'expertFeat5')},
  ];
  const STEPS = [
    {step:'1', icon:'📝', title:t(lang,'step1Title'), desc:t(lang,'step1Desc')},
    {step:'2', icon:'💰', title:t(lang,'step2Title'), desc:t(lang,'step2Desc')},
    {step:'3', icon:'🔄', title:t(lang,'step3Title'), desc:t(lang,'step3Desc')},
  ];
  const FAQ = [
    {q:t(lang,'faq1q'), a:t(lang,'faq1a')},
    {q:t(lang,'faq2q'), a:t(lang,'faq2a')},
    {q:t(lang,'faq3q'), a:t(lang,'faq3a')},
    {q:t(lang,'faq4q'), a:t(lang,'faq4a')},
    {q:t(lang,'faq5q'), a:t(lang,'faq5a')},
  ];
  const roleLabel = (role: string) => role === 'member' ? t(lang,'roleMember') : t(lang,'roleOrganizer');

  useEffect(()=>{
    setMounted(true);
    const ii = setInterval(()=>setActiveImg(p=>(p+1)%COMMUNITY_IMGS.length),4000);
    return()=>{clearInterval(ii);};
  },[]);

  useEffect(()=>{
    fetch('/api/public-testimonials')
      .then(r=>r.json())
      .then(data=>{ if (Array.isArray(data?.testimonials)) setTestimonials(data.testimonials); })
      .catch(()=>{ /* keep the fallback "leave a review" card - never break the home page */ });
  },[]);

  const handleLangChange = (val: string) => {
    if (val === 'other') {
      setShowCustom(true);
      setShowLangModal(true);
    } else {
      setLang(val);
      setShowCustom(false);
    }
  };

  const handleEmailSubmit = () => {
    if (!email || !email.includes('@')) { alert(t(lang,'enterValidEmailAlert')); return; }
    setEmailSent(true);
  };

  return (
    <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',flexDirection:'column'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes imgFade{0%{opacity:0;transform:scale(1)}15%{opacity:1}100%{opacity:1;transform:scale(1.12)}}
        .animate-fade{animation:fadeUp 0.8s ease forwards;}
        .floating{animation:float 3s ease-in-out infinite;}
        .tcard{animation:slideIn 0.5s ease forwards;}
        /* Continuous slow zoom (Ken Burns effect) for the full ~4.6s the image
           is shown - the interval below swaps to the next photo every 4000ms,
           so the zoom is still gently progressing (not yet finished) at the
           moment of the swap, which reads as smooth, ongoing motion rather
           than a static photo that abruptly fades in and then sits still -
           closer to what Rachele described as "like a video" than the old
           quick 0.8s fade-and-stop. Same photos, same swap logic, same click-
           to-advance and dots - only the motion during display changed. */
        .img-fade{animation:imgFade 4.6s ease-out forwards;}
        .btn-gold{transition:all 0.2s ease;}
        .btn-gold:hover{background:#c49a5a!important;transform:translateY(-2px);box-shadow:0 8px 24px rgba(233,199,123,0.4);}
        .btn-outline{transition:all 0.2s ease;}
        .btn-outline:hover{background:rgba(255,255,255,0.12)!important;transform:translateY(-2px);}
        .mode-card{transition:all 0.3s ease;cursor:pointer;}
        .mode-card:hover{transform:translateY(-8px);}
        .feature-row{transition:all 0.2s ease;}
        .feature-row:hover{background:#FBEEDD;padding-left:8px;border-radius:8px;}
        .logo-icon{transition:transform 0.3s ease;}
        .logo-icon:hover{transform:rotate(20deg);}
        .faq-item{transition:all 0.2s ease;}
        .faq-item:hover{background:#F3E9D6;}
        .nav-link{transition:all 0.2s ease;}
        .nav-link:hover{opacity:0.8;}
        select option{padding:8px;}
        @media (max-width: 640px) {
          .UNIMUNITY-hero { padding: 60px 20px 50px !important; }
          .UNIMUNITY-hero h1, .UNIMUNITY-hero h2 { font-size: 32px !important; }
          .UNIMUNITY-hero-deco { display: none !important; }
          .UNIMUNITY-hero p { font-size: 15px !important; }
        }
      `}</style>

      {showLangModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'white',borderRadius:'16px',padding:'32px',maxWidth:'400px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <h3 style={{color:'#6B2D4E',marginBottom:'8px',fontSize:'18px',fontWeight:'700'}}>{t(lang,'addLanguageTitle')}</h3>
            <p style={{color:'#6B2D4E',fontSize:'13px',marginBottom:'20px'}}>{t(lang,'addLanguageSub')}</p>
            <input type="text" placeholder={t(lang,'addLanguagePlaceholder')}
              value={customLang}
              onChange={e=>setCustomLang(e.target.value)}
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'14px',outline:'none',marginBottom:'16px',boxSizing:'border-box' as any}}/>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>{
                if(customLang.trim()){
                  alert(t(lang,'languageSubmittedAlert').replace('{lang}', customLang));
                  setShowLangModal(false); setCustomLang('');
                } else { alert(t(lang,'enterLanguageNameAlert')); }
              }} style={{flex:1,padding:'12px',background:'#6B2D4E',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
                {t(lang,'submitLanguage')}
              </button>
              <button onClick={()=>{setShowLangModal(false);setLang('en');}}
                style={{padding:'12px 16px',background:'#EAD9BE',border:'none',borderRadius:'8px',fontSize:'14px',color:'#6B2D4E',cursor:'pointer',fontWeight:'600'}}>
                {t(lang,'cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav style={{background:'#FBEEDD',padding:'14px 40px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 16px rgba(107,45,78,0.12)',borderBottom:'1px solid #D9C0CC'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div>
            <div style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'800',letterSpacing:'3px',display:'none'}}>UNIMUNITY</div><a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/unimunity-logo.png" alt="Unimunity" style={{height:'54px'}}/></a>
            <div style={{color:'#8B3A5E',fontSize:'12px',letterSpacing:'1.5px',fontWeight:700,fontStyle:'italic',marginTop:'4px'}}>{t(lang,'tagline')}</div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'6px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
            <select value={lang} onChange={e=>handleLangChange(e.target.value)}
              style={{padding:'7px 12px',borderRadius:'8px',border:'1.5px solid #D9C0CC',background:'white',color:'#6B2D4E',fontSize:'13px',cursor:'pointer',outline:'none',fontWeight:'500',maxWidth:'200px'}}>
              {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <a href="/login" className="nav-link" style={{padding:'9px 22px',border:'1.5px solid #6B2D4E',borderRadius:'8px',color:'#6B2D4E',textDecoration:'none',fontSize:'14px',fontWeight:'600'}}>
              {t(lang,'signin')}
            </a>
            <a href="/register" className="btn-gold" style={{padding:'9px 22px',background:'#6B2D4E',borderRadius:'8px',color:'#FBEEDD',textDecoration:'none',fontSize:'14px',fontWeight:'700',display:'inline-block'}}>
              {t(lang,'cta')}
            </a>
          </div>
          <DateTimeWeather textColor="#6B2D4E" fontSize="13px" bold={true} />
        </div>
      </nav>

      <div className="UNIMUNITY-hero" style={{background:'linear-gradient(160deg,#4A1F38 0%,#8B3A5E 50%,#3A1830 100%)',padding:'90px 32px 70px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div className="UNIMUNITY-hero-deco floating" style={{position:'absolute',top:'20px',left:'5%',opacity:0.10,fontSize:'80px',pointerEvents:'none'}}>{'🤝'}</div>
        <div className="UNIMUNITY-hero-deco floating" style={{position:'absolute',top:'30px',right:'6%',opacity:0.10,fontSize:'65px',pointerEvents:'none',animationDelay:'1s'}}>{'💰'}</div>
        <div className="UNIMUNITY-hero-deco floating" style={{position:'absolute',bottom:'30px',left:'8%',opacity:0.08,fontSize:'55px',pointerEvents:'none',animationDelay:'0.5s'}}>{'🌍'}</div>
        <div className="UNIMUNITY-hero-deco floating" style={{position:'absolute',bottom:'40px',right:'10%',opacity:0.08,fontSize:'50px',pointerEvents:'none',animationDelay:'1.5s'}}>{'⭐'}</div>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'inline-block',background:'rgba(233,199,123,0.15)',border:'1px solid rgba(233,199,123,0.3)',borderRadius:'20px',padding:'6px 18px',marginBottom:'24px'}}>
            <span style={{color:'#E9C77B',fontSize:'12px',fontWeight:'600',letterSpacing:'2px'}}>{'🌍'} {t(lang,'trusted')}</span>
          </div>
          <h1 style={{color:'#FBEEDD',fontSize:'52px',fontWeight:'800',marginBottom:'16px',lineHeight:'1.15'}}>{t(lang,'hero1')}</h1>
          <h2 style={{color:'#E9C77B',fontSize:'52px',fontWeight:'800',marginBottom:'28px',fontStyle:'italic',lineHeight:'1.15'}}>{t(lang,'hero2')}</h2>
          <p style={{color:'rgba(251,238,221,0.85)',fontSize:'18px',maxWidth:'580px',margin:'0 auto 44px',lineHeight:'1.8'}}>{t(lang,'sub')}</p>
          <div style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/register" className="btn-gold" style={{padding:'16px 40px',background:'#E9C77B',borderRadius:'12px',color:'#6B2D4E',textDecoration:'none',fontSize:'16px',fontWeight:'800',display:'inline-block',boxShadow:'0 4px 20px rgba(233,199,123,0.3)'}}>
              {t(lang,'cta')}
            </a>
            <a href="/login" className="btn-outline" style={{padding:'16px 40px',border:'2px solid rgba(251,238,221,0.4)',borderRadius:'12px',color:'#FBEEDD',textDecoration:'none',fontSize:'16px',display:'inline-block'}}>
              {t(lang,'signin')}
            </a>
          </div>
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',marginTop:'52px',flexWrap:'wrap',gap:'4px'}}>
            <span style={{color:'rgba(251,238,221,0.75)',fontSize:'13px',fontWeight:'500'}}>{t(lang,'trialBanner')}</span>
          </div>
        </div>
      </div>

      <div style={{background:'#FBEEDD',padding:'72px 32px',textAlign:'center'}}>
        <div style={{marginBottom:'16px'}}>
          <span style={{background:'#EAD9BE',color:'#6B2D4E',fontSize:'11px',fontWeight:'700',letterSpacing:'2px',padding:'6px 18px',borderRadius:'20px'}}>{t(lang,'chooseExperience')}</span>
        </div>
        <h3 style={{color:'#6B2D4E',fontSize:'34px',fontWeight:'800',marginBottom:'8px'}}>{t(lang,'modeTitle')}</h3>
        <p style={{color:'#6B2D4E',fontSize:'15px',marginBottom:'44px'}}>{t(lang,'modeSubtitle')}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'28px',maxWidth:'860px',margin:'0 auto'}}>

          <div className="mode-card"
            onMouseEnter={()=>setHoverMode('auto')}
            onMouseLeave={()=>setHoverMode(null)}
            style={{borderRadius:'20px',overflow:'hidden',boxShadow:hoverMode==='auto'?'0 20px 48px rgba(107,45,78,0.22)':'0 4px 20px rgba(107,45,78,0.08)',border:`2px solid ${hoverMode==='auto'?'#6B2D4E':'#EAD9BE'}`}}>
            <div style={{background:'linear-gradient(135deg,#6B2D4E,#8B3A5E)',padding:'32px 24px 24px',textAlign:'center'}}>
              <div style={{fontSize:'44px',marginBottom:'14px'}}>{'🤲'}</div>
              <div style={{color:'#E9C77B',fontSize:'22px',fontWeight:'800',letterSpacing:'2px'}}>{t(lang,'auto')}</div>
              <div style={{color:'#FBEEDD',fontSize:'11px',letterSpacing:'2px',marginTop:'6px',opacity:0.8}}>{t(lang,'autoBadge')}</div>
            </div>
            <div style={{padding:'24px',background:'white'}}>
              {AUTO_FEATURES.map((f,i)=>(
                <div key={i} className="feature-row" style={{display:'flex',alignItems:'center',gap:'14px',padding:'11px 8px',borderBottom:i<AUTO_FEATURES.length-1?'1px solid #F3E9D6':'none',transition:'all 0.2s'}}>
                  <span style={{fontSize:'20px'}}>{f.icon}</span>
                  <span style={{color:'#3A1830',fontSize:'14px',fontWeight:'500'}}>{f.key}</span>
                </div>
              ))}
              <a href="/register?mode=auto" style={{display:'block',marginTop:'28px',padding:'15px',background:'#6B2D4E',borderRadius:'12px',color:'#FBEEDD',textDecoration:'none',fontSize:'15px',fontWeight:'700',textAlign:'center',transition:'all 0.2s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#8B3A5E';(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='#6B2D4E';(e.currentTarget as HTMLElement).style.transform='translateY(0)';}}>
                {t(lang,'startAuto')}
              </a>
            </div>
          </div>

          <div className="mode-card"
            onMouseEnter={()=>setHoverMode('expert')}
            onMouseLeave={()=>setHoverMode(null)}
            style={{borderRadius:'20px',overflow:'hidden',boxShadow:hoverMode==='expert'?'0 20px 48px rgba(233,199,123,0.25)':'0 4px 20px rgba(0,0,0,0.15)',border:`2px solid ${hoverMode==='expert'?'#E9C77B':'#E8D5DF'}`}}>
            <div style={{background:'linear-gradient(135deg,#3A1830,#8B3A5E)',padding:'32px 24px 24px',textAlign:'center'}}>
              <div style={{fontSize:'44px',marginBottom:'14px'}}>{'⚡'}</div>
              <div style={{color:'#E9C77B',fontSize:'22px',fontWeight:'800',letterSpacing:'2px'}}>{t(lang,'expert')}</div>
              <div style={{color:'#FBEEDD',fontSize:'11px',letterSpacing:'2px',marginTop:'6px',opacity:0.8}}>{t(lang,'expertBadge')}</div>
            </div>
            <div style={{padding:'24px',background:'white'}}>
              {EXPERT_FEATURES.map((f,i)=>(
                <div key={i} className="feature-row" style={{display:'flex',alignItems:'center',gap:'14px',padding:'11px 8px',borderBottom:i<EXPERT_FEATURES.length-1?'1px solid rgba(233,199,123,0.12)':'none',transition:'all 0.2s'}}>
                  <span style={{fontSize:'20px'}}>{f.icon}</span>
                  <span style={{color:'#3A1830',fontSize:'14px',fontWeight:'500'}}>{f.key}</span>
                </div>
              ))}
              <a href="/register?mode=expert" style={{display:'block',marginTop:'28px',padding:'15px',background:'#E9C77B',borderRadius:'12px',color:'#6B2D4E',textDecoration:'none',fontSize:'15px',fontWeight:'700',textAlign:'center',transition:'all 0.2s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#c49a5a';(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='#E9C77B';(e.currentTarget as HTMLElement).style.transform='translateY(0)';}}>
                {t(lang,'startExpert')}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{background:'#4A1F38',padding:'56px 32px',textAlign:'center'}}>
        <h3 style={{color:'#E9C77B',fontSize:'20px',fontWeight:'700',marginBottom:'6px',letterSpacing:'2px'}}>{t(lang,'communitiesHeading')}</h3>
        <p style={{color:'#FBEEDD',fontSize:'13px',opacity:0.55,marginBottom:'28px',letterSpacing:'1px'}}>{t(lang,'communitiesSub')}</p>
        <div style={{maxWidth:'720px',margin:'0 auto',borderRadius:'20px',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.5)',position:'relative',cursor:'pointer'}}
          onClick={()=>setActiveImg(p=>(p+1)%COMMUNITY_IMGS.length)}>
          {mounted&&<img key={activeImg} src={COMMUNITY_IMGS[activeImg]} alt="community" className="img-fade"
            style={{width:'100%',height:'360px',objectFit:'cover',display:'block'}}/>}
          <div style={{position:'absolute',bottom:'20px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'8px',zIndex:2}}>
            {COMMUNITY_IMGS.map((_,i)=>(
              <div key={i} onClick={e=>{e.stopPropagation();setActiveImg(i);}}
                style={{width:i===activeImg?'28px':'8px',height:'8px',borderRadius:'4px',background:i===activeImg?'#E9C77B':'rgba(255,255,255,0.4)',cursor:'pointer',transition:'all 0.3s ease'}}></div>
            ))}
          </div>
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'linear-gradient(to top,rgba(44,16,32,0.65) 0%,transparent 55%)',pointerEvents:'none'}}></div>
          <div style={{position:'absolute',top:'50%',right:'16px',transform:'translateY(-50%)',background:'rgba(0,0,0,0.4)',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'18px',cursor:'pointer',zIndex:2}}>{'›'}</div>
        </div>
      </div>

      <div style={{background:'#EAD9BE',padding:'44px 32px'}}>
        <div style={{display:'flex',justifyContent:'center',gap:'64px',flexWrap:'wrap'}}>
          {[['10-Day',t(lang,'statFreeTrial')],['25',t(lang,'statLanguages')],['100%',t(lang,'statAutomatic')],['4',t(lang,'statPlans')]].map(([v,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:'38px',fontWeight:'800',color:'#6B2D4E'}}>{v}</div>
              <div style={{fontSize:'13px',color:'#6B2D4E',marginTop:'6px',fontWeight:'500'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'#FBEEDD',padding:'64px 32px',textAlign:'center'}}>
        <h3 style={{color:'#6B2D4E',fontSize:'30px',fontWeight:'800',marginBottom:'8px'}}>{t(lang,'howItWorksTitle')}</h3>
        <p style={{color:'#6B2D4E',marginBottom:'44px',fontSize:'15px'}}>{t(lang,'howItWorksSub')}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'24px',maxWidth:'800px',margin:'0 auto'}}>
          {STEPS.map(s=>(
            <div key={s.step} style={{background:'white',border:'1px solid #EAD9BE',borderRadius:'16px',padding:'28px 20px',textAlign:'center'}}>
              <div style={{width:'48px',height:'48px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',color:'#E9C77B',fontWeight:'800',fontSize:'18px'}}>{s.step}</div>
              <div style={{fontSize:'32px',marginBottom:'12px'}}>{s.icon}</div>
              <div style={{fontWeight:'700',color:'#4A1F38',fontSize:'16px',marginBottom:'8px'}}>{s.title}</div>
              <div style={{fontSize:'13px',color:'#6B2D4E',lineHeight:'1.6'}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'linear-gradient(160deg,#4A1F38 0%,#8B3A5E 50%,#3A1830 100%)',padding:'64px 32px',textAlign:'center'}}>
        <h3 style={{color:'#FBEEDD',fontSize:'30px',fontWeight:'800',marginBottom:'8px'}}>{t(lang,'testimonialsTitle')}</h3>
        {/* Only claim "real reviews" once at least one real testimonial is
            actually loaded below - otherwise (the common case today, before
            any have been submitted) this showed a "real reviews" subtitle
            over a section that was really just a "leave a review" prompt.
            testimonialsSubEmpty is the honest version for that state. */}
        <p style={{color:'rgba(251,238,221,0.6)',marginBottom:'32px',fontSize:'14px'}}>{testimonials.length > 0 ? t(lang,'testimonialsSub') : t(lang,'testimonialsSubEmpty')}</p>

        {testimonials.length > 0 ? (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'20px',maxWidth:'980px',margin:'0 auto 28px'}}>
              {testimonials.slice(0,6).map(rev=>(
                <div key={rev.id} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(233,199,123,0.3)',borderRadius:'16px',padding:'24px',textAlign:'left'}}>
                  <div style={{color:'#E9C77B',fontSize:'14px',marginBottom:'10px'}}>{'★'.repeat(Math.max(1,Math.min(5,rev.rating)))}{'☆'.repeat(5-Math.max(1,Math.min(5,rev.rating)))}</div>
                  <p style={{color:'#FBEEDD',fontSize:'13.5px',lineHeight:'1.7',marginBottom:'16px'}}>{'“'}{rev.text}{'”'}</p>
                  <div style={{color:'#E9C77B',fontSize:'13px',fontWeight:'700'}}>{rev.authorName}</div>
                  <div style={{color:'rgba(251,238,221,0.5)',fontSize:'11px',textTransform:'capitalize'}}>{roleLabel(rev.authorRole)}</div>
                </div>
              ))}
            </div>
            <a href="/leave-review" style={{display:'inline-block',padding:'12px 28px',background:'#E9C77B',color:'#6B2D4E',borderRadius:'10px',fontSize:'14px',fontWeight:'800',textDecoration:'none'}}>
              {t(lang,'leaveTestimonial')}
            </a>
          </>
        ) : (
          <div style={{maxWidth:'480px',margin:'0 auto',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(233,199,123,0.3)',borderRadius:'18px',padding:'36px'}}>
            <div style={{fontSize:'30px',marginBottom:'10px'}}>{'💬'}</div>
            <p style={{color:'#FBEEDD',fontSize:'14px',marginBottom:'20px',lineHeight:'1.6'}}>{t(lang,'testimonialsCtaFallback')}</p>
            <a href="/leave-review" style={{display:'inline-block',padding:'12px 28px',background:'#E9C77B',color:'#6B2D4E',borderRadius:'10px',fontSize:'14px',fontWeight:'800',textDecoration:'none'}}>
              {t(lang,'leaveTestimonial')}
            </a>
          </div>
        )}
      </div>

      <div style={{background:'#FBEEDD',padding:'64px 32px'}}>
        <h3 style={{color:'#6B2D4E',fontSize:'30px',fontWeight:'800',marginBottom:'8px',textAlign:'center'}}>{t(lang,'faqTitle')}</h3>
        <p style={{color:'#6B2D4E',marginBottom:'44px',textAlign:'center',fontSize:'15px'}}>{t(lang,'faqSub')}</p>
        <div style={{maxWidth:'700px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'8px'}}>
          {FAQ.map((f,i)=>(
            <div key={i} className="faq-item" style={{border:'1px solid #EAD9BE',borderRadius:'12px',overflow:'hidden',background:'white'}}>
              <div onClick={()=>setOpenFaq(openFaq===i?null:i)}
                style={{padding:'18px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                <span style={{fontWeight:'600',color:'#4A1F38',fontSize:'15px'}}>{f.q}</span>
                <span style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'700',lineHeight:'1'}}>{openFaq===i?'−':'+'}</span>
              </div>
              {openFaq===i&&(
                <div style={{padding:'0 20px 18px',fontSize:'14px',color:'#6B2D4E',lineHeight:'1.7',borderTop:'1px solid #F3E9D6'}}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'#6B2D4E',padding:'56px 32px',textAlign:'center'}}>
        <h3 style={{color:'#FBEEDD',fontSize:'26px',fontWeight:'800',marginBottom:'8px'}}>{t(lang,'stayUpdatedTitle')}</h3>
        <p style={{color:'rgba(251,238,221,0.65)',marginBottom:'28px',fontSize:'14px'}}>{t(lang,'stayUpdatedSub')}</p>
        {emailSent ? (
          <div style={{background:'rgba(74,124,89,0.3)',border:'1px solid rgba(74,124,89,0.5)',borderRadius:'12px',padding:'16px 24px',display:'inline-block',color:'#90EE90',fontWeight:'600'}}>
            {t(lang,'thankYouSubscribe')}
          </div>
        ) : (
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',maxWidth:'480px',margin:'0 auto'}}>
            <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)}
              style={{flex:1,minWidth:'200px',padding:'12px 16px',borderRadius:'10px',border:'none',fontSize:'14px',outline:'none'}}/>
            <button onClick={handleEmailSubmit}
              style={{padding:'12px 24px',background:'#E9C77B',border:'none',borderRadius:'10px',color:'#6B2D4E',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
              {t(lang,'notifyMe')}
            </button>
          </div>
        )}
      </div>

      <Footer onLanguageClick={() => setShowLangModal(true)} />
    </div>
  );
}
