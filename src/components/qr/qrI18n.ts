// Texts for the invitation QR code feature.
// The dashboard has no shared translation system yet, so the keys live here
// in one place and can be moved into a global i18n system later as-is.

export type QrLang = 'en' | 'fr' | 'ht' | 'es' | 'pt' | 'ar' | 'zh' | 'ja' | 'ko' | 'hi';

export type QrKey =
  | 'qr.invitation.title'
  | 'qr.invitation.scanToJoin'
  | 'qr.invitation.personalFor'
  | 'qr.invitation.download'
  | 'qr.invitation.print'
  | 'qr.invitation.copyLink'
  | 'qr.invitation.linkCopied'
  | 'qr.invitation.close'
  | 'qr.invitation.invalid'
  | 'qr.invitation.personalNote';

export const QR_LANGS: { code: QrLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'ht', label: 'Krey\u00f2l Ayisyen' },
  { code: 'es', label: 'Espa\u00f1ol' },
  { code: 'pt', label: 'Portugu\u00eas' },
  { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
  { code: 'zh', label: '\u4e2d\u6587' },
  { code: 'ja', label: '\u65e5\u672c\u8a9e' },
  { code: 'ko', label: '\ud55c\uad6d\uc5b4' },
  { code: 'hi', label: '\u0939\u093f\u0928\u094d\u0926\u0940' },
];

