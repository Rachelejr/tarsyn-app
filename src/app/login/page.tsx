'use client';
import { useState, useEffect } from 'react';
import Footer from '@/components/Footer';

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
  en:  { hero1:'The Smart Way to Manage', hero2:'Your Community', cta:'Create Free Account', signin:'Sign In', trusted:'TRUSTED BY 2,400+ COMMUNITIES', sub:'Track contributions, manage members, organize your activities, and view your reports automatically.', auto:'AUTO MODE', expert:'EXPERT MODE', startAuto:'Start with Auto Mode', startExpert:'Start with Expert Mode', modeTitle:'How do you want to use TARSYN?', modeSubtitle:'Choose the experience that fits your community.' },
  fr:  { hero1:'La façon intelligente de gérer', hero2:'votre communauté', cta:'Créer un compte gratuit', signin:'Se connecter', trusted:'UTILISÉ PAR PLUS DE 2 400 COMMUNAUTÉS', sub:'Suivez les contributions, gérez les membres, organisez vos activités et consultez vos rapports automatiquement.', auto:'MODE AUTO', expert:'MODE EXPERT', startAuto:'Commencer en mode auto', startExpert:'Commencer en mode expert', modeTitle:'Comment souhaitez-vous utiliser TARSYN ?', modeSubtitle:'Choisissez l\u2019expérience adaptée à votre communauté.' },
  ht:  { hero1:'Fason Entelijan pou Jere', hero2:'Kominote Ou', cta:'Kreye Kont Gratis', signin:'Konekte', trusted:'FÈ KONFYANS PA 2,400+ KOMINOTE', sub:'Swiv kontribisyon, jere manm, jenere resi ak rapò otomatikman.', auto:'MOD OTOMATIK', expert:'MOD EKSPÈ', startAuto:'Kòmanse ak Mod Otomatik', startExpert:'Kòmanse ak Mod Ekspè' },
  es:  { hero1:'La Forma Inteligente de Gestionar', hero2:'Tu Comunidad', cta:'Crear Cuenta Gratis', signin:'Iniciar Sesión', trusted:'USADO POR 2,400+ COMUNIDADES', sub:'Rastrea contribuciones, gestiona miembros, genera recibos e informes automáticamente.', auto:'MODO AUTO', expert:'MODO EXPERTO', startAuto:'Empezar en Modo Auto', startExpert:'Empezar en Modo Experto' },
  pt:  { hero1:'A Forma Inteligente de Gerir', hero2:'Sua Comunidade', cta:'Criar Conta Grátis', signin:'Entrar', trusted:'CONFIADO POR 2.400+ COMUNIDADES', sub:'Acompanhe contribuições, gerencie membros, gere recibos e relatórios automaticamente.', auto:'MODO AUTO', expert:'MODO ESPECIALISTA', startAuto:'Começar no Modo Auto', startExpert:'Começar no Modo Especialista' },
};
// Translation fallback rule: Manual → Verified → English → key itself.
// Never expose broken/empty/mojibake text — always fall back to English first.
const t = (lang: string, key: string) => {
  const value = T[lang]?.[key];
  const isBroken = !value || value.includes('\uFFFD') || value.trim().length === 0;
  if (!isBroken) return value;
  return T['en'][key] || key;
};

