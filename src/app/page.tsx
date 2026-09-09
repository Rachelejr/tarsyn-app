'use client';
import { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import DateTimeWeather from '@/components/DateTimeWeather';

// ============ 25 LANGUES + OTHER ============
const LANGUAGES = [
  { code: 'en',    label: '\ud83c\uddfa\ud83c\uddf8 English'           },
  { code: 'fr',    label: '\ud83c\uddeb\ud83c\uddf7 Fran\u00e7ais'           },
  { code: 'ht',    label: '\ud83c\udded\ud83c\uddf9 Krey\u00f2l ayisyen'     },
  { code: 'kac',   label: '\ud83c\udde6\ud83c\uddec Krey\u00f2l Antiy\u00e8'      },
  { code: 'es',    label: '\ud83c\uddea\ud83c\uddf8 Espa\u00f1ol'            },
  { code: 'pt',    label: '\ud83c\udde7\ud83c\uddf7 Portugu\u00eas'          },
  { code: 'ar',    label: '\ud83c\uddf2\ud83c\udde6 \u0627\u0644\u0639\u0631\u0628\u064a\u0629'            },
  { code: 'wo',    label: '\ud83c\uddf8\ud83c\uddf3 Wolof'              },
  { code: 'bm',    label: '\ud83c\uddf2\ud83c\uddf1 Bambara'            },
  { code: 'ln',    label: '\ud83c\udde8\ud83c\udde9 Lingala'            },
  { code: 'sw',    label: '\ud83c\uddf0\ud83c\uddea Kiswahili'          },
  { code: 'yo',    label: '\ud83c\uddf3\ud83c\uddec Yor\u00f9b\u00e1'             },
  { code: 'ig',    label: '\ud83c\uddf3\ud83c\uddec Igbo'               },
  { code: 'ha',    label: '\ud83c\uddf3\ud83c\uddec Hausa'              },
  { code: 'am',    label: '\ud83c\uddea\ud83c\uddf9 Amharique'          },
  { code: 'so',    label: '\ud83c\uddf8\ud83c\uddf4 Somali'             },
  { code: 'mg',    label: '\ud83c\uddf2\ud83c\uddec Malagasy'           },
  { code: 'rw',    label: '\ud83c\uddf7\ud83c\uddfc Kinyarwanda'        },
  { code: 'hi',    label: '\ud83c\uddee\ud83c\uddf3 \u0939\u093f\u0928\u094d\u0926\u0940 (Hindi)'    },
  { code: 'tl',    label: '\ud83c\uddf5\ud83c\udded Filipino'           },
  { code: 'id',    label: '\ud83c\uddee\ud83c\udde9 Bahasa Indonesia'   },
  { code: 'vi',    label: '\ud83c\uddfb\ud83c\uddf3 Ti\u1ebfng Vi\u1ec7t'        },
  { code: 'nl',    label: '\ud83c\uddf3\ud83c\uddf1 Nederlands'         },
  { code: 'de',    label: '\ud83c\udde9\ud83c\uddea Deutsch'            },
  { code: 'it',    label: '\ud83c\uddee\ud83c\uddf9 Italiano'           },
  { code: 'other', label: '\u2795 Other / Autre'        },
];

const T: Record<string, Record<string, string>> = {
  en: { hero1:'The Smart Way to Manage', hero2:'Your Community', cta:'Create Free Account', signin:'Sign In', trusted:'BUILT FOR COMMUNITIES WORLDWIDE', sub:'Track contributions, manage members, organize your activities, and view your reports automatically.', auto:'AUTO MODE', expert:'EXPERT MODE', startAuto:'Start with Auto Mode', startExpert:'Start with Expert Mode', modeTitle:'How do you want to use UNIMUNITY?', modeSubtitle:'Choose the experience that fits your community.', tagline:'YOUR COMMUNITY. YOUR POWER.', trialBanner:'\ud83c\udf81 7-day free trial \u00b7 No credit card required', chooseExperience:'CHOOSE YOUR EXPERIENCE', autoBadge:'100% AUTOMATIC \u2014 FOR EVERYONE', expertBadge:'FULL CONTROL \u2014 FOR ADMINS', autoFeat1:'Automatic reminders sent for you', autoFeat2:'Receipts generated automatically', autoFeat3:'Rotation calculated by UNIMUNITY', autoFeat4:'Big buttons - no reading required', autoFeat5:'Works in 25 languages', expertFeat1:'Full analytics dashboard', expertFeat2:'Advanced settings and controls', expertFeat3:'Custom reports and exports', expertFeat4:'Complete member management', expertFeat5:'Full audit trail access', communitiesHeading:'COMMUNITIES AROUND THE WORLD', communitiesSub:'Every nation. Every community. One platform.', statFreeTrial:'Free Trial', statLanguages:'Languages Supported', statAutomatic:'Automatic & Secure', statPlans:'Plans - No Free Tier', howItWorksTitle:'How it works', howItWorksSub:'3 simple steps to get started', step1Title:'Create your group', step1Desc:'Sign up, choose your mode and invite your members in minutes.', step2Title:'Record contributions', step2Desc:'Each payment is confirmed instantly and a receipt is generated automatically.', step3Title:'UNIMUNITY handles the rest', step3Desc:'Rotation, reminders, reports - all automatic. You focus on your community.', testimonialsTitle:'What our communities say', testimonialsSub:'Real reviews from real UNIMUNITY organizers and members', leaveTestimonial:'Leave a Testimonial', testimonialsCtaFallback:'Are you already using UNIMUNITY? Share your experience with future organizers.', roleOrganizer:'organizer', roleMember:'member', faqTitle:'Frequently Asked Questions', faqSub:'Everything you need to know about UNIMUNITY', faq1q:'Is UNIMUNITY free?', faq1a:'No - UNIMUNITY is a paid platform. There is a 7-day free trial, then organizers pay a one-time $24.99 lifetime access fee, plus a subscription plan starting at $24.99/month across 4 tiers (Starter, Pro, Business, Enterprise). Some groups also charge a one-time $9.99 member access fee. There is no free-forever plan.', faq2q:'How many members can a group have?', faq2a:'Unlimited. UNIMUNITY supports groups of 2 to 10,000+ members with no restrictions.', faq3q:'Is my data secure?', faq3a:'Absolutely. Each group has a completely isolated, encrypted space. No group can ever see another group\\'s data.', faq4q:'Can I use UNIMUNITY in my language?', faq4a:'Yes! UNIMUNITY supports 25 languages with auto-detection. More languages are added regularly.', faq5q:'Do I need to be tech-savvy?', faq5a:'No. Auto Mode is designed for anyone - big buttons, automatic everything, no reading required.', stayUpdatedTitle:'Stay updated with UNIMUNITY', stayUpdatedSub:'Get notified when new languages and features are added', thankYouSubscribe:'\u2705 Thank you! You\\'re on the list.', notifyMe:'Notify Me', addLanguageTitle:'\u2795 Add Your Language', addLanguageSub:'Your language isn\\'t in the list? Tell us \u2014 we\\'ll add it!', addLanguagePlaceholder:'Ex: Fon, Twi, Soninke, Zarma...', submitLanguage:'Submit Language', cancelBtn:'Cancel', languageSubmittedAlert:'\u2705 Thank you! "{lang}" has been submitted. We will add it soon!', enterLanguageNameAlert:'Please enter a language name.', enterValidEmailAlert:'Please enter a valid email.' },
  fr: { hero1:'La fa\u00e7on intelligente de g\u00e9rer', hero2:'votre communaut\u00e9', cta:'Cr\u00e9er un compte gratuit', signin:'Se connecter', trusted:'CON\u00c7U POUR LES COMMUNAUT\u00c9S DU MONDE ENTIER', sub:'Suivez les contributions, g\u00e9rez les membres, organisez vos activit\u00e9s et consultez vos rapports automatiquement.', auto:'MODE AUTO', expert:'MODE EXPERT', startAuto:'Commencer en mode auto', startExpert:'Commencer en mode expert', modeTitle:'Comment souhaitez-vous utiliser UNIMUNITY ?', modeSubtitle:'Choisissez l\u2019exp\u00e9rience adapt\u00e9e \u00e0 votre communaut\u00e9.', tagline:'VOTRE COMMUNAUT\u00c9. VOTRE POUVOIR.', trialBanner:'\ud83c\udf81 Essai gratuit de 7 jours \u00b7 Aucune carte de cr\u00e9dit requise', chooseExperience:'CHOISISSEZ VOTRE EXP\u00c9RIENCE', autoBadge:'100% AUTOMATIQUE \u2014 POUR TOUS', expertBadge:'CONTR\u00d4LE TOTAL \u2014 POUR LES ADMINS', autoFeat1:'Rappels automatiques envoy\u00e9s pour vous', autoFeat2:'Re\u00e7us g\u00e9n\u00e9r\u00e9s automatiquement', autoFeat3:'Rotation calcul\u00e9e par UNIMUNITY', autoFeat4:'Gros boutons - aucune lecture requise', autoFeat5:'Fonctionne en 25 langues', expertFeat1:'Tableau de bord analytique complet', expertFeat2:'Param\u00e8tres et contr\u00f4les avanc\u00e9s', expertFeat3:'Rapports et exports personnalis\u00e9s', expertFeat4:'Gestion compl\u00e8te des membres', expertFeat5:'Acc\u00e8s complet au journal d\u2019audit', communitiesHeading:'DES COMMUNAUT\u00c9S PARTOUT DANS LE MONDE', communitiesSub:'Chaque nation. Chaque communaut\u00e9. Une seule plateforme.', statFreeTrial:'Essai gratuit', statLanguages:'Langues prises en charge', statAutomatic:'Automatique et s\u00e9curis\u00e9', statPlans:'Formules - Pas de version gratuite', howItWorksTitle:'Comment \u00e7a marche', howItWorksSub:'3 \u00e9tapes simples pour commencer', step1Title:'Cr\u00e9ez votre groupe', step1Desc:'Inscrivez-vous, choisissez votre mode et invitez vos membres en quelques minutes.', step2Title:'Enregistrez les contributions', step2Desc:'Chaque paiement est confirm\u00e9 instantan\u00e9ment et un re\u00e7u est g\u00e9n\u00e9r\u00e9 automatiquement.', step3Title:'UNIMUNITY s\u2019occupe du reste', step3Desc:'Rotation, rappels, rapports - tout est automatique. Concentrez-vous sur votre communaut\u00e9.', testimonialsTitle:'Ce que disent nos communaut\u00e9s', testimonialsSub:'De vrais avis de vrais organisateurs et membres UNIMUNITY', leaveTestimonial:'Laisser un t\u00e9moignage', testimonialsCtaFallback:'Vous utilisez d\u00e9j\u00e0 UNIMUNITY ? Partagez votre exp\u00e9rience avec les futurs organisateurs.', roleOrganizer:'organisateur', roleMember:'membre', faqTitle:'Questions fr\u00e9quentes', faqSub:'Tout ce que vous devez savoir sur UNIMUNITY', faq1q:'UNIMUNITY est-il gratuit ?', faq1a:'Non - UNIMUNITY est une plateforme payante. Il y a un essai gratuit de 7 jours, puis les organisateurs paient des frais d\u2019acc\u00e8s \u00e0 vie de 24,99 $, plus un abonnement \u00e0 partir de 24,99 $/mois r\u00e9parti en 4 formules (Starter, Pro, Business, Enterprise). Certains groupes demandent aussi des frais d\u2019acc\u00e8s uniques de 9,99 $ aux membres. Il n\u2019y a pas de formule gratuite \u00e0 vie.', faq2q:'Combien de membres un groupe peut-il avoir ?', faq2a:'Illimit\u00e9. UNIMUNITY prend en charge des groupes de 2 \u00e0 plus de 10 000 membres, sans restriction.', faq3q:'Mes donn\u00e9es sont-elles s\u00e9curis\u00e9es ?', faq3a:'Absolument. Chaque groupe dispose d\u2019un espace enti\u00e8rement isol\u00e9 et chiffr\u00e9. Aucun groupe ne peut jamais voir les donn\u00e9es d\u2019un autre groupe.', faq4q:'Puis-je utiliser UNIMUNITY dans ma langue ?', faq4a:'Oui ! UNIMUNITY prend en charge 25 langues avec d\u00e9tection automatique. D\u2019autres langues sont ajout\u00e9es r\u00e9guli\u00e8rement.', faq5q:'Dois-je \u00eatre \u00e0 l\u2019aise avec la technologie ?', faq5a:'Non. Le Mode Auto est con\u00e7u pour tout le monde - grands boutons, tout est automatique, aucune lecture requise.', stayUpdatedTitle:'Restez inform\u00e9 avec UNIMUNITY', stayUpdatedSub:'Soyez notifi\u00e9 lorsque de nouvelles langues et fonctionnalit\u00e9s sont ajout\u00e9es', thankYouSubscribe:'\u2705 Merci ! Vous \u00eates sur la liste.', notifyMe:'M\u2019avertir', addLanguageTitle:'\u2795 Ajoutez votre langue', addLanguageSub:'Votre langue n\u2019est pas dans la liste ? Dites-le-nous \u2014 nous l\u2019ajouterons !', addLanguagePlaceholder:'Ex : Fon, Twi, Soninke, Zarma...', submitLanguage:'Envoyer la langue', cancelBtn:'Annuler', languageSubmittedAlert:'\u2705 Merci ! \u00ab {lang} \u00bb a \u00e9t\u00e9 soumis. Nous l\u2019ajouterons bient\u00f4t !', enterLanguageNameAlert:'Veuillez entrer un nom de langue.', enterValidEmailAlert:'Veuillez entrer un email valide.' },
  ht: { hero1:'Fason Entelijan pou Jere', hero2:'Kominote Ou', cta:'Kreye Kont Gratis', signin:'Konekte', trusted:'F\u00c8T POU KOMINOTE TOUT KOTE SOU LAT\u00c8', sub:'Swiv kontribisyon, jere manm, jenere resi ak rap\u00f2 otomatikman.', auto:'MOD OTOMATIK', expert:'MOD EKSP\u00c8', startAuto:'K\u00f2manse ak Mod Otomatik', startExpert:'K\u00f2manse ak Mod Ekspr\u00e8', modeTitle:'Kijan ou vle itilize UNIMUNITY?', modeSubtitle:'Chwazi eksperyans ki adapte pou kominote w.', tagline:'KOMINOTE OU. PISANS OU.', trialBanner:'\ud83c\udf81 Es\u00e8 gratis 7 jou \u00b7 Pa gen kat kredi obligatwa', chooseExperience:'CHWAZI ESPERYANS OU', autoBadge:'100% OTOMATIK \u2014 POU TOUT MOUN', expertBadge:'KONTW\u00d2L TOTAL \u2014 POU ADMIN YO', autoFeat1:'Rap\u00e8l otomatik voye pou ou', autoFeat2:'Resi jenere otomatikman', autoFeat3:'Wotasyon kalkile pa UNIMUNITY', autoFeat4:'Gwo bouton - ou pa bezwen li anyen', autoFeat5:'Fonksyone nan 25 lang', expertFeat1:'Tablo b\u00f2 analitik konpl\u00e8', expertFeat2:'Anviw\u00f2nman ak kontw\u00f2l avanse', expertFeat3:'Rap\u00f2 ak eksp\u00f2te p\u00e8sonalize', expertFeat4:'Jesyon konpl\u00e8 manm yo', expertFeat5:'Aks\u00e8 konpl\u00e8 nan istorik odit', communitiesHeading:'KOMINOTE TOUT KOTE SOU LAT\u00c8', communitiesSub:'Chak nasyon. Chak kominote. Yon s\u00e8l platf\u00f2m.', statFreeTrial:'Es\u00e8 gratis', statLanguages:'Lang sip\u00f2te', statAutomatic:'Otomatik ak an sekirite', statPlans:'Plan - Pa gen v\u00e8syon gratis', howItWorksTitle:'Kijan sa fonksyone', howItWorksSub:'3 etap senp pou k\u00f2manse', step1Title:'Kreye gwoup ou', step1Desc:'Enskri, chwazi mod ou epi envite manm ou yo nan k\u00e8k minit.', step2Title:'Anrejistre kontribisyon yo', step2Desc:'Chak peman konfime imedyatman e yon resi jenere otomatikman.', step3Title:'UNIMUNITY okipe r\u00e8s la', step3Desc:'Wotasyon, rap\u00e8l, rap\u00f2 - tout bagay otomatik. Ou konsantre w sou kominote w.', testimonialsTitle:'Sa kominote nou yo di', testimonialsSub:'Vr\u00e8 k\u00f2mant\u00e8 ki soti nan vr\u00e8 \u00f2ganizat\u00e8 ak manm UNIMUNITY', leaveTestimonial:'Kite yon temwayaj', testimonialsCtaFallback:'Ou deja ap itilize UNIMUNITY? Pataje eksperyans ou ak fiti \u00f2ganizat\u00e8 yo.', roleOrganizer:'\u00f2ganizat\u00e8', roleMember:'manm', faqTitle:'Kesyon Moun Poze Souvan', faqSub:'Tout sa ou bezwen konnen sou UNIMUNITY', faq1q:'\u00c8ske UNIMUNITY gratis?', faq1a:'Non - UNIMUNITY se yon platf\u00f2m peyan. Gen yon es\u00e8 gratis 7 jou, epi apre sa \u00f2ganizat\u00e8 yo peye yon fr\u00e8 aks\u00e8 yon s\u00e8l fwa pou tout tan ki koute $24.99, plis yon ab\u00f2nman ki k\u00f2manse a $24.99/mwa nan 4 nivo (Starter, Pro, Business, Enterprise). K\u00e8k gwoup mande tou yon fr\u00e8 aks\u00e8 manm yon s\u00e8l fwa ki koute $9.99. Pa gen okenn plan gratis pou tout tan.', faq2q:'Konbyen manm yon gwoup ka genyen?', faq2a:'San limit. UNIMUNITY sip\u00f2te gwoup ki gen ant 2 rive plis pase 10,000 manm san restriksyon.', faq3q:'\u00c8ske done mwen yo an sekirite?', faq3a:'Wi, san dout. Chak gwoup gen yon espas totalman izole ak kripte. Yon gwoup pa janm ka w\u00e8 done yon l\u00f2t gwoup.', faq4q:'\u00c8ske mwen ka itilize UNIMUNITY nan lang mwen?', faq4a:'Wi! UNIMUNITY sip\u00f2te 25 lang ak deteksyon otomatik. Gen plis lang k ap ajoute regily\u00e8man.', faq5q:'\u00c8ske f\u00f2k mwen konn itilize teknoloji byen?', faq5a:'Non. Mod Otomatik f\u00e8t pou tout moun - gwo bouton, tout bagay otomatik, ou pa bezwen li anyen.', stayUpdatedTitle:'Rete enf\u00f2me ak UNIMUNITY', stayUpdatedSub:'Resevwa notifikasyon l\u00e8 nouvo lang ak fonksyonalite ajoute', thankYouSubscribe:'\u2705 M\u00e8si! Ou sou lis la.', notifyMe:'Notifye m', addLanguageTitle:'\u2795 Ajoute lang ou', addLanguageSub:'Lang ou pa nan lis la? Di nou \u2014 n ap ajoute li!', addLanguagePlaceholder:'Pa egzanp: Fon, Twi, Soninke, Zarma...', submitLanguage:'Voye lang lan', cancelBtn:'Anile', languageSubmittedAlert:'\u2705 M\u00e8si! "{lang}" soum\u00e8t. Nou pral ajoute li byento!', enterLanguageNameAlert:'Tanpri antre non yon lang.', enterValidEmailAlert:'Tanpri antre yon im\u00e8l ki valid.' },
  es: { hero1:'La Forma Inteligente de Gestionar', hero2:'Tu Comunidad', cta:'Crear Cuenta Gratis', signin:'Iniciar Sesi\u00f3n', trusted:'CREADO PARA COMUNIDADES DE TODO EL MUNDO', sub:'Rastrea contribuciones, gestiona miembros, genera recibos e informes autom\u00e1ticamente.', auto:'MODO AUTO', expert:'MODO EXPERTO', startAuto:'Empezar en Modo Auto', startExpert:'Empezar en Modo Experto', modeTitle:'\u00bfC\u00f3mo quieres usar UNIMUNITY?', modeSubtitle:'Elige la experiencia que se adapte a tu comunidad.', tagline:'TU COMUNIDAD. TU PODER.', trialBanner:'\ud83c\udf81 Prueba gratuita de 7 d\u00edas \u00b7 No se requiere tarjeta de cr\u00e9dito', chooseExperience:'ELIGE TU EXPERIENCIA', autoBadge:'100% AUTOM\u00c1TICO \u2014 PARA TODOS', expertBadge:'CONTROL TOTAL \u2014 PARA ADMINISTRADORES', autoFeat1:'Recordatorios autom\u00e1ticos enviados por ti', autoFeat2:'Recibos generados autom\u00e1ticamente', autoFeat3:'Rotaci\u00f3n calculada por UNIMUNITY', autoFeat4:'Botones grandes - no requiere lectura', autoFeat5:'Funciona en 25 idiomas', expertFeat1:'Panel de an\u00e1lisis completo', expertFeat2:'Configuraci\u00f3n y controles avanzados', expertFeat3:'Informes y exportaciones personalizados', expertFeat4:'Gesti\u00f3n completa de miembros', expertFeat5:'Acceso completo al registro de auditor\u00eda', communitiesHeading:'COMUNIDADES DE TODO EL MUNDO', communitiesSub:'Cada naci\u00f3n. Cada comunidad. Una sola plataforma.', statFreeTrial:'Prueba gratis', statLanguages:'Idiomas admitidos', statAutomatic:'Autom\u00e1tico y seguro', statPlans:'Planes - Sin nivel gratuito', howItWorksTitle:'C\u00f3mo funciona', howItWorksSub:'3 pasos simples para empezar', step1Title:'Crea tu grupo', step1Desc:'Reg\u00edstrate, elige tu modo e invita a tus miembros en minutos.', step2Title:'Registra las contribuciones', step2Desc:'Cada pago se confirma al instante y se genera un recibo autom\u00e1ticamente.', step3Title:'UNIMUNITY se encarga del resto', step3Desc:'Rotaci\u00f3n, recordatorios, informes - todo autom\u00e1tico. T\u00fa te enfocas en tu comunidad.', testimonialsTitle:'Lo que dicen nuestras comunidades', testimonialsSub:'Rese\u00f1as reales de organizadores y miembros reales de UNIMUNITY', leaveTestimonial:'Dejar un testimonio', testimonialsCtaFallback:'\u00bfYa usas UNIMUNITY? Comparte tu experiencia con futuros organizadores.', roleOrganizer:'organizador', roleMember:'miembro', faqTitle:'Preguntas frecuentes', faqSub:'Todo lo que necesitas saber sobre UNIMUNITY', faq1q:'\u00bfUNIMUNITY es gratis?', faq1a:'No - UNIMUNITY es una plataforma de pago. Hay una prueba gratuita de 7 d\u00edas, luego los organizadores pagan una tarifa de acceso \u00fanica de por vida de $24.99, m\u00e1s una suscripci\u00f3n desde $24.99/mes en 4 planes (Starter, Pro, Business, Enterprise). Algunos grupos tambi\u00e9n cobran una tarifa de acceso \u00fanica de $9.99 a los miembros. No existe un plan gratuito para siempre.', faq2q:'\u00bfCu\u00e1ntos miembros puede tener un grupo?', faq2a:'Ilimitados. UNIMUNITY admite grupos de 2 a m\u00e1s de 10,000 miembros sin restricciones.', faq3q:'\u00bfMis datos est\u00e1n seguros?', faq3a:'Por supuesto. Cada grupo tiene un espacio completamente aislado y cifrado. Ning\u00fan grupo puede ver los datos de otro grupo.', faq4q:'\u00bfPuedo usar UNIMUNITY en mi idioma?', faq4a:'\u00a1S\u00ed! UNIMUNITY admite 25 idiomas con detecci\u00f3n autom\u00e1tica. Se agregan m\u00e1s idiomas regularmente.', faq5q:'\u00bfNecesito tener conocimientos tecnol\u00f3gicos?', faq5a:'No. El Modo Auto est\u00e1 dise\u00f1ado para cualquier persona - botones grandes, todo autom\u00e1tico, no requiere lectura.', stayUpdatedTitle:'Mantente al d\u00eda con UNIMUNITY', stayUpdatedSub:'Recibe una notificaci\u00f3n cuando se agreguen nuevos idiomas y funciones', thankYouSubscribe:'\u2705 \u00a1Gracias! Ya est\u00e1s en la lista.', notifyMe:'Notificarme', addLanguageTitle:'\u2795 Agrega tu idioma', addLanguageSub:'\u00bfTu idioma no est\u00e1 en la lista? D\u00ednoslo \u2014 \u00a1lo agregaremos!', addLanguagePlaceholder:'Ej: Fon, Twi, Soninke, Zarma...', submitLanguage:'Enviar idioma', cancelBtn:'Cancelar', languageSubmittedAlert:'\u2705 \u00a1Gracias! "{lang}" ha sido enviado. \u00a1Lo agregaremos pronto!', enterLanguageNameAlert:'Por favor, ingresa el nombre de un idioma.', enterValidEmailAlert:'Por favor, ingresa un correo electr\u00f3nico v\u00e1lido.' },
  pt: { hero1:'A Forma Inteligente de Gerir', hero2:'Sua Comunidade', cta:'Criar Conta Gr\u00e1tis', signin:'Entrar', trusted:'CRIADO PARA COMUNIDADES EM TODO O MUNDO', sub:'Acompanhe contribui\u00e7\u00f5es, gerencie membros, gere recibos e relat\u00f3rios automaticamente.', auto:'MODO AUTO', expert:'MODO ESPECIALISTA', startAuto:'Come\u00e7ar no Modo Auto', startExpert:'Come\u00e7ar no Modo Especialista', modeTitle:'Como voc\u00ea quer usar a UNIMUNITY?', modeSubtitle:'Escolha a experi\u00eancia que combina com sua comunidade.', tagline:'SUA COMUNIDADE. SEU PODER.', trialBanner:'\ud83c\udf81 Teste gr\u00e1tis de 7 dias \u00b7 N\u00e3o \u00e9 necess\u00e1rio cart\u00e3o de cr\u00e9dito', chooseExperience:'ESCOLHA SUA EXPERI\u00caNCIA', autoBadge:'100% AUTOM\u00c1TICO \u2014 PARA TODOS', expertBadge:'CONTROLE TOTAL \u2014 PARA ADMINISTRADORES', autoFeat1:'Lembretes autom\u00e1ticos enviados para voc\u00ea', autoFeat2:'Recibos gerados automaticamente', autoFeat3:'Rota\u00e7\u00e3o calculada pela UNIMUNITY', autoFeat4:'Bot\u00f5es grandes - sem necessidade de leitura', autoFeat5:'Funciona em 25 idiomas', expertFeat1:'Painel de an\u00e1lise completo', expertFeat2:'Configura\u00e7\u00f5es e controles avan\u00e7ados', expertFeat3:'Relat\u00f3rios e exporta\u00e7\u00f5es personalizados', expertFeat4:'Gest\u00e3o completa de membros', expertFeat5:'Acesso completo ao registro de auditoria', communitiesHeading:'COMUNIDADES AO REDOR DO MUNDO', communitiesSub:'Cada na\u00e7\u00e3o. Cada comunidade. Uma \u00fanica plataforma.', statFreeTrial:'Teste gr\u00e1tis', statLanguages:'Idiomas suportados', statAutomatic:'Autom\u00e1tico e seguro', statPlans:'Planos - Sem vers\u00e3o gratuita', howItWorksTitle:'Como funciona', howItWorksSub:'3 passos simples para come\u00e7ar', step1Title:'Crie seu grupo', step1Desc:'Cadastre-se, escolha seu modo e convide seus membros em minutos.', step2Title:'Registre as contribui\u00e7\u00f5es', step2Desc:'Cada pagamento \u00e9 confirmado instantaneamente e um recibo \u00e9 gerado automaticamente.', step3Title:'A UNIMUNITY cuida do resto', step3Desc:'Rota\u00e7\u00e3o, lembretes, relat\u00f3rios - tudo autom\u00e1tico. Voc\u00ea foca na sua comunidade.', testimonialsTitle:'O que nossas comunidades dizem', testimonialsSub:'Avalia\u00e7\u00f5es reais de organizadores e membros reais da UNIMUNITY', leaveTestimonial:'Deixar um depoimento', testimonialsCtaFallback:'Voc\u00ea j\u00e1 usa a UNIMUNITY? Compartilhe sua experi\u00eancia com futuros organizadores.', roleOrganizer:'organizador', roleMember:'membro', faqTitle:'Perguntas frequentes', faqSub:'Tudo o que voc\u00ea precisa saber sobre a UNIMUNITY', faq1q:'A UNIMUNITY \u00e9 gratuita?', faq1a:'N\u00e3o - a UNIMUNITY \u00e9 uma plataforma paga. H\u00e1 um teste gratuito de 7 dias, depois os organizadores pagam uma taxa de acesso vital\u00edcia \u00fanica de $24,99, mais uma assinatura a partir de $24,99/m\u00eas em 4 planos (Starter, Pro, Business, Enterprise). Alguns grupos tamb\u00e9m cobram uma taxa de acesso \u00fanica de $9,99 dos membros. N\u00e3o h\u00e1 um plano gratuito para sempre.', faq2q:'Quantos membros um grupo pode ter?', faq2a:'Ilimitado. A UNIMUNITY suporta grupos de 2 a mais de 10.000 membros sem restri\u00e7\u00f5es.', faq3q:'Meus dados est\u00e3o seguros?', faq3a:'Com certeza. Cada grupo tem um espa\u00e7o totalmente isolado e criptografado. Nenhum grupo pode ver os dados de outro grupo.', faq4q:'Posso usar a UNIMUNITY no meu idioma?', faq4a:'Sim! A UNIMUNITY suporta 25 idiomas com detec\u00e7\u00e3o autom\u00e1tica. Mais idiomas s\u00e3o adicionados regularmente.', faq5q:'Preciso entender de tecnologia?', faq5a:'N\u00e3o. O Modo Autom\u00e1tico foi feito para qualquer pessoa - bot\u00f5es grandes, tudo autom\u00e1tico, sem necessidade de leitura.', stayUpdatedTitle:'Fique por dentro da UNIMUNITY', stayUpdatedSub:'Seja notificado quando novos idiomas e recursos forem adicionados', thankYouSubscribe:'\u2705 Obrigado! Voc\u00ea est\u00e1 na lista.', notifyMe:'Notificar-me', addLanguageTitle:'\u2795 Adicione seu idioma', addLanguageSub:'Seu idioma n\u00e3o est\u00e1 na lista? Nos avise \u2014 vamos adicion\u00e1-lo!', addLanguagePlaceholder:'Ex: Fon, Twi, Soninke, Zarma...', submitLanguage:'Enviar idioma', cancelBtn:'Cancelar', languageSubmittedAlert:'\u2705 Obrigado! "{lang}" foi enviado. Vamos adicion\u00e1-lo em breve!', enterLanguageNameAlert:'Por favor, digite o nome de um idioma.', enterValidEmailAlert:'Por favor, digite um e-mail v\u00e1lido.' },
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
  {icon:'\ud83e\udd1d',title:'Tontine / Sol',desc:'Cycles, rotation, receipts, organizer commission',tag:'V1 - PRIORITY'},
  {icon:'\ud83c\udfdb\ufe0f',title:'Association',desc:'Members, dues, events, votes, reports',tag:'V1'},
  {icon:'\ud83d\udcbc',title:'Investment',desc:'Projects, capital, returns, financial reports',tag:'V1'},
  {icon:'\u26ea',title:'Church',desc:'Tithes, offerings, projects, announcements',tag:'V1'},
  {icon:'\ud83c\udf3e',title:'Agriculture',desc:'Cooperatives, harvests, group purchases',tag:'V2'},
  {icon:'\ud83c\udfe5',title:'Health',desc:'Health mutuals, coverage, claims',tag:'V3'},
  {icon:'\ud83c\udfe2',title:'Organization',desc:'Members, structure, governance, reports',tag:'V2'},
  {icon:'\ud83e\udd32',title:'Foundation',desc:'Donations, projects, impact reports, grants',tag:'V2'},
  {icon:'\ud83c\udfe0',title:'Orphanage',desc:'Children records, sponsors, care plans, donations',tag:'V2'},
  {icon:'\ud83c\udf89',title:'Youth Club',desc:'Activities, members, events, fees',tag:'V3'},
  {icon:'\ud83e\udd1d',title:'Cooperative',desc:'Shared resources, member shares, collective purchases',tag:'V2'},
  {icon:'\ud83d\uded2',title:'Commerce',desc:'Orders, inventory, group sales, vendor payouts',tag:'V3'},
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
    {icon:'\ud83d\udd14', key:t(lang,'autoFeat1')},
    {icon:'\ud83e\uddfe', key:t(lang,'autoFeat2')},
    {icon:'\ud83d\udd04', key:t(lang,'autoFeat3')},
    {icon:'\ud83d\udd35', key:t(lang,'autoFeat4')},
    {icon:'\ud83c\udf0d', key:t(lang,'autoFeat5')},
  ];
  const EXPERT_FEATURES = [
    {icon:'\ud83d\udcca', key:t(lang,'expertFeat1')},
    {icon:'\u2699\ufe0f', key:t(lang,'expertFeat2')},
    {icon:'\ud83d\udccb', key:t(lang,'expertFeat3')},
    {icon:'\ud83d\udc65', key:t(lang,'expertFeat4')},
    {icon:'\ud83d\udd12', key:t(lang,'expertFeat5')},
  ];
  const STEPS = [
    {step:'1', icon:'\ud83d\udcdd', title:t(lang,'step1Title'), desc:t(lang,'step1Desc')},
    {step:'2', icon:'\ud83d\udcb0', title:t(lang,'step2Title'), desc:t(lang,'step2Desc')},
    {step:'3', icon:'\ud83d\udd04', title:t(lang,'step3Title'), desc:t(lang,'step3Desc')},
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
        @keyframes imgFade{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:scale(1)}}
        .animate-fade{animation:fadeUp 0.8s ease forwards;}
        .floating{animation:float 3s ease-in-out infinite;}
        .tcard{animation:slideIn 0.5s ease forwards;}
        .img-fade{animation:imgFade 0.8s ease forwards;}
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
            <div style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'800',letterSpacing:'3px',display:'none'}}>UNIMUNITY</div><a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/unimunity-logo.png" alt="Unimunity" style={{height:'64px'}}/></a>
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
        <div className="UNIMUNITY-hero-deco floating" style={{position:'absolute',top:'20px',left:'5%',opacity:0.10,fontSize:'80px',pointerEvents:'none'}}>{'\ud83e\udd1d'}</div>
        <div className="UNIMUNITY-hero-deco floating" style={{position:'absolute',top:'30px',right:'6%',opacity:0.10,fontSize:'65px',pointerEvents:'none',animationDelay:'1s'}}>{'\ud83d\udcb0'}</div>
        <div className="UNIMUNITY-hero-deco floating" style={{position:'absolute',bottom:'30px',left:'8%',opacity:0.08,fontSize:'55px',pointerEvents:'none',animationDelay:'0.5s'}}>{'\ud83c\udf0d'}</div>
        <div className="UNIMUNITY-hero-deco floating" style={{position:'absolute',bottom:'40px',right:'10%',opacity:0.08,fontSize:'50px',pointerEvents:'none',animationDelay:'1.5s'}}>{'\u2b50'}</div>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'inline-block',background:'rgba(233,199,123,0.15)',border:'1px solid rgba(233,199,123,0.3)',borderRadius:'20px',padding:'6px 18px',marginBottom:'24px'}}>
            <span style={{color:'#E9C77B',fontSize:'12px',fontWeight:'600',letterSpacing:'2px'}}>{'\ud83c\udf0d'} {t(lang,'trusted')}</span>
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
              <div style={{fontSize:'44px',marginBottom:'14px'}}>{'\ud83e\udd32'}</div>
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
              <div style={{fontSize:'44px',marginBottom:'14px'}}>{'\u26a1'}</div>
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
          <div style={{position:'absolute',top:'50%',right:'16px',transform:'translateY(-50%)',background:'rgba(0,0,0,0.4)',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'18px',cursor:'pointer',zIndex:2}}>{'\u203a'}</div>
        </div>
      </div>

      <div style={{background:'#EAD9BE',padding:'44px 32px'}}>
        <div style={{display:'flex',justifyContent:'center',gap:'64px',flexWrap:'wrap'}}>
          {[['7-Day',t(lang,'statFreeTrial')],['25',t(lang,'statLanguages')],['100%',t(lang,'statAutomatic')],['4',t(lang,'statPlans')]].map(([v,l])=>(
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
        <p style={{color:'rgba(251,238,221,0.6)',marginBottom:'32px',fontSize:'14px'}}>{t(lang,'testimonialsSub')}</p>

        {testimonials.length > 0 ? (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'20px',maxWidth:'980px',margin:'0 auto 28px'}}>
              {testimonials.slice(0,6).map(rev=>(
                <div key={rev.id} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(233,199,123,0.3)',borderRadius:'16px',padding:'24px',textAlign:'left'}}>
                  <div style={{color:'#E9C77B',fontSize:'14px',marginBottom:'10px'}}>{'\u2605'.repeat(Math.max(1,Math.min(5,rev.rating)))}{'\u2606'.repeat(5-Math.max(1,Math.min(5,rev.rating)))}</div>
                  <p style={{color:'#FBEEDD',fontSize:'13.5px',lineHeight:'1.7',marginBottom:'16px'}}>{'\u201c'}{rev.text}{'\u201d'}</p>
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
            <div style={{fontSize:'30px',marginBottom:'10px'}}>{'\ud83d\udcac'}</div>
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
                <span style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'700',lineHeight:'1'}}>{openFaq===i?'\u2212':'+'}</span>
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

