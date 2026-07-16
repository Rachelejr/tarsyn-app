'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

type BillingPeriod = 'monthly' | 'annual';

// ============ LANGUAGE SYSTEM — same 25 languages as homepage, 5 fully translated + English fallback ============
const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'ht', label: '🇭🇹 Kreyòl ayisyen' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇧🇷 Português' },
  { code: 'other', label: '➕ Other / Autre' },
];

const SUB_T: Record<string, Record<string, string>> = {
  en: {
    title: 'Choose the Perfect Plan for Your Community', subtitle: 'Start for free and upgrade only when your organization grows.',
    trial: '30-Day Free Trial', cancel: 'Cancel Anytime', secure: 'Secure Payments',
    monthly: 'Monthly', annual: 'Annual', save: 'SAVE 17%',
    compare: 'Compare Plans', compareSub: "See exactly what's included in each plan.",
    why: 'Why Choose TARSYN', whySub: 'Built specifically for community savings groups.',
    reviewsTitle: 'What Our Community Says', reviewsSub: 'Your experience matters — share it with future organizers.',
    leaveReview: 'Leave a Testimonial', reviewCta: "Are you a TARSYN organizer or member? We'd love to hear from you.",
    faqTitle: 'Pricing Questions', faqSub: 'Everything you need to know about billing.',
    payments: 'Secure Payments',
  },
  fr: {
    title: 'Choisissez le forfait parfait pour votre communauté', subtitle: "Commencez gratuitement et évoluez seulement quand votre organisation grandit.",
    trial: 'Essai gratuit de 30 jours', cancel: 'Annulez à tout moment', secure: 'Paiements sécurisés',
    monthly: 'Mensuel', annual: 'Annuel', save: 'ÉCONOMISEZ 17%',
    compare: 'Comparer les forfaits', compareSub: 'Voyez exactement ce qui est inclus dans chaque forfait.',
    why: 'Pourquoi choisir TARSYN', whySub: 'Conçu spécifiquement pour les groupes d\u2019épargne communautaire.',
    reviewsTitle: 'Ce que dit notre communauté', reviewsSub: 'Votre expérience compte — partagez-la avec de futurs organisateurs.',
    leaveReview: 'Laisser un témoignage', reviewCta: 'Vous êtes organisateur ou membre TARSYN ? Nous aimerions vous entendre.',
    faqTitle: 'Questions sur la facturation', faqSub: 'Tout ce que vous devez savoir sur la facturation.',
    payments: 'Paiements sécurisés',
  },
  ht: {
    title: 'Chwazi Pi Bon Plan Pou Kominote W', subtitle: 'Kòmanse gratis epi monte sèlman lè òganizasyon w ap grandi.',
    trial: '30 Jou Esè Gratis', cancel: 'Anile Nenpòt Kilè', secure: 'Peman Sekirize',
    monthly: 'Chak Mwa', annual: 'Chak Ane', save: 'EKONOMIZE 17%',
    compare: 'Konpare Plan Yo', compareSub: 'Gade egzakteman sa ki enkli nan chak plan.',
    why: 'Poukisa Chwazi TARSYN', whySub: 'Fèt espesyalman pou gwoup epay kominotè yo.',
    reviewsTitle: 'Sa Kominote Nou An Di', reviewsSub: 'Eksperyans ou konte — pataje l ak fiti òganizatè yo.',
    leaveReview: 'Kite yon Temwayaj', reviewCta: 'Ou se yon òganizatè oswa manm TARSYN? Nou ta renmen tande ou.',
    faqTitle: 'Kesyon sou Peman', faqSub: 'Tout sa ou bezwen konnen sou fakti.',
    payments: 'Peman Sekirize',
  },
  es: {
    title: 'Elige el Plan Perfecto para tu Comunidad', subtitle: 'Empieza gratis y mejora solo cuando tu organización crezca.',
    trial: 'Prueba Gratis de 30 Días', cancel: 'Cancela Cuando Quieras', secure: 'Pagos Seguros',
    monthly: 'Mensual', annual: 'Anual', save: 'AHORRA 17%',
    compare: 'Comparar Planes', compareSub: 'Ve exactamente qué incluye cada plan.',
    why: 'Por Qué Elegir TARSYN', whySub: 'Diseñado específicamente para grupos de ahorro comunitario.',
    reviewsTitle: 'Lo Que Dice Nuestra Comunidad', reviewsSub: 'Tu experiencia importa — compártela con futuros organizadores.',
    leaveReview: 'Dejar un Testimonio', reviewCta: '¿Eres organizador o miembro de TARSYN? Nos encantaría saber de ti.',
    faqTitle: 'Preguntas sobre Precios', faqSub: 'Todo lo que necesitas saber sobre la facturación.',
    payments: 'Pagos Seguros',
  },
  pt: {
    title: 'Escolha o Plano Perfeito para Sua Comunidade', subtitle: 'Comece grátis e atualize apenas quando sua organização crescer.',
    trial: 'Teste Grátis de 30 Dias', cancel: 'Cancele a Qualquer Momento', secure: 'Pagamentos Seguros',
    monthly: 'Mensal', annual: 'Anual', save: 'ECONOMIZE 17%',
    compare: 'Comparar Planos', compareSub: 'Veja exatamente o que está incluído em cada plano.',
    why: 'Por Que Escolher a TARSYN', whySub: 'Criado especificamente para grupos de poupança comunitária.',
    reviewsTitle: 'O Que Nossa Comunidade Diz', reviewsSub: 'Sua experiência importa — compartilhe com futuros organizadores.',
    leaveReview: 'Deixar um Depoimento', reviewCta: 'Você é organizador ou membro da TARSYN? Adoraríamos ouvir você.',
    faqTitle: 'Perguntas Sobre Cobrança', faqSub: 'Tudo o que você precisa saber sobre cobrança.',
    payments: 'Pagamentos Seguros',
  },
};
// Fallback rule: Manual → English → key itself. Never show broken/empty text.
const st = (lang: string, key: string) => {
  const value = SUB_T[lang]?.[key];
  const isBroken = !value || value.includes('\uFFFD') || value.trim().length === 0;
  if (!isBroken) return value;
  return SUB_T['en'][key] || key;
};

