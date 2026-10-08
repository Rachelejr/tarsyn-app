// Texts for the public join-request page (/refer/[code]).
// Same 10 languages as the QR feature; kept in one file so they can move
// into a shared translation system later unchanged.

import type { QrLang } from '@/components/qr/qrI18n';

export type RefKey =
  | 'title' | 'invitedBy' | 'intro' | 'firstName' | 'lastName' | 'email' | 'address' | 'phone'
  | 'message' | 'optional' | 'submit' | 'sending' | 'sentTitle' | 'sentBody' | 'invalidLink'
  | 'errFields' | 'errRate' | 'errTooMany' | 'errServer' | 'loading'
  | 'country' | 'selectCountry' | 'otherCountry' | 'nationality' | 'nationalityHint'
  | 'gender' | 'notSpecified' | 'male' | 'female' | 'genderOther';

const T: Record<QrLang, Record<RefKey, string>> = {
  en: {
    title: 'Request to join', invitedBy: '{name} invited you to join', intro: 'Fill in this form. The organizer of the group will review your request and decide.',
    firstName: 'First name', lastName: 'Last name', email: 'Email', address: 'Address', phone: 'Phone',
    message: 'Message to the organizer', optional: 'optional', submit: 'Send my request', sending: 'Sending...',
    sentTitle: 'Request sent', sentBody: 'If the organizer accepts your request, you will receive an email with your personal link to create your account.',
    invalidLink: 'This link is no longer valid. Ask the person who invited you for a new one.',
    errFields: 'Please check the highlighted fields.', errRate: 'Too many attempts. Please try again in an hour.',
    errTooMany: 'This invitation link has too many pending requests. Please try again later.', errServer: 'Something went wrong. Please try again.', loading: 'Loading...',
    country: 'Country', selectCountry: 'Select country...', otherCountry: 'Other', nationality: 'Nationality', nationalityHint: 'e.g. Haitian', gender: 'Gender', notSpecified: 'Not specified', male: 'Male', female: 'Female', genderOther: 'Other',
  },
  fr: {
    title: 'Demande d\u2019adh\u00e9sion', invitedBy: '{name} vous invite \u00e0 rejoindre', intro: 'Remplissez ce formulaire. L\u2019organisateur du groupe examinera votre demande et d\u00e9cidera.',
    firstName: 'Pr\u00e9nom', lastName: 'Nom', email: 'Email', address: 'Adresse', phone: 'T\u00e9l\u00e9phone',
    message: 'Message \u00e0 l\u2019organisateur', optional: 'facultatif', submit: 'Envoyer ma demande', sending: 'Envoi...',
    sentTitle: 'Demande envoy\u00e9e', sentBody: 'Si l\u2019organisateur accepte votre demande, vous recevrez un email avec votre lien personnel pour cr\u00e9er votre compte.',
    invalidLink: 'Ce lien n\u2019est plus valide. Demandez-en un nouveau \u00e0 la personne qui vous a invit\u00e9.',
    errFields: 'Veuillez v\u00e9rifier les champs indiqu\u00e9s.', errRate: 'Trop de tentatives. R\u00e9essayez dans une heure.',
    errTooMany: 'Ce lien a trop de demandes en attente. R\u00e9essayez plus tard.', errServer: 'Une erreur est survenue. Veuillez r\u00e9essayer.', loading: 'Chargement...',
    country: 'Pays', selectCountry: 'Choisir un pays...', otherCountry: 'Autre', nationality: 'Nationalit\u00e9', nationalityHint: 'ex. Ha\u00eftienne', gender: 'Genre', notSpecified: 'Non pr\u00e9cis\u00e9', male: 'Homme', female: 'Femme', genderOther: 'Autre',
  },
  ht: {
    title: 'Demann pou antre', invitedBy: '{name} envite w antre nan', intro: 'Ranpli f\u00f2m sa a. \u00d2ganizat\u00e8 gwoup la ap gade demann ou an epi deside.',
    firstName: 'Prenon', lastName: 'Non', email: 'Im\u00e8l', address: 'Adr\u00e8s', phone: 'Telef\u00f2n',
    message: 'Mesaj pou \u00f2ganizat\u00e8 a', optional: 'si ou vle', submit: 'Voye demann mwen', sending: 'N ap voye...',
    sentTitle: 'Demann lan voye', sentBody: 'Si \u00f2ganizat\u00e8 a aksepte demann ou an, w ap resevwa yon im\u00e8l ak lyen pesonl ou pou kreye kont ou.',
    invalidLink: 'Lyen sa a pa valab ank\u00f2. Mande moun ki envite w la yon l\u00f2t.',
    errFields: 'Tanpri verifye chan ki make yo.', errRate: 'Tw\u00f2p eseye. Tanpri eseye ank\u00f2 nan in\u00e8dtan.',
    errTooMany: 'Lyen sa a gen tw\u00f2p demann k ap tann. Eseye pita.', errServer: 'Gen yon pwobl\u00e8m. Tanpri eseye ank\u00f2.', loading: 'N ap chaje...',
    country: 'Peyi', selectCountry: 'Chwazi yon peyi...', otherCountry: 'L\u00f2t', nationality: 'Nasyonalite', nationalityHint: 'egz. Ayisyen', gender: 'S\u00e8ks', notSpecified: 'Pa presize', male: 'Gason', female: 'Fi', genderOther: 'L\u00f2t',
  },
  es: {
    title: 'Solicitud para unirse', invitedBy: '{name} te invita a unirte a', intro: 'Completa este formulario. El organizador del grupo revisar\u00e1 tu solicitud y decidir\u00e1.',
    firstName: 'Nombre', lastName: 'Apellido', email: 'Correo electr\u00f3nico', address: 'Direcci\u00f3n', phone: 'Tel\u00e9fono',
    message: 'Mensaje al organizador', optional: 'opcional', submit: 'Enviar mi solicitud', sending: 'Enviando...',
    sentTitle: 'Solicitud enviada', sentBody: 'Si el organizador acepta tu solicitud, recibir\u00e1s un correo con tu enlace personal para crear tu cuenta.',
    invalidLink: 'Este enlace ya no es v\u00e1lido. P\u00eddele uno nuevo a la persona que te invit\u00f3.',
    errFields: 'Revisa los campos indicados.', errRate: 'Demasiados intentos. Int\u00e9ntalo de nuevo en una hora.',
    errTooMany: 'Este enlace tiene demasiadas solicitudes pendientes. Int\u00e9ntalo m\u00e1s tarde.', errServer: 'Algo sali\u00f3 mal. Int\u00e9ntalo de nuevo.', loading: 'Cargando...',
    country: 'Pa\u00eds', selectCountry: 'Elige un pa\u00eds...', otherCountry: 'Otro', nationality: 'Nacionalidad', nationalityHint: 'ej. Haitiana', gender: 'G\u00e9nero', notSpecified: 'No especificado', male: 'Hombre', female: 'Mujer', genderOther: 'Otro',
  },
  pt: {
    title: 'Pedido para entrar', invitedBy: '{name} convidou voc\u00ea para entrar em', intro: 'Preencha este formul\u00e1rio. O organizador do grupo analisar\u00e1 seu pedido e decidir\u00e1.',
    firstName: 'Nome', lastName: 'Sobrenome', email: 'E-mail', address: 'Endere\u00e7o', phone: 'Telefone',
    message: 'Mensagem ao organizador', optional: 'opcional', submit: 'Enviar meu pedido', sending: 'Enviando...',
    sentTitle: 'Pedido enviado', sentBody: 'Se o organizador aceitar seu pedido, voc\u00ea receber\u00e1 um e-mail com seu link pessoal para criar sua conta.',
    invalidLink: 'Este link n\u00e3o \u00e9 mais v\u00e1lido. Pe\u00e7a um novo \u00e0 pessoa que convidou voc\u00ea.',
    errFields: 'Verifique os campos indicados.', errRate: 'Muitas tentativas. Tente novamente em uma hora.',
    errTooMany: 'Este link tem muitos pedidos pendentes. Tente mais tarde.', errServer: 'Algo deu errado. Tente novamente.', loading: 'Carregando...',
    country: 'Pa\u00eds', selectCountry: 'Escolha um pa\u00eds...', otherCountry: 'Outro', nationality: 'Nacionalidade', nationalityHint: 'ex. Haitiana', gender: 'G\u00eanero', notSpecified: 'N\u00e3o especificado', male: 'Masculino', female: 'Feminino', genderOther: 'Outro',
  },
  ar: {
    title: '\u0637\u0644\u0628 \u0627\u0646\u0636\u0645\u0627\u0645', invitedBy: '\u064a\u062f\u0639\u0648\u0643 {name} \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649', intro: '\u0627\u0645\u0644\u0623 \u0647\u0630\u0627 \u0627\u0644\u0646\u0645\u0648\u0630\u062c. \u0633\u064a\u0631\u0627\u062c\u0639 \u0645\u0646\u0638\u0645 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0637\u0644\u0628\u0643 \u0648\u064a\u0642\u0631\u0631.',
    firstName: '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644', lastName: '\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629', email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', address: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646', phone: '\u0627\u0644\u0647\u0627\u062a\u0641',
    message: '\u0631\u0633\u0627\u0644\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0646\u0638\u0645', optional: '\u0627\u062e\u062a\u064a\u0627\u0631\u064a', submit: '\u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628\u064a', sending: '\u062c\u0627\u0631\u064d \u0627\u0644\u0625\u0631\u0633\u0627\u0644...',
    sentTitle: '\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628', sentBody: '\u0625\u0630\u0627 \u0642\u0628\u0644 \u0627\u0644\u0645\u0646\u0638\u0645 \u0637\u0644\u0628\u0643\u060c \u0633\u062a\u062a\u0644\u0642\u0649 \u0628\u0631\u064a\u062f\u064b\u0627 \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u064b\u0627 \u0628\u0631\u0627\u0628\u0637\u0643 \u0627\u0644\u0634\u062e\u0635\u064a \u0644\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628\u0643.',
    invalidLink: '\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0644\u0645 \u064a\u0639\u062f \u0635\u0627\u0644\u062d\u064b\u0627. \u0627\u0637\u0644\u0628 \u0631\u0627\u0628\u0637\u064b\u0627 \u062c\u062f\u064a\u062f\u064b\u0627 \u0645\u0645\u0646 \u062f\u0639\u0627\u0643.',
    errFields: '\u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.', errRate: '\u0645\u062d\u0627\u0648\u0644\u0627\u062a \u0643\u062b\u064a\u0631\u0629. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649 \u0628\u0639\u062f \u0633\u0627\u0639\u0629.',
    errTooMany: '\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0644\u062f\u064a\u0647 \u0637\u0644\u0628\u0627\u062a \u0645\u0639\u0644\u0642\u0629 \u0643\u062b\u064a\u0631\u0629. \u062d\u0627\u0648\u0644 \u0644\u0627\u062d\u0642\u064b\u0627.', errServer: '\u062d\u062f\u062b \u062e\u0637\u0623. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.', loading: '\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0645\u064a\u0644...',
    country: '\u0627\u0644\u0628\u0644\u062f', selectCountry: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0628\u0644\u062f...', otherCountry: '\u0622\u062e\u0631', nationality: '\u0627\u0644\u062c\u0646\u0633\u064a\u0629', nationalityHint: '\u0645\u062b\u0644\u0627\u064b: \u0647\u0627\u064a\u062a\u064a', gender: '\u0627\u0644\u062c\u0646\u0633', notSpecified: '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f', male: '\u0630\u0643\u0631', female: '\u0623\u0646\u062b\u0649', genderOther: '\u0622\u062e\u0631',
  },
  zh: {
    title: '\u52a0\u5165\u7533\u8bf7', invitedBy: '{name} \u9080\u8bf7\u60a8\u52a0\u5165', intro: '\u8bf7\u586b\u5199\u6b64\u8868\u683c\u3002\u7fa4\u7ec4\u7ec4\u7ec7\u8005\u5c06\u5ba1\u6838\u60a8\u7684\u7533\u8bf7\u5e76\u505a\u51fa\u51b3\u5b9a\u3002',
    firstName: '\u540d', lastName: '\u59d3', email: '\u7535\u5b50\u90ae\u4ef6', address: '\u5730\u5740', phone: '\u7535\u8bdd',
    message: '\u7ed9\u7ec4\u7ec7\u8005\u7684\u7559\u8a00', optional: '\u53ef\u9009', submit: '\u63d0\u4ea4\u7533\u8bf7', sending: '\u6b63\u5728\u63d0\u4ea4...',
    sentTitle: '\u7533\u8bf7\u5df2\u63d0\u4ea4', sentBody: '\u5982\u679c\u7ec4\u7ec7\u8005\u63a5\u53d7\u60a8\u7684\u7533\u8bf7\uff0c\u60a8\u5c06\u6536\u5230\u4e00\u5c01\u5305\u542b\u4e2a\u4eba\u94fe\u63a5\u7684\u90ae\u4ef6\uff0c\u7528\u4e8e\u521b\u5efa\u8d26\u6237\u3002',
    invalidLink: '\u6b64\u94fe\u63a5\u5df2\u5931\u6548\u3002\u8bf7\u5411\u9080\u8bf7\u60a8\u7684\u4eba\u7d22\u53d6\u65b0\u94fe\u63a5\u3002',
    errFields: '\u8bf7\u68c0\u67e5\u6807\u51fa\u7684\u5b57\u6bb5\u3002', errRate: '\u5c1d\u8bd5\u6b21\u6570\u8fc7\u591a\uff0c\u8bf7\u4e00\u5c0f\u65f6\u540e\u518d\u8bd5\u3002',
    errTooMany: '\u6b64\u94fe\u63a5\u7684\u5f85\u5904\u7406\u7533\u8bf7\u8fc7\u591a\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002', errServer: '\u51fa\u9519\u4e86\uff0c\u8bf7\u91cd\u8bd5\u3002', loading: '\u52a0\u8f7d\u4e2d...',
    country: '\u56fd\u5bb6', selectCountry: '\u9009\u62e9\u56fd\u5bb6...', otherCountry: '\u5176\u4ed6', nationality: '\u56fd\u7c4d', nationalityHint: '\u4f8b\u5982\uff1a\u6d77\u5730', gender: '\u6027\u522b', notSpecified: '\u672a\u8bf4\u660e', male: '\u7537', female: '\u5973', genderOther: '\u5176\u4ed6',
  },
  ja: {
    title: '\u53c2\u52a0\u7533\u8acb', invitedBy: '{name} \u3055\u3093\u304b\u3089\u306e\u62db\u5f85\uff1a', intro: '\u3053\u306e\u30d5\u30a9\u30fc\u30e0\u306b\u3054\u8a18\u5165\u304f\u3060\u3055\u3044\u3002\u30b0\u30eb\u30fc\u30d7\u306e\u4e3b\u50ac\u8005\u304c\u7533\u8acb\u3092\u78ba\u8a8d\u3057\u3066\u6c7a\u5b9a\u3057\u307e\u3059\u3002',
    firstName: '\u540d', lastName: '\u59d3', email: '\u30e1\u30fc\u30eb', address: '\u4f4f\u6240', phone: '\u96fb\u8a71\u756a\u53f7',
    message: '\u4e3b\u50ac\u8005\u3078\u306e\u30e1\u30c3\u30bb\u30fc\u30b8', optional: '\u4efb\u610f', submit: '\u7533\u8acb\u3092\u9001\u4fe1', sending: '\u9001\u4fe1\u4e2d...',
    sentTitle: '\u7533\u8acb\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f', sentBody: '\u4e3b\u50ac\u8005\u304c\u7533\u8acb\u3092\u627f\u8a8d\u3059\u308b\u3068\u3001\u30a2\u30ab\u30a6\u30f3\u30c8\u4f5c\u6210\u7528\u306e\u500b\u4eba\u30ea\u30f3\u30af\u304c\u30e1\u30fc\u30eb\u3067\u5c4a\u304d\u307e\u3059\u3002',
    invalidLink: '\u3053\u306e\u30ea\u30f3\u30af\u306f\u7121\u52b9\u3067\u3059\u3002\u62db\u5f85\u3057\u305f\u65b9\u306b\u65b0\u3057\u3044\u30ea\u30f3\u30af\u3092\u4f9d\u983c\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    errFields: '\u8868\u793a\u3055\u308c\u305f\u9805\u76ee\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002', errRate: '\u8a66\u884c\u56de\u6570\u304c\u591a\u3059\u304e\u307e\u3059\u30021\u6642\u9593\u5f8c\u306b\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002',
    errTooMany: '\u3053\u306e\u30ea\u30f3\u30af\u306b\u306f\u4fdd\u7559\u4e2d\u306e\u7533\u8acb\u304c\u591a\u3059\u304e\u307e\u3059\u3002\u5f8c\u3067\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002', errServer: '\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002', loading: '\u8aad\u307f\u8fbc\u307f\u4e2d...',
    country: '\u56fd', selectCountry: '\u56fd\u3092\u9078\u629e...', otherCountry: '\u305d\u306e\u4ed6', nationality: '\u56fd\u7c4d', nationalityHint: '\u4f8b\uff1a\u30cf\u30a4\u30c1', gender: '\u6027\u5225', notSpecified: '\u6307\u5b9a\u306a\u3057', male: '\u7537\u6027', female: '\u5973\u6027', genderOther: '\u305d\u306e\u4ed6',
  },
  ko: {
    title: '\uac00\uc785 \uc2e0\uccad', invitedBy: '{name} \ub2d8\uc774 \ucd08\ub300\ud588\uc2b5\ub2c8\ub2e4:', intro: '\uc774 \uc591\uc2dd\uc744 \uc791\uc131\ud558\uc138\uc694. \uadf8\ub8f9 \uc8fc\ucd5c\uc790\uac00 \uc2e0\uccad\uc744 \uac80\ud1a0\ud558\uace0 \uacb0\uc815\ud569\ub2c8\ub2e4.',
    firstName: '\uc774\ub984', lastName: '\uc131', email: '\uc774\uba54\uc77c', address: '\uc8fc\uc18c', phone: '\uc804\ud654\ubc88\ud638',
    message: '\uc8fc\ucd5c\uc790\uc5d0\uac8c \ubcf4\ub0bc \uba54\uc2dc\uc9c0', optional: '\uc120\ud0dd', submit: '\uc2e0\uccad \ubcf4\ub0b4\uae30', sending: '\ubcf4\ub0b4\ub294 \uc911...',
    sentTitle: '\uc2e0\uccad\uc774 \uc804\uc1a1\ub418\uc5c8\uc2b5\ub2c8\ub2e4', sentBody: '\uc8fc\ucd5c\uc790\uac00 \uc2e0\uccad\uc744 \uc2b9\uc778\ud558\uba74 \uacc4\uc815\uc744 \ub9cc\ub4e4 \uc218 \uc788\ub294 \uac1c\uc778 \ub9c1\ud06c\uac00 \uc774\uba54\uc77c\ub85c \ubc1c\uc1a1\ub429\ub2c8\ub2e4.',
    invalidLink: '\uc774 \ub9c1\ud06c\ub294 \ub354 \uc774\uc0c1 \uc720\ud6a8\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \ucd08\ub300\ud55c \ubd84\uaed8 \uc0c8 \ub9c1\ud06c\ub97c \uc694\uccad\ud558\uc138\uc694.',
    errFields: '\ud45c\uc2dc\ub41c \ud56d\ubaa9\uc744 \ud655\uc778\ud558\uc138\uc694.', errRate: '\uc2dc\ub3c4 \ud69f\uc218\uac00 \ub108\ubb34 \ub9ce\uc2b5\ub2c8\ub2e4. 1\uc2dc\uac04 \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.',
    errTooMany: '\uc774 \ub9c1\ud06c\uc5d0 \ub300\uae30 \uc911\uc778 \uc2e0\uccad\uc774 \ub108\ubb34 \ub9ce\uc2b5\ub2c8\ub2e4. \ub098\uc911\uc5d0 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.', errServer: '\ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.', loading: '\ubd88\ub7ec\uc624\ub294 \uc911...',
    country: '\uad6d\uac00', selectCountry: '\uad6d\uac00 \uc120\ud0dd...', otherCountry: '\uae30\ud0c0', nationality: '\uad6d\uc801', nationalityHint: '\uc608: \uc544\uc774\ud2f0', gender: '\uc131\ubcc4', notSpecified: '\uc9c0\uc815 \uc548 \ud568', male: '\ub0a8\uc131', female: '\uc5ec\uc131', genderOther: '\uae30\ud0c0',
  },
  hi: {
    title: '\u0936\u093e\u092e\u093f\u0932 \u0939\u094b\u0928\u0947 \u0915\u093e \u0905\u0928\u0941\u0930\u094b\u0927', invitedBy: '{name} \u0928\u0947 \u0906\u092a\u0915\u094b \u0906\u092e\u0902\u0924\u094d\u0930\u093f\u0924 \u0915\u093f\u092f\u093e \u0939\u0948:', intro: '\u092f\u0939 \u092b\u0949\u0930\u094d\u092e \u092d\u0930\u0947\u0902\u0964 \u0938\u092e\u0942\u0939 \u0915\u0947 \u0906\u092f\u094b\u091c\u0915 \u0906\u092a\u0915\u0947 \u0905\u0928\u0941\u0930\u094b\u0927 \u0915\u0940 \u0938\u092e\u0940\u0915\u094d\u0937\u093e \u0915\u0930\u0915\u0947 \u0928\u093f\u0930\u094d\u0923\u092f \u0932\u0947\u0902\u0917\u0947\u0964',
    firstName: '\u092a\u0939\u0932\u093e \u0928\u093e\u092e', lastName: '\u0909\u092a\u0928\u093e\u092e', email: '\u0908\u092e\u0947\u0932', address: '\u092a\u0924\u093e', phone: '\u092b\u093c\u094b\u0928',
    message: '\u0906\u092f\u094b\u091c\u0915 \u0915\u0947 \u0932\u093f\u090f \u0938\u0902\u0926\u0947\u0936', optional: '\u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915', submit: '\u092e\u0947\u0930\u093e \u0905\u0928\u0941\u0930\u094b\u0927 \u092d\u0947\u091c\u0947\u0902', sending: '\u092d\u0947\u091c\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948...',
    sentTitle: '\u0905\u0928\u0941\u0930\u094b\u0927 \u092d\u0947\u091c\u093e \u0917\u092f\u093e', sentBody: '\u092f\u0926\u093f \u0906\u092f\u094b\u091c\u0915 \u0906\u092a\u0915\u093e \u0905\u0928\u0941\u0930\u094b\u0927 \u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902, \u0924\u094b \u0906\u092a\u0915\u094b \u0916\u093e\u0924\u093e \u092c\u0928\u093e\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0932\u093f\u0902\u0915 \u0935\u093e\u0932\u093e \u0908\u092e\u0947\u0932 \u092e\u093f\u0932\u0947\u0917\u093e\u0964',
    invalidLink: '\u092f\u0939 \u0932\u093f\u0902\u0915 \u0905\u092c \u092e\u093e\u0928\u094d\u092f \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0906\u092a\u0915\u094b \u0906\u092e\u0902\u0924\u094d\u0930\u093f\u0924 \u0915\u0930\u0928\u0947 \u0935\u093e\u0932\u0947 \u0938\u0947 \u0928\u092f\u093e \u0932\u093f\u0902\u0915 \u092e\u093e\u0902\u0917\u0947\u0902\u0964',
    errFields: '\u0915\u0943\u092a\u092f\u093e \u091a\u093f\u0939\u094d\u0928\u093f\u0924 \u092b\u093c\u0940\u0932\u094d\u0921 \u091c\u093e\u0902\u091a\u0947\u0902\u0964', errRate: '\u092c\u0939\u0941\u0924 \u0905\u0927\u093f\u0915 \u092a\u094d\u0930\u092f\u093e\u0938\u0964 \u090f\u0915 \u0918\u0902\u091f\u0947 \u092c\u093e\u0926 \u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964',
    errTooMany: '\u0907\u0938 \u0932\u093f\u0902\u0915 \u092a\u0930 \u092c\u0939\u0941\u0924 \u0938\u093e\u0930\u0947 \u0905\u0928\u0941\u0930\u094b\u0927 \u0932\u0902\u092c\u093f\u0924 \u0939\u0948\u0902\u0964 \u092c\u093e\u0926 \u092e\u0947\u0902 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964', errServer: '\u0915\u0941\u091b \u0917\u0932\u0924 \u0939\u094b \u0917\u092f\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964', loading: '\u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...',
    country: '\u0926\u0947\u0936', selectCountry: '\u0926\u0947\u0936 \u091a\u0941\u0928\u0947\u0902...', otherCountry: '\u0905\u0928\u094d\u092f', nationality: '\u0930\u093e\u0937\u094d\u091f\u094d\u0930\u0940\u092f\u0924\u093e', nationalityHint: '\u091c\u0948\u0938\u0947: \u0939\u0948\u0924\u093f\u092f\u0928', gender: '\u0932\u093f\u0902\u0917', notSpecified: '\u0928\u093f\u0930\u094d\u0926\u093f\u0937\u094d\u091f \u0928\u0939\u0940\u0902', male: '\u092a\u0941\u0930\u0941\u0937', female: '\u092e\u0939\u093f\u0932\u093e', genderOther: '\u0905\u0928\u094d\u092f',
  },
};

export function refT(lang: QrLang, key: RefKey, vars?: Record<string, string>): string {
  let s = T[lang]?.[key] || T.en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', v);
  return s;
}