const T: Record<QrLang, Record<QrKey, string>> = {
  en: {
    'qr.invitation.title': 'Group Invitation',
    'qr.invitation.scanToJoin': 'Scan to join this group',
    'qr.invitation.personalFor': 'Personal invitation for',
    'qr.invitation.download': 'Download',
    'qr.invitation.print': 'Print',
    'qr.invitation.copyLink': 'Copy Link',
    'qr.invitation.linkCopied': 'Link copied',
    'qr.invitation.close': 'Close',
    'qr.invitation.invalid': 'No valid invitation code for this member. Use "Resend Invite" in the Digital Register to create one.',
    'qr.invitation.personalNote': 'This code is personal: it links only to this member\u2019s place in the group.',
  },
  fr: {
    'qr.invitation.title': 'Invitation au groupe',
    'qr.invitation.scanToJoin': 'Scannez pour rejoindre ce groupe',
    'qr.invitation.personalFor': 'Invitation personnelle pour',
    'qr.invitation.download': 'T\u00e9l\u00e9charger',
    'qr.invitation.print': 'Imprimer',
    'qr.invitation.copyLink': 'Copier le lien',
    'qr.invitation.linkCopied': 'Lien copi\u00e9',
    'qr.invitation.close': 'Fermer',
    'qr.invitation.invalid': 'Aucun code d\u2019invitation valide pour ce membre. Utilisez \u00ab Resend Invite \u00bb dans le Digital Register pour en cr\u00e9er un.',
    'qr.invitation.personalNote': 'Ce code est personnel : il m\u00e8ne uniquement \u00e0 la place de ce membre dans le groupe.',
  },
  ht: {
    'qr.invitation.title': 'Envitasyon nan gwoup la',
    'qr.invitation.scanToJoin': 'Eskane pou antre nan gwoup sa a',
    'qr.invitation.personalFor': 'Envitasyon pesonl pou',
    'qr.invitation.download': 'Telechaje',
    'qr.invitation.print': 'Enprime',
    'qr.invitation.copyLink': 'Kopye lyen an',
    'qr.invitation.linkCopied': 'Lyen an kopye',
    'qr.invitation.close': 'F\u00e8men',
    'qr.invitation.invalid': 'Pa gen k\u00f2d envitasyon ki valab pou manm sa a. Itilize \u00ab Resend Invite \u00bb nan Digital Register la pou kreye youn.',
    'qr.invitation.personalNote': 'K\u00f2d sa a pesonl : li mennen s\u00e8lman nan plas manm sa a nan gwoup la.',
  },
  es: {
    'qr.invitation.title': 'Invitaci\u00f3n al grupo',
    'qr.invitation.scanToJoin': 'Escanea para unirte a este grupo',
    'qr.invitation.personalFor': 'Invitaci\u00f3n personal para',
    'qr.invitation.download': 'Descargar',
    'qr.invitation.print': 'Imprimir',
    'qr.invitation.copyLink': 'Copiar enlace',
    'qr.invitation.linkCopied': 'Enlace copiado',
    'qr.invitation.close': 'Cerrar',
    'qr.invitation.invalid': 'No hay un c\u00f3digo de invitaci\u00f3n v\u00e1lido para este miembro. Usa \u00abResend Invite\u00bb en el Digital Register para crear uno.',
    'qr.invitation.personalNote': 'Este c\u00f3digo es personal: solo lleva al lugar de este miembro en el grupo.',
  },
  pt: {
    'qr.invitation.title': 'Convite para o grupo',
    'qr.invitation.scanToJoin': 'Escaneie para entrar neste grupo',
    'qr.invitation.personalFor': 'Convite pessoal para',
    'qr.invitation.download': 'Baixar',
    'qr.invitation.print': 'Imprimir',
    'qr.invitation.copyLink': 'Copiar link',
    'qr.invitation.linkCopied': 'Link copiado',
    'qr.invitation.close': 'Fechar',
    'qr.invitation.invalid': 'Nenhum c\u00f3digo de convite v\u00e1lido para este membro. Use \u201cResend Invite\u201d no Digital Register para criar um.',
    'qr.invitation.personalNote': 'Este c\u00f3digo \u00e9 pessoal: leva apenas ao lugar deste membro no grupo.',
  },
  ar: {
    'qr.invitation.title': '\u062f\u0639\u0648\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629',
    'qr.invitation.scanToJoin': '\u0627\u0645\u0633\u062d \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629',
    'qr.invitation.personalFor': '\u062f\u0639\u0648\u0629 \u0634\u062e\u0635\u064a\u0629 \u0644\u0640',
    'qr.invitation.download': '\u062a\u0646\u0632\u064a\u0644',
    'qr.invitation.print': '\u0637\u0628\u0627\u0639\u0629',
    'qr.invitation.copyLink': '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637',
    'qr.invitation.linkCopied': '\u062a\u0645 \u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637',
    'qr.invitation.close': '\u0625\u063a\u0644\u0627\u0642',
    'qr.invitation.invalid': '\u0644\u0627 \u064a\u0648\u062c\u062f \u0631\u0645\u0632 \u062f\u0639\u0648\u0629 \u0635\u0627\u0644\u062d \u0644\u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648. \u0627\u0633\u062a\u062e\u062f\u0645 Resend Invite \u0641\u064a Digital Register \u0644\u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632.',
    'qr.invitation.personalNote': '\u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0634\u062e\u0635\u064a: \u064a\u0624\u062f\u064a \u0641\u0642\u0637 \u0625\u0644\u0649 \u0645\u0643\u0627\u0646 \u0647\u0630\u0627 \u0627\u0644\u0639\u0636\u0648 \u0641\u064a \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629.',
  },
  zh: {
    'qr.invitation.title': '\u7fa4\u7ec4\u9080\u8bf7',
    'qr.invitation.scanToJoin': '\u626b\u7801\u52a0\u5165\u6b64\u7fa4\u7ec4',
    'qr.invitation.personalFor': '\u4e2a\u4eba\u9080\u8bf7\uff1a',
    'qr.invitation.download': '\u4e0b\u8f7d',
    'qr.invitation.print': '\u6253\u5370',
    'qr.invitation.copyLink': '\u590d\u5236\u94fe\u63a5',
    'qr.invitation.linkCopied': '\u94fe\u63a5\u5df2\u590d\u5236',
    'qr.invitation.close': '\u5173\u95ed',
    'qr.invitation.invalid': '\u8be5\u6210\u5458\u6ca1\u6709\u6709\u6548\u7684\u9080\u8bf7\u7801\u3002\u8bf7\u5728 Digital Register \u4e2d\u4f7f\u7528 Resend Invite \u521b\u5efa\u3002',
    'qr.invitation.personalNote': '\u6b64\u4e8c\u7ef4\u7801\u4e3a\u4e2a\u4eba\u4e13\u7528\uff1a\u4ec5\u6307\u5411\u8be5\u6210\u5458\u5728\u7fa4\u7ec4\u4e2d\u7684\u4f4d\u7f6e\u3002',
  },
  ja: {
    'qr.invitation.title': '\u30b0\u30eb\u30fc\u30d7\u3078\u306e\u62db\u5f85',
    'qr.invitation.scanToJoin': '\u30b9\u30ad\u30e3\u30f3\u3057\u3066\u30b0\u30eb\u30fc\u30d7\u306b\u53c2\u52a0',
    'qr.invitation.personalFor': '\u500b\u4eba\u62db\u5f85\uff1a',
    'qr.invitation.download': '\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9',
    'qr.invitation.print': '\u5370\u5237',
    'qr.invitation.copyLink': '\u30ea\u30f3\u30af\u3092\u30b3\u30d4\u30fc',
    'qr.invitation.linkCopied': '\u30ea\u30f3\u30af\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f',
    'qr.invitation.close': '\u9589\u3058\u308b',
    'qr.invitation.invalid': '\u3053\u306e\u30e1\u30f3\u30d0\u30fc\u306b\u306f\u6709\u52b9\u306a\u62db\u5f85\u30b3\u30fc\u30c9\u304c\u3042\u308a\u307e\u305b\u3093\u3002Digital Register \u306e Resend Invite \u3067\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
    'qr.invitation.personalNote': '\u3053\u306e\u30b3\u30fc\u30c9\u306f\u500b\u4eba\u7528\u3067\u3059\uff1a\u3053\u306e\u30e1\u30f3\u30d0\u30fc\u306e\u5e2d\u306b\u306e\u307f\u3064\u306a\u304c\u308a\u307e\u3059\u3002',
  },
  ko: {
    'qr.invitation.title': '\uadf8\ub8f9 \ucd08\ub300',
    'qr.invitation.scanToJoin': '\uc2a4\uce94\ud558\uc5ec \uc774 \uadf8\ub8f9\uc5d0 \ucc38\uc5ec\ud558\uc138\uc694',
    'qr.invitation.personalFor': '\uac1c\uc778 \ucd08\ub300:',
    'qr.invitation.download': '\ub2e4\uc6b4\ub85c\ub4dc',
    'qr.invitation.print': '\uc778\uc1c4',
    'qr.invitation.copyLink': '\ub9c1\ud06c \ubcf5\uc0ac',
    'qr.invitation.linkCopied': '\ub9c1\ud06c\uac00 \ubcf5\uc0ac\ub418\uc5c8\uc2b5\ub2c8\ub2e4',
    'qr.invitation.close': '\ub2eb\uae30',
    'qr.invitation.invalid': '\uc774 \ud68c\uc6d0\uc5d0\uac8c \uc720\ud6a8\ud55c \ucd08\ub300 \ucf54\ub4dc\uac00 \uc5c6\uc2b5\ub2c8\ub2e4. Digital Register\uc758 Resend Invite\ub85c \ub9cc\ub4dc\uc138\uc694.',
    'qr.invitation.personalNote': '\uc774 \ucf54\ub4dc\ub294 \uac1c\uc778\uc6a9\uc785\ub2c8\ub2e4: \uc774 \ud68c\uc6d0\uc758 \uadf8\ub8f9 \uc790\ub9ac\ub85c\ub9cc \uc5f0\uacb0\ub429\ub2c8\ub2e4.',
  },
  hi: {
    'qr.invitation.title': '\u0938\u092e\u0942\u0939 \u0928\u093f\u092e\u0902\u0924\u094d\u0930\u0923',
    'qr.invitation.scanToJoin': '\u0907\u0938 \u0938\u092e\u0942\u0939 \u092e\u0947\u0902 \u0936\u093e\u092e\u093f\u0932 \u0939\u094b\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0938\u094d\u0915\u0948\u0928 \u0915\u0930\u0947\u0902',
    'qr.invitation.personalFor': '\u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0928\u093f\u092e\u0902\u0924\u094d\u0930\u0923:',
    'qr.invitation.download': '\u0921\u093e\u0909\u0928\u0932\u094b\u0921',
    'qr.invitation.print': '\u092a\u094d\u0930\u093f\u0902\u091f',
    'qr.invitation.copyLink': '\u0932\u093f\u0902\u0915 \u0915\u0949\u092a\u0940 \u0915\u0930\u0947\u0902',
    'qr.invitation.linkCopied': '\u0932\u093f\u0902\u0915 \u0915\u0949\u092a\u0940 \u0939\u094b \u0917\u092f\u093e',
    'qr.invitation.close': '\u092c\u0902\u0926 \u0915\u0930\u0947\u0902',
    'qr.invitation.invalid': '\u0907\u0938 \u0938\u0926\u0938\u094d\u092f \u0915\u0947 \u0932\u093f\u090f \u0915\u094b\u0908 \u092e\u093e\u0928\u094d\u092f \u0928\u093f\u092e\u0902\u0924\u094d\u0930\u0923 \u0915\u094b\u0921 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 Digital Register \u092e\u0947\u0902 Resend Invite \u0938\u0947 \u092c\u0928\u093e\u090f\u0902\u0964',
    'qr.invitation.personalNote': '\u092f\u0939 \u0915\u094b\u0921 \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0939\u0948: \u092f\u0939 \u0915\u0947\u0935\u0932 \u0907\u0938 \u0938\u0926\u0938\u094d\u092f \u0915\u0947 \u0938\u094d\u0925\u093e\u0928 \u0924\u0915 \u0932\u0947 \u091c\u093e\u0924\u093e \u0939\u0948\u0964',
  },
};

export function qrT(lang: QrLang, key: QrKey): string {
  return T[lang]?.[key] || T.en[key];
}

// Picks the browser language when it is one we support, English otherwise.
export function detectQrLang(): QrLang {
  if (typeof navigator === 'undefined') return 'en';
  const code = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return (QR_LANGS.some(l => l.code === code) ? code : 'en') as QrLang;
}