const FAQ_ITEMS = [
  { key: 'changePlans' },
  { key: 'exceedLimit' },
  { key: 'freeTrial' },
  { key: 'cancelAnytime' },
  { key: 'annualDiscount' },
];

const FAQ_T: Record<string, Record<string, { q: string; a: string }>> = {
  en: {
    changePlans: { q: 'Can I change plans later?', a: 'Yes, you can upgrade or downgrade your plan at any time from this page. Changes take effect immediately.' },
    exceedLimit: { q: 'What happens if I exceed my member limit?', a: 'You can add more members for a small increment, shown on each plan card, or upgrade to the next tier.' },
    freeTrial: { q: 'Is there a free trial?', a: 'Yes, every new account starts with a 30-day free trial with access to Starter features.' },
    cancelAnytime: { q: 'Can I cancel anytime?', a: 'Yes, there are no long-term contracts. You can cancel your subscription at any time from this page.' },
    annualDiscount: { q: 'Do you offer discounts for annual billing?', a: 'Yes, switching to annual billing saves you up to 17% compared to paying monthly.' },
  },
  fr: {
    changePlans: { q: 'Puis-je changer de forfait plus tard ?', a: 'Oui, vous pouvez passer à un forfait supérieur ou inférieur à tout moment depuis cette page. Les changements prennent effet immédiatement.' },
    exceedLimit: { q: 'Que se passe-t-il si je dépasse ma limite de membres ?', a: 'Vous pouvez ajouter des membres supplémentaires pour un petit montant, indiqué sur chaque carte de forfait, ou passer au palier supérieur.' },
    freeTrial: { q: 'Y a-t-il un essai gratuit ?', a: 'Oui, chaque nouveau compte commence avec un essai gratuit de 30 jours donnant accès aux fonctionnalités Starter.' },
    cancelAnytime: { q: 'Puis-je annuler à tout moment ?', a: 'Oui, il n\u2019y a aucun engagement à long terme. Vous pouvez annuler votre abonnement à tout moment depuis cette page.' },
    annualDiscount: { q: 'Proposez-vous des réductions pour la facturation annuelle ?', a: 'Oui, passer à la facturation annuelle vous fait économiser jusqu\u2019à 17% par rapport au paiement mensuel.' },
  },
  ht: {
    changePlans: { q: 'Mwen ka chanje plan pita?', a: 'Wi, ou ka monte oswa desann plan ou nenpòt kilè soti nan paj sa a. Chanjman yo aplike imedyatman.' },
    exceedLimit: { q: 'Kisa ki rive si m depase limit manm mwen an?', a: 'Ou ka ajoute plis manm pou yon ti ogmantasyon, ki make sou chak kat plan, oswa monte nan nivo pi wo a.' },
    freeTrial: { q: 'Èske gen yon esè gratis?', a: 'Wi, chak nouvo kont kòmanse ak yon esè gratis 30 jou ki bay aksè a fonksyonalite Starter yo.' },
    cancelAnytime: { q: 'Mwen ka anile nenpòt kilè?', a: 'Wi, pa gen kontra alontèm. Ou ka anile abònman w nenpòt kilè soti nan paj sa a.' },
    annualDiscount: { q: 'Èske nou ofri rabè pou fakti chak ane?', a: 'Wi, chanje pou fakti chak ane fè w ekonomize jiska 17% konpare ak peman chak mwa.' },
  },
  es: {
    changePlans: { q: '¿Puedo cambiar de plan más adelante?', a: 'Sí, puedes subir o bajar de plan en cualquier momento desde esta página. Los cambios se aplican de inmediato.' },
    exceedLimit: { q: '¿Qué pasa si supero mi límite de miembros?', a: 'Puedes agregar más miembros por un pequeño incremento, indicado en cada tarjeta de plan, o subir al siguiente nivel.' },
    freeTrial: { q: '¿Hay una prueba gratuita?', a: 'Sí, cada cuenta nueva comienza con una prueba gratuita de 30 días con acceso a las funciones de Starter.' },
    cancelAnytime: { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, no hay contratos a largo plazo. Puedes cancelar tu suscripción en cualquier momento desde esta página.' },
    annualDiscount: { q: '¿Ofrecen descuentos por facturación anual?', a: 'Sí, cambiar a facturación anual te ahorra hasta un 17% comparado con el pago mensual.' },
  },
  pt: {
    changePlans: { q: 'Posso mudar de plano depois?', a: 'Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento nesta página. As mudanças têm efeito imediato.' },
    exceedLimit: { q: 'O que acontece se eu exceder meu limite de membros?', a: 'Você pode adicionar mais membros por um pequeno acréscimo, mostrado em cada cartão de plano, ou fazer upgrade para o próximo nível.' },
    freeTrial: { q: 'Existe um teste grátis?', a: 'Sim, toda nova conta começa com um teste grátis de 30 dias com acesso aos recursos do Starter.' },
    cancelAnytime: { q: 'Posso cancelar a qualquer momento?', a: 'Sim, não há contratos de longo prazo. Você pode cancelar sua assinatura a qualquer momento nesta página.' },
    annualDiscount: { q: 'Vocês oferecem descontos para cobrança anual?', a: 'Sim, mudar para cobrança anual economiza até 17% em comparação com o pagamento mensal.' },
  },
};
const fq = (lang: string, key: string, field: 'q' | 'a') => {
  const value = FAQ_T[lang]?.[key]?.[field];
  const isBroken = !value || value.includes('\uFFFD') || value.trim().length === 0;
  if (!isBroken) return value;
  return FAQ_T['en'][key][field];
};

interface PlanDef {
  id: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise';
  name: string;
  color: string;
  icon: string;
  badge?: string;
  description: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  priceIdMonthly: string | null;
  priceIdAnnual: string | null;
  members: string;
  groups: string;
  reports: string;
  support: string;
  additional: string[];
  ctaAction: 'checkout' | 'current' | 'contact';
  ctaLabel: string;
  scaling?: { membersIncrement: number; priceIncrement: number };
}

const SALES_EMAIL = 'sales@tarsyn-app.com';

const PRICE_ID_TO_PLAN: Record<string, PlanDef['id']> = {
  'price_1TipthJk3DYYTrgp7LEDrLgE': 'starter',
  'price_1Tiq1IJk3DYYTrgp2VmhXb6J': 'growth',
  'price_1Tiq3AJk3DYYTrgpuElHGRxd': 'pro',
  'price_1TjVjQJk3DYYTrgpEDu8Ofyl': 'starter',
  'price_1TjVjQJk3DYYTrgpEDu8OfyI': 'starter',
  'price_1TjVjQJk3DYYTrgpOaG0DWjU': 'starter',
  'price_1TjX5gJk3DYYTrgpw5ngPx4P': 'growth',
  'price_1TjX5gJk3DYYTrgp6xy976sv': 'growth',
  'price_1TjXA0Jk3DYYTrgpL0cf12Mw': 'pro',
  'price_1TjXA0Jk3DYYTrgp6shxK6SC': 'pro',
  'price_1TkzC7JBtj4UALaPm0ZOEB1T': 'starter',
  'price_1TkzC7JBtj4UALaPhySF1Nb1': 'starter',
  'price_1TkzC9JBtj4UALaPZZIBDCV3': 'growth',
  'price_1TkzC8JBtj4UALaPtELbrfO9': 'growth',
  'price_1TkzC3JBtj4UALaPFseCERie': 'pro',
  'price_1TkzC2JBtj4UALaPBvORrRyy': 'pro',
};

const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'Free',
    color: '#6B2D4E',
    icon: '🎁',
    description: 'Trial and onboarding',
    priceMonthly: 0,
    priceAnnual: 0,
    priceIdMonthly: null,
    priceIdAnnual: null,
    members: 'Up to 15 Members',
    groups: '1 group',
    reports: 'Basic dashboard',
    support: 'Limited notifications',
    additional: ['Member invitations'],
    ctaAction: 'current',
    ctaLabel: 'Current Plan',
  },
  {
    id: 'starter',
    name: 'Starter',
    color: '#6B2D4E',
    icon: '🚀',
    badge: 'MOST CHOSEN',
    description: 'Families, small tontines, churches',
    priceMonthly: 14.99,
    priceAnnual: 149,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || 'price_STARTER_MONTHLY_REPLACE_ME',
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || 'price_STARTER_ANNUAL_REPLACE_ME',
    members: 'Up to 100 Members',
    groups: '2 groups',
    reports: 'Basic reports',
    support: 'Email support',
    additional: ['Everything in Free', 'Reminders', 'Document Center', 'White label (Basic)'],
    ctaAction: 'checkout',
    ctaLabel: 'Get Starter',
    scaling: { membersIncrement: 100, priceIncrement: 5 },
  },
  {
    id: 'growth',
    name: 'Growth',
    color: '#4A1F38',
    icon: '📈',
    badge: 'MOST POPULAR - SAVE UP TO 17%',
    description: 'Growing organizations',
    priceMonthly: 29.99,
    priceAnnual: 299,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY || 'price_GROWTH_MONTHLY_REPLACE_ME',
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL || 'price_GROWTH_ANNUAL_REPLACE_ME',
    members: 'Up to 300 Members',
    groups: '10 groups',
    reports: 'Advanced reports',
    support: 'Priority support',
    additional: ['Everything in Starter', 'Export tools', 'White label (Advanced)'],
    ctaAction: 'checkout',
    ctaLabel: 'Get Growth',
    scaling: { membersIncrement: 100, priceIncrement: 4 },
  },
  {
    id: 'pro',
    name: 'Pro',
    color: '#4A1F38',
    icon: '👑',
    badge: 'BEST VALUE',
    description: 'Professional organizations',
    priceMonthly: 59.99,
    priceAnnual: 599,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_PRO_MONTHLY_REPLACE_ME',
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || 'price_PRO_ANNUAL_REPLACE_ME',
    members: 'Up to 1500 Members',
    groups: '50 groups',
    reports: 'Advanced administration',
    support: 'Dedicated support',
    additional: ['Everything in Growth', 'White label (Professional)'],
    ctaAction: 'checkout',
    ctaLabel: 'Get Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    color: '#1A0F26',
    icon: '🏢',
    description: 'Large institutions',
    priceMonthly: null,
    priceAnnual: null,
    priceIdMonthly: null,
    priceIdAnnual: null,
    members: 'Unlimited Members',
    groups: 'Unlimited groups',
    reports: 'Advanced administration',
    support: 'SLA support',
    additional: ['Everything in Pro', 'White label (Full Customization)', 'Dedicated onboarding'],
    ctaAction: 'contact',
    ctaLabel: 'Contact Sales',
  },
];

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD' }}>
    <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading...</p>
  </div>
);