// ── MODULES — no longer rendered on the public Home Page (see master policy).
// Kept here for reuse on the post-signup "Choose Module(s)" step (Step 5 of New User Flow).
const MODULES = [
  {icon:'🤝',title:'Tontine / Sol',desc:'Cycles, rotation, receipts, organizer commission',tag:'V1 — PRIORITY'},
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

// ── TESTIMONIALS — anonymized, photo + quote only ────────────────
const TESTIMONIALS = [
  {text:'TARSYN transformed how we manage our Sol group. Everything is automatic now!',img:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&crop=face'},
  {text:'Our tontine has 30 members and TARSYN handles all the rotations perfectly.',img:'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=80&h=80&fit=crop&crop=face'},
  {text:'Finally an app that understands our community. Receipts are generated automatically!',img:'https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?w=80&h=80&fit=crop&crop=face'},
  {text:'We manage our association with ease. The reports save us hours every month.',img:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face'},
];

const COMMUNITY_IMGS = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1611432579699-484f7990b127?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=700&h=400&fit=crop',
];

const AUTO_FEATURES = [
  {icon:'🔔', key:'Automatic reminders sent for you'},
  {icon:'🧾', key:'Receipts generated automatically'},
  {icon:'🔄', key:'Rotation calculated by TARSYN'},
  {icon:'🔵', key:'Big buttons — no reading required'},
  {icon:'🌍', key:'Works in 25 languages'},
];
const EXPERT_FEATURES = [
  {icon:'📊', key:'Full analytics dashboard'},
  {icon:'⚙️', key:'Advanced settings and controls'},
  {icon:'📋', key:'Custom reports and exports'},
  {icon:'👥', key:'Complete member management'},
  {icon:'🔒', key:'Full audit trail access'},
];

const FAQ = [
  {q:'Is TARSYN free?', a:'Yes! TARSYN is free to use. A small 0.5% platform fee applies per distribution — only when money is distributed.'},
  {q:'How many members can a group have?', a:'Unlimited. TARSYN supports groups of 2 to 10,000+ members with no restrictions.'},
  {q:'Is my data secure?', a:'Absolutely. Each group has a completely isolated, encrypted space. No group can ever see another group\'s data.'},
  {q:'Can I use TARSYN in my language?', a:'Yes! TARSYN supports 25 languages with auto-detection. More languages are added regularly.'},
  {q:'Do I need to be tech-savvy?', a:'No. Auto Mode is designed for anyone — big buttons, automatic everything, no reading required.'},
];

export default function HomePage() {
  const [lang, setLang]         = useState('en');
  const [customLang, setCustomLang] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [hoverCard, setHoverCard]   = useState<string|null>(null);
  const [hoverMode, setHoverMode]   = useState<string|null>(null);
  const [activeT, setActiveT]       = useState(0);
  const [activeImg, setActiveImg]   = useState(0);
  const [mounted, setMounted]       = useState(false);
  const [openFaq, setOpenFaq]       = useState<number|null>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [email, setEmail]           = useState('');
  const [emailSent, setEmailSent]   = useState(false);

  useEffect(()=>{
    setMounted(true);
    const ti = setInterval(()=>setActiveT(p=>(p+1)%TESTIMONIALS.length),3500);
    const ii = setInterval(()=>setActiveImg(p=>(p+1)%COMMUNITY_IMGS.length),4000);
    return()=>{clearInterval(ti);clearInterval(ii);};
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
    if (!email || !email.includes('@')) { alert('Please enter a valid email.'); return; }
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
          .tarsyn-hero { padding: 60px 20px 50px !important; }
          .tarsyn-hero h1, .tarsyn-hero h2 { font-size: 32px !important; }
          .tarsyn-hero-deco { display: none !important; }
          .tarsyn-hero p { font-size: 15px !important; }
        }
      `}</style>

      {showLangModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'white',borderRadius:'16px',padding:'32px',maxWidth:'400px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <h3 style={{color:'#6B2D4E',marginBottom:'8px',fontSize:'18px',fontWeight:'700'}}>➕ Add Your Language</h3>
            <p style={{color:'#6B2D4E',fontSize:'13px',marginBottom:'20px'}}>Your language isn't in the list? Tell us — we'll add it!</p>
            <input type="text" placeholder="Ex: Fon, Twi, Soninke, Zarma..."
              value={customLang}
              onChange={e=>setCustomLang(e.target.value)}
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'14px',outline:'none',marginBottom:'16px',boxSizing:'border-box' as any}}/>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>{
                if(customLang.trim()){
                  alert(`✅ Thank you! "${customLang}" has been submitted. We will add it soon!`);
                  setShowLangModal(false); setCustomLang('');
                } else { alert('Please enter a language name.'); }
              }} style={{flex:1,padding:'12px',background:'#6B2D4E',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
                Submit Language
              </button>
              <button onClick={()=>{setShowLangModal(false);setLang('en');}}
                style={{padding:'12px 16px',background:'#EAD9BE',border:'none',borderRadius:'8px',fontSize:'14px',color:'#6B2D4E',cursor:'pointer',fontWeight:'600'}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NAVBAR — only place Sign In / Create Account appear "by default" since it's sticky ── */}
      <nav style={{background:'#FBEEDD',padding:'14px 40px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 16px rgba(107,45,78,0.12)',borderBottom:'1px solid #D9C0CC'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div>
            <div style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'800',letterSpacing:'3px',display:'none'}}>TARSYN</div><a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/tarsyn-logo.svg" alt="Tarsyn" style={{height:'48px'}}/></a>
            <div style={{color:'#8B3A5E',fontSize:'12px',letterSpacing:'1.5px',fontWeight:700,fontStyle:'italic',marginTop:'4px'}}>YOUR COMMUNITY. YOUR POWER.</div>
          </div>
        </div>
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
      </nav>

      {/* ── HERO — keeps its own CTA (primary conversion point); navbar above is sticky so always visible too ── */}
      <div className="tarsyn-hero" style={{background:'linear-gradient(160deg,#4A1F38 0%,#8B3A5E 50%,#3A1830 100%)',padding:'90px 32px 70px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div className="tarsyn-hero-deco floating" style={{position:'absolute',top:'20px',left:'5%',opacity:0.10,fontSize:'80px',pointerEvents:'none'}}>🤝</div>
        <div className="tarsyn-hero-deco floating" style={{position:'absolute',top:'30px',right:'6%',opacity:0.10,fontSize:'65px',pointerEvents:'none',animationDelay:'1s'}}>💰</div>
        <div className="tarsyn-hero-deco floating" style={{position:'absolute',bottom:'30px',left:'8%',opacity:0.08,fontSize:'55px',pointerEvents:'none',animationDelay:'0.5s'}}>🌍</div>
        <div className="tarsyn-hero-deco floating" style={{position:'absolute',bottom:'40px',right:'10%',opacity:0.08,fontSize:'50px',pointerEvents:'none',animationDelay:'1.5s'}}>⭐</div>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'inline-block',background:'rgba(233,199,123,0.15)',border:'1px solid rgba(233,199,123,0.3)',borderRadius:'20px',padding:'6px 18px',marginBottom:'24px'}}>
            <span style={{color:'#E9C77B',fontSize:'12px',fontWeight:'600',letterSpacing:'2px'}}>🌍 {t(lang,'trusted')}</span>
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
            {TESTIMONIALS.map((a,idx)=>(
              <div key={idx} style={{width:'46px',height:'46px',borderRadius:'50%',overflow:'hidden',border:'3px solid rgba(233,199,123,0.6)',marginLeft:idx>0?'-12px':'0',zIndex:10-idx,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
                <img src={a.img} alt="community member" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
            ))}
            <span style={{color:'rgba(251,238,221,0.75)',fontSize:'13px',marginLeft:'18px',fontWeight:'500'}}>+2,400 communities worldwide</span>
          </div>
        </div>
      </div>

      {/* ── AUTO / EXPERT MODE ── */}
      <div style={{background:'#FBEEDD',padding:'72px 32px',textAlign:'center'}}>
        <div style={{marginBottom:'16px'}}>
          <span style={{background:'#EAD9BE',color:'#6B2D4E',fontSize:'11px',fontWeight:'700',letterSpacing:'2px',padding:'6px 18px',borderRadius:'20px'}}>CHOOSE YOUR EXPERIENCE</span>
        </div>
        <h3 style={{color:'#6B2D4E',fontSize:'34px',fontWeight:'800',marginBottom:'8px'}}>{t(lang,'modeTitle')}</h3>
        <p style={{color:'#6B2D4E',fontSize:'15px',marginBottom:'44px'}}>{t(lang,'modeSubtitle')}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'28px',maxWidth:'860px',margin:'0 auto'}}>

          <div className="mode-card"
            onMouseEnter={()=>setHoverMode('auto')}
            onMouseLeave={()=>setHoverMode(null)}
            style={{borderRadius:'20px',overflow:'hidden',boxShadow:hoverMode==='auto'?'0 20px 48px rgba(107,45,78,0.22)':'0 4px 20px rgba(107,45,78,0.08)',border:`2px solid ${hoverMode==='auto'?'#6B2D4E':'#EAD9BE'}`}}>
            <div style={{background:'linear-gradient(135deg,#6B2D4E,#8B3A5E)',padding:'32px 24px 24px',textAlign:'center'}}>
              <div style={{fontSize:'44px',marginBottom:'14px'}}>🤲</div>
              <div style={{color:'#E9C77B',fontSize:'22px',fontWeight:'800',letterSpacing:'2px'}}>{t(lang,'auto')}</div>
              <div style={{color:'#FBEEDD',fontSize:'11px',letterSpacing:'2px',marginTop:'6px',opacity:0.8}}>100% AUTOMATIC — FOR EVERYONE</div>
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
              <div style={{fontSize:'44px',marginBottom:'14px'}}>⚡</div>
              <div style={{color:'#E9C77B',fontSize:'22px',fontWeight:'800',letterSpacing:'2px'}}>{t(lang,'expert')}</div>
              <div style={{color:'#FBEEDD',fontSize:'11px',letterSpacing:'2px',marginTop:'6px',opacity:0.8}}>FULL CONTROL — FOR ADMINS</div>
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

      {/* ── COMMUNITY PHOTO SLIDER ── */}
      <div style={{background:'#4A1F38',padding:'56px 32px',textAlign:'center'}}>
        <h3 style={{color:'#E9C77B',fontSize:'20px',fontWeight:'700',marginBottom:'6px',letterSpacing:'2px'}}>COMMUNITIES AROUND THE WORLD</h3>
        <p style={{color:'#FBEEDD',fontSize:'13px',opacity:0.55,marginBottom:'28px',letterSpacing:'1px'}}>Every nation. Every community. One platform.</p>
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
          <div style={{position:'absolute',top:'50%',right:'16px',transform:'translateY(-50%)',background:'rgba(0,0,0,0.4)',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'18px',cursor:'pointer',zIndex:2}}>›</div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{background:'#EAD9BE',padding:'44px 32px'}}>
        <div style={{display:'flex',justifyContent:'center',gap:'64px',flexWrap:'wrap'}}>
          {[['2,400+','Communities Worldwide'],['25','Languages Supported'],['100%','Automatic & Secure'],['∞','Members — No Limit']].map(([v,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:'38px',fontWeight:'800',color:'#6B2D4E'}}>{v}</div>
              <div style={{fontSize:'13px',color:'#6B2D4E',marginTop:'6px',fontWeight:'500'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{background:'#FBEEDD',padding:'64px 32px',textAlign:'center'}}>
        <h3 style={{color:'#6B2D4E',fontSize:'30px',fontWeight:'800',marginBottom:'8px'}}>How it works</h3>
        <p style={{color:'#6B2D4E',marginBottom:'44px',fontSize:'15px'}}>3 simple steps to get started</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'24px',maxWidth:'800px',margin:'0 auto'}}>
          {[
            {step:'1',icon:'📝',title:'Create your group',desc:'Sign up, choose your mode and invite your members in minutes.'},
            {step:'2',icon:'💰',title:'Record contributions',desc:'Each payment is confirmed instantly with a receipt and QR code.'},
            {step:'3',icon:'🔄',title:'TARSYN handles the rest',desc:'Rotation, reminders, reports — all automatic. You focus on your community.'},
          ].map(s=>(
            <div key={s.step} style={{background:'white',border:'1px solid #EAD9BE',borderRadius:'16px',padding:'28px 20px',textAlign:'center'}}>
              <div style={{width:'48px',height:'48px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',color:'#E9C77B',fontWeight:'800',fontSize:'18px'}}>{s.step}</div>
              <div style={{fontSize:'32px',marginBottom:'12px'}}>{s.icon}</div>
              <div style={{fontWeight:'700',color:'#4A1F38',fontSize:'16px',marginBottom:'8px'}}>{s.title}</div>
              <div style={{fontSize:'13px',color:'#6B2D4E',lineHeight:'1.6'}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per platform master policy: the "One Platform — Every Community" module-card
          section is intentionally removed from the public Home Page. Module selection
          now happens only after account + workspace creation (see New User Flow). */}

      {/* ── TESTIMONIALS — anonymized: photo + quote only, no name/country ── */}
      <div style={{background:'linear-gradient(160deg,#4A1F38 0%,#8B3A5E 50%,#3A1830 100%)',padding:'64px 32px',textAlign:'center'}}>
        <h3 style={{color:'#FBEEDD',fontSize:'30px',fontWeight:'800',marginBottom:'8px'}}>What our communities say</h3>
        <p style={{color:'rgba(251,238,221,0.6)',marginBottom:'44px',fontSize:'14px'}}>Real stories from real communities worldwide</p>
        <div style={{maxWidth:'600px',margin:'0 auto'}}>
          {mounted&&<div key={activeT} className="tcard" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(233,199,123,0.3)',borderRadius:'18px',padding:'36px'}}>
            <p style={{color:'#FBEEDD',fontSize:'16px',lineHeight:'1.8',marginBottom:'28px',fontStyle:'italic'}}>"{TESTIMONIALS[activeT].text}"</p>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
              <img src={TESTIMONIALS[activeT].img} alt="community member" style={{width:'52px',height:'52px',borderRadius:'50%',objectFit:'cover',border:'2px solid #E9C77B'}}/>
            </div>
          </div>}
          <div style={{display:'flex',justifyContent:'center',gap:'8px',marginTop:'24px'}}>
            {TESTIMONIALS.map((_,i)=>(
              <div key={i} onClick={()=>setActiveT(i)} style={{width:i===activeT?'28px':'8px',height:'8px',borderRadius:'4px',background:i===activeT?'#E9C77B':'rgba(255,255,255,0.3)',cursor:'pointer',transition:'all 0.3s ease'}}></div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{background:'#FBEEDD',padding:'64px 32px'}}>
        <h3 style={{color:'#6B2D4E',fontSize:'30px',fontWeight:'800',marginBottom:'8px',textAlign:'center'}}>Frequently Asked Questions</h3>
        <p style={{color:'#6B2D4E',marginBottom:'44px',textAlign:'center',fontSize:'15px'}}>Everything you need to know about TARSYN</p>
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

      {/* ── EMAIL SIGNUP ── */}
      <div style={{background:'#6B2D4E',padding:'56px 32px',textAlign:'center'}}>
        <h3 style={{color:'#FBEEDD',fontSize:'26px',fontWeight:'800',marginBottom:'8px'}}>Stay updated with TARSYN</h3>
        <p style={{color:'rgba(251,238,221,0.65)',marginBottom:'28px',fontSize:'14px'}}>Get notified when new languages and features are added</p>
        {emailSent ? (
          <div style={{background:'rgba(74,124,89,0.3)',border:'1px solid rgba(74,124,89,0.5)',borderRadius:'12px',padding:'16px 24px',display:'inline-block',color:'#90EE90',fontWeight:'600'}}>
            ✅ Thank you! You're on the list.
          </div>
        ) : (
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',maxWidth:'480px',margin:'0 auto'}}>
            <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)}
              style={{flex:1,minWidth:'200px',padding:'12px 16px',borderRadius:'10px',border:'none',fontSize:'14px',outline:'none'}}/>
            <button onClick={handleEmailSubmit}
              style={{padding:'12px 24px',background:'#E9C77B',border:'none',borderRadius:'10px',color:'#6B2D4E',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
              Notify Me
            </button>
          </div>
        )}
      </div>

      {/* Note: the previous "Ready to organize your community?" CTA section was removed here —
          it duplicated the exact same Sign In / Create Account buttons already shown in the
          sticky Navbar (visible at all times) and in the Hero. Email Signup now flows directly
          into the Footer. */}

      {/* ── FOOTER — global component, discreet company attribution per final brand rule ── */}
      <Footer onLanguageClick={() => setShowLangModal(true)} />
    </div>
  );
}
﻿'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #D9C0CC', borderRadius: '10px',
    fontSize: '15px', background: '#FBEEDD',
    outline: 'none', color: '#4A1F38', boxSizing: 'border-box',
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (name.trim().length < 2) { setError('Please enter your full name.'); return; }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name.trim() });
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);
      await setDoc(doc(db, 'users', result.user.uid), {
        name: name.trim(),
        email,
        role: 'admin',
        createdAt: new Date().toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
      });
      setSuccess(true);
      setTimeout(() => { window.location.href = '/dashboard/create-workspace'; }, 1800);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);
      await setDoc(doc(db, 'users', result.user.uid), {
        name: result.user.displayName || '',
        email: result.user.email || '',
        role: 'admin',
        createdAt: new Date().toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
      }, { merge: true });
      window.location.href = '/dashboard/create-workspace';
    } catch {
      setError('Google sign-up failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',flexDirection:'column'}}>
        <Nav/>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
          <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',textAlign:'center',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
            <div style={{fontSize:'64px',marginBottom:'16px'}}>🎉</div>
            <h2 style={{color:'#6B2D4E',fontSize:'24px',fontWeight:'700',marginBottom:'12px'}}>Account Created!</h2>
            <p style={{color:'#6B2D4E',fontSize:'14px',lineHeight:'1.6',marginBottom:'24px'}}>
              Welcome to TARSYN, <strong style={{color:'#6B2D4E'}}>{name}</strong>!<br/>
              Setting up your workspace...
            </p>
            <div style={{display:'flex',justifyContent:'center'}}>
              <div style={{width:'28px',height:'28px',border:'3px solid #EAD9BE',borderTopColor:'#6B2D4E',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <a href="/dashboard/create-workspace" style={{display:'block',marginTop:'20px',fontSize:'13px',color:'#8B3A5E',textDecoration:'underline'}}>
              Continue now →
            </a>
          </div>
        </div>
        <Footer/>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',flexDirection:'column'}}>
      <Nav/>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:'#E9C77B'}}>✦</div>
            <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'700',marginBottom:'6px'}}>Create Account</h1>
            <p style={{color:'#6B2D4E',fontSize:'14px'}}>Join the <strong style={{color:'#E9C77B'}}>TARSYN</strong> community</p>
          </div>

          {error && (
            <div style={{background:'#fdecea',border:'1px solid #f5c6cb',color:'#C0392B',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Full Name *</label>
              <input type="text" required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" style={inp}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Email Address *</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Password *</label>
              <div style={{position:'relative'}}>
                <input type={showPass?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="********" style={{...inp,paddingRight:'44px'}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)}
                  style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'#6B2D4E',fontWeight:600}}>
                  {showPass?'Hide':'Show'}
                </button>
              </div>
            </div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Confirm Password *</label>
              <div style={{position:'relative'}}>
                <input type={showConfirm?'text':'password'} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="********" style={{...inp,paddingRight:'44px'}}/>
                <button type="button" onClick={()=>setShowConfirm(!showConfirm)}
                  style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'#6B2D4E',fontWeight:600}}>
                  {showConfirm?'Hide':'Show'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'14px',background:'#6B2D4E',color:'#FBEEDD',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'14px',opacity:loading?0.7:1}}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'4px 0 14px',color:'#6B2D4E',fontSize:'12px'}}>
            <div style={{flex:1,height:'1px',background:'#EAD9BE'}}></div>or<div style={{flex:1,height:'1px',background:'#EAD9BE'}}></div>
          </div>

          <button onClick={handleGoogle}
            style={{width:'100%',padding:'13px',background:'white',border:'1.5px solid #D9C0CC',borderRadius:'10px',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',color:'#4A1F38',fontWeight:'500'}}>
            <GoogleIcon/>
            Continue with Google
          </button>

          <p style={{textAlign:'center',marginTop:'28px',fontSize:'13px',color:'#6B2D4E'}}>
            Already have an account? <a href="/login" style={{color:'#8B3A5E',fontWeight:'700',textDecoration:'none'}}>Sign in</a>
          </p>
        </div>
      </div>
      <Footer/>
    </div>
  );
}

function Nav() {
  return (
    <nav style={{background:'#6B2D4E',padding:'16px 32px',display:'flex',alignItems:'center',gap:'12px'}}>
      <div>
        <div style={{color:'white',fontSize:'20px',fontWeight:'700',letterSpacing:'3px',display:'none'}}>TARSYN</div><a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/tarsyn-logo-white.svg" alt="Tarsyn" style={{height:'24px'}}/></a>
        <div style={{color:'#E9C77B',fontSize:'9px',letterSpacing:'3px',fontStyle:'italic'}}>YOUR COMMUNITY. YOUR POWER.</div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{background:'#6B2D4E',textAlign:'center',padding:'14px',color:'rgba(251,238,221,0.6)',fontSize:'12px'}}>
      <span style={{color:'#E9C77B'}}>TARSYN</span> — © 2026 Your Community. Your Power.
    </footer>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}﻿'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepConnected, setKeepConnected] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendMsg, setResendMsg] = useState('');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const redirectByRole = async (uid: string, uEmail: string) => {
    try {
      let role = null;
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        role = userDoc.data()?.role;
      } else {
        const q2 = query(collection(db, 'members'), where('email', '==', uEmail));
        const s2 = await getDocs(q2);
        if (!s2.empty) {
          role = s2.docs[0].data()?.role;
        }
      }
      if (role === 'admin' || role === 'superadmin' || role === 'organizer') {
        window.location.href = redirectTo || '/dashboard/create-tontine';
      } else {
        window.location.href = '/member';
      }
    } catch {
      window.location.href = '/member';
    }
  };

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const sendOTP = async (uid: string, uEmail: string) => {
    const otp = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000;
    await setDoc(doc(db, 'otp_codes', uid), { otp, expires, email: uEmail });
    try {
      await fetch('/api/auth/send-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uEmail, otp }),
      });
    } catch {
      // OTP stored in Firestore even if email fails
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Set persistence BEFORE signing in: local = stays signed in across
      // browser restarts, session = signed out when the browser tab closes.
      await setPersistence(auth, keepConnected ? browserLocalPersistence : browserSessionPersistence);
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      setUserId(result.user.uid);
      setUserEmail(result.user.email!);
      await sendOTP(result.user.uid, result.user.email!);
      setStep('2fa');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'No account found.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-email': 'Email invalide.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setError(msg[err.code] || `Error: ${err.code}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setError('');
    setLoading(true);
    try {
      const entered = code.join('');
      const otpDoc = await getDoc(doc(db, 'otp_codes', userId));
      if (!otpDoc.exists()) { setError('Code expired. Request a new code.'); setLoading(false); return; }
      const { otp, expires } = otpDoc.data();
      if (Date.now() > expires) {
        await deleteDoc(doc(db, 'otp_codes', userId));
        setError('Code expired. Request a new code.');
        setLoading(false);
        return;
      }
      if (entered !== otp) { setError('Incorrect code. Please try again.'); setLoading(false); return; }
      await deleteDoc(doc(db, 'otp_codes', userId));
      await redirectByRole(userId, userEmail);
    } catch {
      setError('Verification error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setCode(['', '', '', '', '', '']);
    await sendOTP(userId, userEmail);
    setResendMsg('New code sent!');
    setTimeout(() => setResendMsg(''), 4000);
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await setPersistence(auth, keepConnected ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      setUserId(result.user.uid);
      setUserEmail(result.user.email!);
      await sendOTP(result.user.uid, result.user.email!);
      setStep('2fa');
    } catch (err: any) {
      setError(`Google sign-in error: ${err.code}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, '');
    const arr = [...code];
    arr[index] = val;
    setCode(arr);
    if (val && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      if (next) (next as HTMLInputElement).focus();
    }
  };

  if (step === '2fa') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.5rem' }}>2FA Verification</h2>
          <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 0.25rem' }}>A 6-digit code has been sent to</p>
          <p style={{ color: '#6B2D4E', fontWeight: 700, margin: '0 0 1.5rem', fontSize: '0.9rem' }}>your email address</p>

          {error && (
            <div style={{ background: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', borderRadius: '8px', padding: '0.75rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          {resendMsg && (
            <div style={{ background: '#D4EDDA', color: '#155724', borderRadius: '8px', padding: '0.75rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
              {resendMsg}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#555', marginBottom: '0.75rem' }}>
            Enter your code
          </label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {code.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeChange(i, e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) {
                    const prev = document.getElementById(`otp-${i - 1}`);
                    if (prev) (prev as HTMLInputElement).focus();
                  }
                  if (e.key === 'Enter' && code.join('').length === 6) {
                    handleVerify2FA();
                  }
                }}
                style={{ width: '46px', height: '56px', textAlign: 'center', fontSize: '1.4rem', fontWeight: 700, border: '2px solid #E0D0C0', borderRadius: '10px', background: '#FAF0E6', color: '#6B2D4E', outline: 'none' }}
              />
            ))}
          </div>

          <button
            onClick={handleVerify2FA}
            disabled={loading || code.join('').length !== 6}
            style={{ width: '100%', padding: '0.85rem', background: '#6B2D4E', color: '#FAF0E6', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', opacity: (loading || code.join('').length !== 6) ? 0.7 : 1, marginBottom: '1rem' }}>
            {loading ? 'Verifying...' : 'Verify and sign in'}
          </button>

          <button onClick={handleResend}
            style={{ background: 'none', border: 'none', color: '#D4AF7A', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', marginBottom: '0.5rem', display: 'block', width: '100%' }}>
            Resend code
          </button>
          <button onClick={() => { setStep('login'); setCode(['', '', '', '', '', '']); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem' }}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>

        <div style={{ marginBottom: '2rem' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/tarsyn-logo.svg" alt="TARSYN" style={{ height: '48px', width: 'auto', display: 'block' }} /></a>
          <p style={{ margin: 0, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em' }}>YOUR COMMUNITY</p>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6B2D4E', margin: '0 0 0.25rem' }}>Sign In</h1>
        <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>Access your TARSYN account</p>

        {error && (
          <div style={{ background: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>Email</label>
            <input
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #E0D0C0', borderRadius: '10px', fontSize: '0.95rem', background: '#FAF0E6', color: '#333', outline: 'none', boxSizing: 'border-box' }}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', border: '1.5px solid #E0D0C0', borderRadius: '10px', fontSize: '0.95rem', background: '#FAF0E6', color: '#333', outline: 'none', boxSizing: 'border-box' }}
                type={showPassword ? '🙈' : '👁️'}
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '1.1rem', padding: 0 }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* KEEP ME CONNECTED + FORGOT PASSWORD */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#555', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={keepConnected}
                onChange={e => setKeepConnected(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#6B2D4E' }}
              />
              Keep me connected
            </label>
            <a href="/forgot-password" style={{ color: '#6B2D4E', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.85rem', background: '#6B2D4E', color: '#FAF0E6', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '1rem' }}>
            {loading ? 'Connexion...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '1rem 0', color: '#aaa', fontSize: '0.85rem' }}>🔐</div>

        <button onClick={handleGoogle} disabled={loading}
          style={{ width: '100%', padding: '0.85rem', background: '#FAF0E6', color: '#333', border: '2px solid #E0D0C0', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#888' }}>
          Don't have an account?{' '}
          <a href="/register" style={{ color: '#6B2D4E', fontWeight: 700, textDecoration: 'none' }}>
            Create an account
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}