function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [lang, setLang] = useState('en');
  const [showLangModal, setShowLangModal] = useState(false);
  const [customLang, setCustomLang] = useState('');

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success) setShowSuccess(true);
    if (canceled) setShowCanceled(true);
    if (success || canceled) {
      router.replace('/dashboard/subscription');
    }
  }, [success, canceled, router]);

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 5000);
    return () => clearTimeout(t);
  }, [showSuccess]);

  useEffect(() => {
    if (!showCanceled) return;
    const t = setTimeout(() => setShowCanceled(false), 5000);
    return () => clearTimeout(t);
  }, [showCanceled]);

  useEffect(() => {
    if (!checkoutError) return;
    const t = setTimeout(() => setCheckoutError(null), 5000);
    return () => clearTimeout(t);
  }, [checkoutError]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      const userDoc = await getDoc(doc(db, 'users', u.uid));
      if (userDoc.exists()) {
        setSubscription(userDoc.data()?.subscription);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const rawPlan: string = subscription?.plan || '';
  const activePlanId: string = PRICE_ID_TO_PLAN[rawPlan] || 'free';

  const handleSubscribe = async (priceId: string | null, planName: string) => {
    if (!priceId || !user) return;
    if (priceId.includes('REPLACE_ME')) {
      setCheckoutError(`This plan (${planName}) is not fully configured yet. Please contact support.`);
      console.error('Blocked checkout: placeholder priceId not replaced by env var for', planName, priceId);
      return;
    }
    setCheckoutError(null);
    setCheckoutLoading(planName);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          email: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        console.error('Checkout failed:', data);
        setCheckoutError(data.error || 'Could not start checkout. Please try again or contact support.');
        setCheckoutLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setCheckoutError('Could not start checkout. Please check your connection and try again.');
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your current billing period.')) return;
    setActionLoading('cancel');
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Your subscription has been canceled and will end at the end of the current billing period.');
        window.location.reload();
      } else {
        alert('Failed to cancel subscription. Please try again or contact support.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to cancel subscription. Please try again or contact support.');
    }
    setActionLoading(null);
  };

  const handleUpdateSubscription = async (newPriceId: string | null, planName: string) => {
    if (!newPriceId || !user) return;
    if (newPriceId.includes('REPLACE_ME')) {
      setCheckoutError(`This plan (${planName}) is not fully configured yet. Please contact support.`);
      return;
    }
    setCheckoutError(null);
    setActionLoading(planName);
    try {
      const res = await fetch('/api/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, newPriceId }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        console.error('Update subscription failed:', data);
        setCheckoutError(data.error || 'Failed to update subscription. Please try again or contact support.');
      }
    } catch (e) {
      console.error(e);
      setCheckoutError('Failed to update subscription. Please try again or contact support.');
    }
    setActionLoading(null);
  };

  const handleContactSales = () => {
    window.location.href = `mailto:${SALES_EMAIL}?subject=Enterprise%20plan%20inquiry%20-%20TARSYN`;
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @media (max-width: 860px) {
          .tarsyn-plans-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }
          .tarsyn-page-container {
            padding: 24px 16px !important;
          }
        }
        .tarsyn-cta-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .tarsyn-cta-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .tarsyn-cta-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .tarsyn-plan-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .tarsyn-plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(107,45,78,0.18) !important;
          border-color: #E9C77B !important;
        }
        .tarsyn-price-value {
          transition: opacity 0.2s ease;
        }
      `}</style>

      <nav style={{ background: '#6B2D4E', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <img src="/tarsyn-logo-white.svg" alt="TARSYN" style={{ height: '48px', width: 'auto', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select value={lang} onChange={(e) => { if (e.target.value === 'other') { setShowLangModal(true); } else { setLang(e.target.value); } }}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid rgba(251,238,221,0.4)', background: 'rgba(251,238,221,0.1)', color: '#FBEEDD', fontSize: '12.5px', cursor: 'pointer', outline: 'none', fontWeight: 500, maxWidth: '180px' }}>
            {LANGUAGES.map((l) => (<option key={l.code} value={l.code} style={{ color: '#4A1F38' }}>{l.label}</option>))}
          </select>
          <button onClick={() => auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: '#E9C77B', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            Sign Out
          </button>
        </div>
      </nav>

      {showLangModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: '#6B2D4E', marginBottom: '8px', fontSize: '18px', fontWeight: 700 }}>➕ Add Your Language</h3>
            <p style={{ color: '#6B2D4E', fontSize: '13px', marginBottom: '20px' }}>Your language isn&apos;t in the list? Tell us — we&apos;ll add it!</p>
            <input type="text" placeholder="Ex: Fon, Twi, Soninke, Zarma..." value={customLang} onChange={(e) => setCustomLang(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D9C0CC', borderRadius: '8px', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { if (customLang.trim()) { alert(`✅ Thank you! "${customLang}" has been submitted. We will add it soon!`); setShowLangModal(false); setCustomLang(''); } else { alert('Please enter a language name.'); } }}
                style={{ flex: 1, padding: '12px', background: '#6B2D4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Submit Language
              </button>
              <button onClick={() => setShowLangModal(false)}
                style={{ padding: '12px 16px', background: '#EAD9BE', border: 'none', borderRadius: '8px', fontSize: '14px', color: '#6B2D4E', cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="tarsyn-page-container" style={{ maxWidth: '1300px', width: '92%', margin: '0 auto', padding: '40px 24px' }}>
        {showSuccess && (
          <div style={{ background: '#E8F5E9', borderRadius: '12px', padding: '12px 18px', marginBottom: '12px', color: '#2E7D32', fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span>Subscription activated successfully. Welcome to TARSYN.</span>
            <button onClick={() => setShowSuccess(false)} style={{ background: 'transparent', border: 'none', color: '#2E7D32', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>×</button>
          </div>
        )}
        {showCanceled && (
          <div style={{ background: '#FFF3E0', borderRadius: '12px', padding: '12px 18px', marginBottom: '12px', color: '#E65100', fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span>Checkout canceled. You can try again anytime.</span>
            <button onClick={() => setShowCanceled(false)} style={{ background: 'transparent', border: 'none', color: '#E65100', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>×</button>
          </div>
        )}
        {checkoutError && (
          <div style={{ background: '#FDECEA', borderRadius: '12px', padding: '12px 18px', marginBottom: '12px', color: '#C62828', fontWeight: 600, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span>{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} style={{ background: 'transparent', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>×</button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#4A1F38', fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            {st(lang, 'title')}
          </h1>
          <p style={{ color: '#6B2D4E', fontSize: '15px', margin: '0 0 16px' }}>
            {st(lang, 'subtitle')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#6B2D4E', fontWeight: 600 }}>
            <span>✔ {st(lang, 'trial')}</span>
            <span>✔ {st(lang, 'cancel')}</span>
            <span>✔ {st(lang, 'secure')}</span>
          </div>
        </div>

        {(subscription?.status === 'active' || subscription?.status === 'trialing') && (
          <div style={{ background: 'white', borderRadius: '10px', padding: '8px 14px', marginBottom: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <p style={{ color: '#2E7D32', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>
              {subscription.status === 'trialing' ? 'Free Trial Active' : 'Subscription Active'}
            </p>
            <p style={{ color: '#6B2D4E', fontSize: '11px', margin: 0 }}>
              {subscription.status === 'trialing'
                ? `Trial ends: ${new Date(subscription.trialEnd).toLocaleDateString()}`
                : `Renews: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', background: 'white', borderRadius: '12px', padding: '4px', boxShadow: '0 4px 16px rgba(107,45,78,0.10)' }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{
                padding: '10px 22px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700,
                background: billingPeriod === 'monthly' ? '#6B2D4E' : 'transparent',
                color: billingPeriod === 'monthly' ? '#FBEEDD' : '#6B2D4E',
                transition: 'all 0.2s ease',
              }}>
              {st(lang, 'monthly')}
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              style={{
                padding: '10px 22px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                background: billingPeriod === 'annual' ? '#6B2D4E' : 'transparent',
                color: billingPeriod === 'annual' ? '#FBEEDD' : '#6B2D4E',
                transition: 'all 0.2s ease',
              }}>
              {st(lang, 'annual')}
              <span style={{
                background: billingPeriod === 'annual' ? '#E9C77B' : '#E8F5E9',
                color: billingPeriod === 'annual' ? '#4A1F38' : '#2E7D32',
                fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '999px',
              }}>
                {st(lang, 'save')}
              </span>
            </button>
          </div>
        </div>

        <div className="tarsyn-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '18px', alignItems: 'stretch' }}>
          {PLANS.map((plan) => {
            const isCurrent = activePlanId === plan.id;
            const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
            const priceId = billingPeriod === 'monthly' ? plan.priceIdMonthly : plan.priceIdAnnual;
            const periodLabel = plan.priceMonthly === null ? '' : billingPeriod === 'monthly' ? '/month' : '/year';
            const hasActiveSub = subscription?.status === 'active' || subscription?.status === 'trialing';
            const annualSavings = plan.priceMonthly && plan.priceAnnual ? Math.round(plan.priceMonthly * 12 - plan.priceAnnual) : 0;

            return (
              <div key={plan.id} className="tarsyn-plan-card" style={{
                background: 'white', borderRadius: '22px', padding: '26px 20px',
                boxShadow: plan.badge ? '0 12px 40px rgba(107,45,78,0.16)' : '0 4px 20px rgba(0,0,0,0.05)',
                border: isCurrent ? '2px solid #2E7D32' : (plan.badge ? `2px solid ${plan.color}` : '2px solid #F0E4D0'),
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}>
                {plan.badge && !isCurrent && (
                  <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: plan.color, color: '#E9C77B', padding: '6px 16px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {plan.badge}
                  </div>
                )}

                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: '#2E7D32', color: 'white', padding: '6px 16px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    YOUR CURRENT PLAN
                  </div>
                )}

                <div style={{ fontSize: '32px', textAlign: 'center', margin: '4px 0 10px' }}>{plan.icon}</div>

                <h3 style={{ color: plan.color, fontSize: '18px', fontWeight: 800, margin: '0 0 2px', textAlign: 'center' }}>{plan.name}</h3>
                <p style={{ color: '#8A7A6D', fontSize: '11px', margin: '0 0 16px', textAlign: 'center', minHeight: '28px' }}>{plan.description}</p>

                <div style={{ margin: '0 0 4px', textAlign: 'center' }}>
                  {price === null ? (
                    <span className="tarsyn-price-value" style={{ color: '#4A1F38', fontSize: '30px', fontWeight: 800 }}>Custom</span>
                  ) : (
                    <>
                      <span className="tarsyn-price-value" style={{ color: '#4A1F38', fontSize: '34px', fontWeight: 800 }}>${price}</span>
                      <span style={{ color: '#8A7A6D', fontSize: '13px' }}>{periodLabel}</span>
                    </>
                  )}
                </div>
                <p style={{ color: '#8A7A6D', fontSize: '10px', margin: '0 0 16px', textAlign: 'center' }}>
                  {price === null
                    ? '\u00A0'
                    : billingPeriod === 'annual' && annualSavings > 0
                      ? `Save $${annualSavings}/year`
                      : billingPeriod === 'monthly'
                        ? 'Billed Monthly'
                        : '\u00A0'}
                </p>

                <div style={{ margin: '0 0 12px', textAlign: 'center' }}>
                  <p style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 700, margin: '0 0 2px' }}>{plan.members}</p>
                  <p style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 700, margin: 0 }}>{plan.groups}</p>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 6px', color: '#4A1F38', fontSize: '12px', flexGrow: 1 }}>
                  <li style={{ marginBottom: '7px', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                    <span style={{ color: '#1D9E75', fontWeight: 800, flexShrink: 0 }}>✔</span>{plan.reports}
                  </li>
                  <li style={{ marginBottom: '7px', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                    <span style={{ color: '#1D9E75', fontWeight: 800, flexShrink: 0 }}>✔</span>{plan.support}
                  </li>
                  {plan.additional.map((f) => (
                    <li key={f} style={{ marginBottom: '7px', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                      <span style={{ color: '#1D9E75', fontWeight: 800, flexShrink: 0 }}>✔</span>{f}
                    </li>
                  ))}
                </ul>

                {plan.scaling && (
                  <p style={{ color: '#8A7A6D', fontSize: '9px', margin: '0 0 8px', fontStyle: 'italic', textAlign: 'center' }}>
                    +{plan.scaling.membersIncrement} members = +${plan.scaling.priceIncrement}/mo
                  </p>
                )}

                {plan.ctaAction === 'checkout' && (
                  isCurrent ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
                      <button
                        disabled
                        style={{
                          width: '100%', height: '38px', background: '#FBEEDD', color: '#2E7D32',
                          borderRadius: '10px', border: '1px solid #2E7D32',
                          fontSize: '12px', fontWeight: 700, cursor: 'default',
                        }}>
                        Current Plan
                      </button>
                      {!subscription?.cancelAtPeriodEnd ? (
                        <button
                          onClick={handleCancelSubscription}
                          disabled={actionLoading === 'cancel'}
                          style={{
                            width: '100%', height: '30px', background: 'transparent', color: '#C62828',
                            borderRadius: '8px', border: '1px solid #C62828',
                            fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                            opacity: actionLoading === 'cancel' ? 0.6 : 1,
                          }}>
                          {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel subscription'}
                        </button>
                      ) : (
                        <p style={{ fontSize: '9px', color: '#C62828', textAlign: 'center', margin: 0 }}>
                          Cancels on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'period end'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      className="tarsyn-cta-btn"
                      onClick={() => {
                        if (hasActiveSub) {
                          handleUpdateSubscription(priceId, plan.name);
                        } else {
                          handleSubscribe(priceId, plan.name);
                        }
                      }}
                      disabled={checkoutLoading === plan.name || actionLoading === plan.name}
                      style={{
                        width: '100%', height: '38px', background: plan.color, color: '#FBEEDD',
                        borderRadius: '10px', border: 'none',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        opacity: (checkoutLoading === plan.name || actionLoading === plan.name) ? 0.6 : 1,
                        marginTop: 'auto',
                      }}>
                      {checkoutLoading === plan.name || actionLoading === plan.name
                        ? 'Loading...'
                        : hasActiveSub
                          ? `Switch to ${plan.name}`
                          : plan.ctaLabel}
                    </button>
                  )
                )}

                {plan.ctaAction === 'current' && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    style={{ width: '100%', height: '38px', background: '#FBEEDD', color: '#6B2D4E', borderRadius: '10px', border: '1px solid #6B2D4E', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}>
                    {isCurrent ? 'Current Plan' : 'Free Plan'}
                  </button>
                )}

                {plan.ctaAction === 'contact' && (
                  <button
                    className="tarsyn-cta-btn"
                    onClick={handleContactSales}
                    style={{
                      width: '100%', height: '38px', background: 'transparent', color: plan.color,
                      borderRadius: '10px', border: `1px solid ${plan.color}`,
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      marginTop: 'auto',
                    }}>
                    {plan.ctaLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '10px', background: 'white', borderRadius: '12px', padding: '10px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 800, margin: '0 0 2px' }}>Need Enterprise pricing?</h3>
          <p style={{ color: '#6B2D4E', fontSize: '10px', margin: '0 0 6px' }}>Contact TARSYN Sales Team</p>
          <button
            className="tarsyn-cta-btn"
            onClick={handleContactSales}
            style={{
              height: '30px', padding: '0 18px', background: '#6B2D4E', color: '#FBEEDD',
              borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              marginBottom: '8px',
            }}>
            Contact Us
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', color: '#6B2D4E', fontSize: '10px', fontWeight: 600 }}>
            <span>Cancel anytime</span>
            <span>No hidden fees</span>
            <span>Secure payments</span>
          </div>
        </div>

        {/* ===== PHASE 2: Feature comparison table ===== */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>{st(lang, 'compare')}</h2>
          <p style={{ color: '#8B5A73', fontSize: '13px', textAlign: 'center', margin: '0 0 24px' }}>{st(lang, 'compareSub')}</p>
          <div style={{ overflowX: 'auto', background: 'white', borderRadius: '14px', boxShadow: '0 2px 16px rgba(107,45,78,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EAD9BE' }}>
                  <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '12px', color: '#6B2D4E', fontWeight: 700 }}>Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} style={{ textAlign: 'center', padding: '14px 10px', fontSize: '12px', color: p.color, fontWeight: 800 }}>
                      {p.icon} {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Explicit cumulative feature matrix: each tier includes everything from the tiers before it.
                  // "unconfirmed" features (not verified as actually built) are deliberately left out until confirmed.
                  const TIER_ORDER = ['free', 'starter', 'growth', 'pro', 'enterprise'];
                  const FEATURE_INTRODUCED_AT: { label: string; introducedAt: string }[] = [
                    { label: 'Member invitations', introducedAt: 'free' },
                    { label: 'Reminders', introducedAt: 'starter' },
                    { label: 'Document Center', introducedAt: 'starter' },
                    { label: 'Export tools', introducedAt: 'growth' },
                    { label: 'Dedicated onboarding', introducedAt: 'enterprise' },
                  ];
                  const WHITE_LABEL_TIER: Record<string, string> = {
                    free: '—',
                    starter: 'Basic',
                    growth: 'Advanced',
                    pro: 'Professional',
                    enterprise: 'Full Customization',
                  };
                  const hasFeature = (planId: string, introducedAt: string) =>
                    TIER_ORDER.indexOf(planId) >= TIER_ORDER.indexOf(introducedAt);

                  const rows: { label: string; get: (p: PlanDef) => string | boolean }[] = [
                    { label: 'Members', get: (p) => p.members },
                    { label: 'Groups', get: (p) => p.groups },
                    { label: 'Reports', get: (p) => p.reports },
                    { label: 'Support', get: (p) => p.support },
                    { label: 'White Label', get: (p) => WHITE_LABEL_TIER[p.id] },
                    ...FEATURE_INTRODUCED_AT.map((f) => ({
                      label: f.label,
                      get: (p: PlanDef) => hasFeature(p.id, f.introducedAt),
                    })),
                  ];

                  return rows.map((row, i) => (
                    <tr key={row.label} style={{ borderBottom: '1px solid #F5EBDC', background: i % 2 === 0 ? 'white' : '#FFFBF4' }}>
                      <td style={{ padding: '12px 16px', fontSize: '12.5px', color: '#4A1F38', fontWeight: 600 }}>{row.label}</td>
                      {PLANS.map((p) => {
                        const val = row.get(p);
                        return (
                          <td key={p.id} style={{ textAlign: 'center', padding: '12px 10px', fontSize: '12px', color: '#6B2D4E' }}>
                            {typeof val === 'boolean' ? (val ? <span style={{ color: '#3B8659', fontWeight: 800 }}>✓</span> : <span style={{ color: '#D9C0CC' }}>—</span>) : val}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== PHASE 3: Why Choose TARSYN ===== */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>{st(lang, 'why')}</h2>
          <p style={{ color: '#8B5A73', fontSize: '13px', textAlign: 'center', margin: '0 0 24px' }}>{st(lang, 'whySub')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { icon: '🌍', title: 'Built for Communities', desc: 'Designed specifically for tontines, sols, and sou-sous — with the app available in English, French, Haitian Creole, Spanish, Portuguese, and more.' },
              { icon: '🔒', title: 'Bank-Level Security', desc: 'Your data is encrypted and protected, with secure, PCI-compliant payment processing.' },
              { icon: '📊', title: 'Complete Transparency', desc: 'Automatic reports, audit logs, and full visibility for every member.' },
              { icon: '💬', title: 'Real Human Support', desc: 'Talk to a real person, not a bot, whenever you need help.' },
            ].map((f) => (
              <div key={f.title} style={{ background: 'white', borderRadius: '14px', padding: '20px 16px', textAlign: 'center', boxShadow: '0 2px 12px rgba(107,45,78,0.06)' }}>
                <div style={{ fontSize: '30px', marginBottom: '8px' }}>{f.icon}</div>
                <h3 style={{ color: '#6B2D4E', fontSize: '14px', fontWeight: 800, margin: '0 0 6px' }}>{f.title}</h3>
                <p style={{ color: '#8B5A73', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== PHASE 4a: Leave a testimonial CTA — real submission flow, connects to /leave-review (Firestore 'testimonials' collection, moderated) ===== */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>{st(lang, 'reviewsTitle')}</h2>
          <p style={{ color: '#8B5A73', fontSize: '13px', textAlign: 'center', margin: '0 0 20px' }}>{st(lang, 'reviewsSub')}</p>
          <div style={{ maxWidth: '520px', margin: '0 auto', background: 'white', borderRadius: '14px', padding: '28px', textAlign: 'center', boxShadow: '0 2px 16px rgba(107,45,78,0.08)' }}>
            <div style={{ fontSize: '30px', marginBottom: '10px' }}>💬</div>
            <p style={{ color: '#4A1F38', fontSize: '13.5px', margin: '0 0 18px', lineHeight: 1.6 }}>{st(lang, 'reviewCta')}</p>
            <a href="/leave-review" style={{ display: 'inline-block', padding: '12px 28px', background: '#6B2D4E', color: '#E9C77B', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none' }}>
              {st(lang, 'leaveReview')}
            </a>
          </div>
        </div>

        {/* ===== PHASE 4b: FAQ accordion ===== */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>{st(lang, 'faqTitle')}</h2>
          <p style={{ color: '#8B5A73', fontSize: '13px', textAlign: 'center', margin: '0 0 24px' }}>{st(lang, 'faqSub')}</p>
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={item.key} style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 6px rgba(107,45,78,0.06)', overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ color: '#4A1F38', fontSize: '13px', fontWeight: 700 }}>{fq(lang, item.key, 'q')}</span>
                  <span style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 700 }}>{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <p style={{ color: '#8B5A73', fontSize: '12.5px', lineHeight: 1.6, margin: 0, padding: '0 18px 16px' }}>{fq(lang, item.key, 'a')}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===== PHASE 4c: Payment badges ===== */}
        <div style={{ marginTop: '28px', marginBottom: '8px', textAlign: 'center' }}>
          <p style={{ color: '#8B5A73', fontSize: '11px', fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{st(lang, 'payments')}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {['Visa', 'Mastercard', 'Amex', 'PayPal'].map((name) => (
              <span key={name} style={{ background: 'white', border: '1px solid #EAD9BE', borderRadius: '8px', padding: '6px 14px', fontSize: '11.5px', fontWeight: 700, color: '#6B2D4E' }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ background: '#6B2D4E', textAlign: 'center', padding: '14px', color: 'rgba(251,238,221,0.6)', fontSize: '12px' }}>
        <span style={{ color: '#E9C77B', fontWeight: 700 }}>TARSYN&trade;</span>{' '}
        <span>A product of <strong style={{ color: 'rgba(251,238,221,0.9)' }}>Ma Production Luxenn Zara LLC</strong></span>
        {' '}&middot; &copy; 2026 All Rights Reserved &middot; Version 1.0.0
      </footer>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SubscriptionContent />
    </Suspense>
  );
}