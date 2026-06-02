'use client';
import { useState, useEffect } from 'react';

const LANGUAGES = ['English','Français','Kreyòl ayisyen','Kreyòl Antiyè','Español','Português','العربية','Wolof','Bambara','Lingala','Kiswahili'];
const MODULES = [
  {icon:'🤝',title:'Tontine / Sol',desc:'Cycles, rotation, receipts, organizer commission',tag:'V1 — PRIORITY'},
  {icon:'🏛️',title:'Association',desc:'Members, dues, events, votes, reports',tag:'V1'},
  {icon:'💼',title:'Investment',desc:'Projects, capital, returns, financial reports',tag:'V1'},
  {icon:'⛪',title:'Church',desc:'Tithes, offerings, projects, announcements',tag:'V1'},
  {icon:'🌾',title:'Agriculture',desc:'Cooperatives, harvests, group purchases',tag:'V2'},
  {icon:'🏥',title:'Health',desc:'Health mutuals, coverage, claims',tag:'V3'},
];
const TESTIMONIALS = [
  {initials:'MJ',name:'Marie Jean',country:'🇭🇹 Haiti',text:'TARSYN transformed how we manage our Sol group. Everything is automatic now!',bg:'#C4748E',img:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&crop=face'},
  {initials:'KD',name:'Kofi Diallo',country:'🇸🇳 Senegal',text:'Our tontine has 30 members and TARSYN handles all the rotations perfectly.',bg:'#6B2D4E',img:'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=80&h=80&fit=crop&crop=face'},
  {initials:'RA',name:'Rachel Amara',country:'🇨🇦 Canada',text:'Finally an app that understands our community. Receipts are generated automatically!',bg:'#D4AF7A',img:'https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?w=80&h=80&fit=crop&crop=face'},
  {initials:'PM',name:'Pierre Moreau',country:'🇫🇷 France',text:'We manage our association with ease. The reports save us hours every month.',bg:'#4A7C59',img:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face'},
];

// Photos communautés — toutes nations, personnes noires, blanches, asiatiques, latinos
const COMMUNITY_IMGS = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1573497019236-17f8177b81e8?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=700&h=400&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=700&h=400&fit=crop',
];

const AUTO_FEATURES = [
  {icon:'🔔', text:'Automatic reminders sent for you'},
  {icon:'🧾', text:'Receipts generated automatically'},
  {icon:'🔄', text:'Rotation calculated by TARSYN'},
  {icon:'🔵', text:'Big buttons — no reading required'},
  {icon:'🌍', text:'Works in 25 languages'},
];

const EXPERT_FEATURES = [
  {icon:'📊', text:'Full analytics dashboard'},
  {icon:'⚙️', text:'Advanced settings and controls'},
  {icon:'📋', text:'Custom reports and exports'},
  {icon:'👥', text:'Complete member management'},
  {icon:'🔒', text:'Full audit trail access'},
];

export default function HomePage() {
  const [lang,setLang]=useState('English');
  const [hoverCard,setHoverCard]=useState<string|null>(null);
  const [activeT,setActiveT]=useState(0);
  const [activeImg,setActiveImg]=useState(0);
  const [mounted,setMounted]=useState(false);
  const [hoverMode,setHoverMode]=useState<string|null>(null);

  useEffect(()=>{
    setMounted(true);
    const t=setInterval(()=>setActiveT(p=>(p+1)%TESTIMONIALS.length),3500);
    const i=setInterval(()=>setActiveImg(p=>(p+1)%COMMUNITY_IMGS.length),4000);
    return()=>{clearInterval(t);clearInterval(i);};
  },[]);

  return(
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',flexDirection:'column'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes imgFade{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:scale(1)}}
        @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .animate-fade{animation:fadeUp 0.8s ease forwards;}
        .floating{animation:float 3s ease-in-out infinite;}
        .tcard{animation:slideIn 0.5s ease forwards;}
        .img-fade{animation:imgFade 0.8s ease forwards;}
        .btn-gold{transition:all 0.2s ease;}
        .btn-gold:hover{background:#c49a5a!important;transform:translateY(-2px);box-shadow:0 8px 24px rgba(212,175,122,0.4);}
        .btn-outline{transition:all 0.2s ease;}
        .btn-outline:hover{background:rgba(255,255,255,0.12)!important;transform:translateY(-2px);}
        .logo-icon:hover{transform:rotate(20deg);}
        .logo-icon{transition:transform 0.3s ease;}
        .mode-card{transition:all 0.3s ease;cursor:pointer;}
        .mode-card:hover{transform:translateY(-8px);}
        .feature-row{transition:all 0.2s ease;}
        .feature-row:hover{transform:translateX(6px);}
        .nav-link{transition:all 0.2s ease;}
        .nav-link:hover{opacity:0.8;transform:translateY(-1px);}
      `}</style>

      {/* NAVBAR — fond #FAF0E6 ivoire (échangé avec le hero) */}
      <nav style={{
        background:'#FAF0E6',
        padding:'14px 40px',
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        flexWrap:'wrap',
        gap:'12px',
        position:'sticky',
        top:0,
        zIndex:100,
        boxShadow:'0 2px 16px rgba(107,45,78,0.12)',
        borderBottom:'1px solid #D9C0CC'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div className="logo-icon" style={{width:'40px',height:'40px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',cursor:'pointer',color:'#D4AF7A'}}>✦</div>
          <div>
            <div style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'800',letterSpacing:'3px'}}>TARSYN</div>
            <div style={{color:'#C4748E',fontSize:'9px',letterSpacing:'3px'}}>YOUR COMMUNITY. YOUR POWER.</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <select value={lang} onChange={e=>setLang(e.target.value)}
            style={{padding:'7px 12px',borderRadius:'8px',border:'1.5px solid #D9C0CC',background:'white',color:'#6B2D4E',fontSize:'13px',cursor:'pointer',outline:'none',fontWeight:'500'}}>
            {LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}
          </select>
          <a href="/login" className="nav-link" style={{padding:'9px 22px',border:'1.5px solid #6B2D4E',borderRadius:'8px',color:'#6B2D4E',textDecoration:'none',fontSize:'14px',fontWeight:'600'}}>Sign In</a>
          <a href="/register" className="btn-gold" style={{padding:'9px 22px',background:'#6B2D4E',borderRadius:'8px',color:'#FAF0E6',textDecoration:'none',fontSize:'14px',fontWeight:'700',display:'inline-block'}}>Create Account</a>
        </div>
      </nav>

      {/* HERO — fond bordeaux #6B2D4E (échangé avec la navbar) */}
      <div style={{
        background:'linear-gradient(160deg,#6B2D4E 0%,#7D3459 50%,#5A2240 100%)',
        padding:'90px 32px 70px',
        textAlign:'center',
        position:'relative',
        overflow:'hidden'
      }}>
        {/* Décorations flottantes */}
        <div style={{position:'absolute',top:'20px',left:'5%',opacity:0.10,fontSize:'80px',pointerEvents:'none'}} className="floating">🤝</div>
        <div style={{position:'absolute',top:'30px',right:'6%',opacity:0.10,fontSize:'65px',pointerEvents:'none',animationDelay:'1s'}} className="floating">💰</div>
        <div style={{position:'absolute',bottom:'30px',left:'8%',opacity:0.08,fontSize:'55px',pointerEvents:'none',animationDelay:'0.5s'}} className="floating">🌍</div>
        <div style={{position:'absolute',bottom:'40px',right:'10%',opacity:0.08,fontSize:'50px',pointerEvents:'none',animationDelay:'1.5s'}} className="floating">⭐</div>

        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'inline-block',background:'rgba(212,175,122,0.15)',border:'1px solid rgba(212,175,122,0.3)',borderRadius:'20px',padding:'6px 18px',marginBottom:'24px'}}>
            <span style={{color:'#D4AF7A',fontSize:'12px',fontWeight:'600',letterSpacing:'2px'}}>🌍 TRUSTED BY 2,400+ COMMUNITIES</span>
          </div>
          <h1 style={{color:'#FAF0E6',fontSize:'52px',fontWeight:'800',marginBottom:'16px',lineHeight:'1.15'}}>The Smart Way to Manage</h1>
          <h2 style={{color:'#D4AF7A',fontSize:'52px',fontWeight:'800',marginBottom:'28px',fontStyle:'italic',lineHeight:'1.15'}}>Your Community</h2>
          <p style={{color:'rgba(250,240,230,0.85)',fontSize:'18px',maxWidth:'580px',margin:'0 auto 44px',lineHeight:'1.8'}}>
            Track contributions, manage members, generate receipts and reports automatically. Built for Haitian Sol groups, African tontines and communities worldwide.
          </p>
          <div style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/register" className="btn-gold" style={{padding:'16px 40px',background:'#D4AF7A',borderRadius:'12px',color:'#6B2D4E',textDecoration:'none',fontSize:'16px',fontWeight:'800',display:'inline-block',boxShadow:'0 4px 20px rgba(212,175,122,0.3)'}}>Create Free Account</a>
            <a href="/login" className="btn-outline" style={{padding:'16px 40px',border:'2px solid rgba(250,240,230,0.4)',borderRadius:'12px',color:'#FAF0E6',textDecoration:'none',fontSize:'16px',display:'inline-block'}}>Sign In</a>
          </div>

          {/* Avatars groupe — toutes nations */}
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',marginTop:'52px',flexWrap:'wrap',gap:'4px'}}>
            {TESTIMONIALS.map((a,idx)=>(
              <div key={a.initials} style={{width:'46px',height:'46px',borderRadius:'50%',overflow:'hidden',border:'3px solid rgba(212,175,122,0.6)',marginLeft:idx>0?'-12px':'0',zIndex:10-idx,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
                <img src={a.img} alt={a.initials} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
            ))}
            <span style={{color:'rgba(250,240,230,0.75)',fontSize:'13px',marginLeft:'18px',fontWeight:'500'}}>+2,400 communities worldwide</span>
          </div>
        </div>
      </div>

      {/* AUTO MODE / EXPERT MODE */}
      <div style={{background:'#FAF0E6',padding:'72px 32px',textAlign:'center'}}>
        <div style={{marginBottom:'16px'}}>
          <span style={{background:'#EDD9E5',color:'#6B2D4E',fontSize:'11px',fontWeight:'700',letterSpacing:'2px',padding:'6px 18px',borderRadius:'20px'}}>CHOOSE YOUR EXPERIENCE</span>
        </div>
        <h3 style={{color:'#6B2D4E',fontSize:'34px',fontWeight:'800',marginBottom:'8px'}}>How do you want to use TARSYN?</h3>
        <p style={{color:'#7A5068',fontSize:'15px',marginBottom:'44px'}}>Pick the mode that fits your community</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'28px',maxWidth:'860px',margin:'0 auto'}}>
          {/* AUTO MODE */}
          <div className="mode-card"
            onMouseEnter={()=>setHoverMode('auto')}
            onMouseLeave={()=>setHoverMode(null)}
            style={{borderRadius:'20px',overflow:'hidden',boxShadow:hoverMode==='auto'?'0 20px 48px rgba(107,45,78,0.22)':'0 4px 20px rgba(107,45,78,0.08)',border:`2px solid ${hoverMode==='auto'?'#6B2D4E':'#EDD9E5'}`}}>
            <div style={{background:'linear-gradient(135deg,#6B2D4E,#8B3D62)',padding:'32px 24px 24px',textAlign:'center'}}>
              <div style={{fontSize:'44px',marginBottom:'14px'}}>🤲</div>
              <div style={{color:'#D4AF7A',fontSize:'22px',fontWeight:'800',letterSpacing:'2px'}}>AUTO MODE</div>
              <div style={{color:'#FAF0E6',fontSize:'11px',letterSpacing:'2px',marginTop:'6px',opacity:0.8}}>100% AUTOMATIC — FOR EVERYONE</div>
            </div>
            <div style={{padding:'24px',background:'white'}}>
              {AUTO_FEATURES.map((f,i)=>(
                <div key={i} className="feature-row" style={{display:'flex',alignItems:'center',gap:'14px',padding:'11px 0',borderBottom:i<AUTO_FEATURES.length-1?'1px solid #F5EAF0':'none'}}>
                  <span style={{fontSize:'20px'}}>{f.icon}</span>
                  <span style={{color:'#4A2040',fontSize:'14px',fontWeight:'500'}}>{f.text}</span>
                </div>
              ))}
              <a href="/register" className="btn-gold" style={{display:'block',marginTop:'28px',padding:'15px',background:'#6B2D4E',borderRadius:'12px',color:'#FAF0E6',textDecoration:'none',fontSize:'15px',fontWeight:'700',textAlign:'center'}}>
                Start with Auto Mode
              </a>
            </div>
          </div>

          {/* EXPERT MODE */}
          <div className="mode-card"
            onMouseEnter={()=>setHoverMode('expert')}
            onMouseLeave={()=>setHoverMode(null)}
            style={{borderRadius:'20px',overflow:'hidden',boxShadow:hoverMode==='expert'?'0 20px 48px rgba(212,175,122,0.25)':'0 4px 20px rgba(0,0,0,0.15)',border:`2px solid ${hoverMode==='expert'?'#D4AF7A':'#3D2030'}`}}>
            <div style={{background:'linear-gradient(135deg,#2C1A24,#4A2040)',padding:'32px 24px 24px',textAlign:'center'}}>
              <div style={{fontSize:'44px',marginBottom:'14px'}}>⚡</div>
              <div style={{color:'#D4AF7A',fontSize:'22px',fontWeight:'800',letterSpacing:'2px'}}>EXPERT MODE</div>
              <div style={{color:'#FAF0E6',fontSize:'11px',letterSpacing:'2px',marginTop:'6px',opacity:0.8}}>FULL CONTROL — FOR ADMINS</div>
            </div>
            <div style={{padding:'24px',background:'#1A0F16'}}>
              {EXPERT_FEATURES.map((f,i)=>(
                <div key={i} className="feature-row" style={{display:'flex',alignItems:'center',gap:'14px',padding:'11px 0',borderBottom:i<EXPERT_FEATURES.length-1?'1px solid rgba(212,175,122,0.12)':'none'}}>
                  <span style={{fontSize:'20px'}}>{f.icon}</span>
                  <span style={{color:'#FAF0E6',fontSize:'14px',fontWeight:'500'}}>{f.text}</span>
                </div>
              ))}
              <a href="/register" style={{display:'block',marginTop:'28px',padding:'15px',background:'#D4AF7A',borderRadius:'12px',color:'#6B2D4E',textDecoration:'none',fontSize:'15px',fontWeight:'700',textAlign:'center',transition:'all 0.2s ease'}}>
                Start with Expert Mode
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* COMMUNITY PHOTO SLIDER — toutes nations, peaux noires incluses */}
      <div style={{background:'#2C1A24',padding:'56px 32px',textAlign:'center'}}>
        <h3 style={{color:'#D4AF7A',fontSize:'20px',fontWeight:'700',marginBottom:'6px',letterSpacing:'2px'}}>COMMUNITIES AROUND THE WORLD</h3>
        <p style={{color:'#FAF0E6',fontSize:'13px',opacity:0.55,marginBottom:'28px',letterSpacing:'1px'}}>Every nation. Every community. One platform.</p>
        <div style={{maxWidth:'720px',margin:'0 auto',borderRadius:'20px',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.5)',position:'relative'}}>
          {mounted&&<img key={activeImg} src={COMMUNITY_IMGS[activeImg]} alt="community" className="img-fade"
            style={{width:'100%',height:'360px',objectFit:'cover',display:'block'}}/>}
          <div style={{position:'absolute',bottom:'20px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'8px'}}>
            {COMMUNITY_IMGS.map((_,i)=>(
              <div key={i} onClick={()=>setActiveImg(i)} style={{width:i===activeImg?'28px':'8px',height:'8px',borderRadius:'4px',background:i===activeImg?'#D4AF7A':'rgba(255,255,255,0.4)',cursor:'pointer',transition:'all 0.3s ease'}}></div>
            ))}
          </div>
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'linear-gradient(to top,rgba(44,26,36,0.65) 0%,transparent 55%)',pointerEvents:'none'}}></div>
        </div>
      </div>

      {/* STATS */}
      <div style={{background:'#EDD9E5',padding:'44px 32px'}}>
        <div style={{display:'flex',justifyContent:'center',gap:'64px',flexWrap:'wrap'}}>
          {[['25','Languages Supported'],['100%','Automatic & Free'],['∞','Members — No Limit']].map(([v,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:'40px',fontWeight:'800',color:'#6B2D4E'}}>{v}</div>
              <div style={{fontSize:'14px',color:'#7A5068',marginTop:'6px',fontWeight:'500'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MODULES */}
      <div style={{padding:'64px 32px',textAlign:'center',background:'#FAF0E6'}}>
        <h3 style={{color:'#6B2D4E',fontSize:'30px',fontWeight:'800',marginBottom:'8px'}}>One Platform — Every Community</h3>
        <p style={{color:'#7A5068',marginBottom:'44px',fontSize:'15px'}}>Each module is completely independent with its own space, rules and reports</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px',maxWidth:'820px',margin:'0 auto'}}>
          {MODULES.map(m=>(
            <div key={m.title}
              onMouseEnter={()=>setHoverCard(m.title)}
              onMouseLeave={()=>setHoverCard(null)}
              style={{background:'white',border:`1.5px solid ${hoverCard===m.title?'#6B2D4E':'#E8D5DF'}`,borderRadius:'14px',padding:'20px',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',transform:hoverCard===m.title?'translateY(-4px)':'translateY(0)',boxShadow:hoverCard===m.title?'0 8px 28px rgba(107,45,78,0.14)':'0 2px 8px rgba(107,45,78,0.05)',transition:'all 0.2s ease',cursor:'pointer'}}>
              <div style={{fontSize:'28px'}}>{m.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:'700',color:'#2C1A24',fontSize:'15px'}}>{m.title}</div>
                <div style={{fontSize:'12px',color:'#7A5068',marginTop:'3px'}}>{m.desc}</div>
              </div>
              <div style={{fontSize:'11px',background:'#EDD9E5',color:'#6B2D4E',padding:'3px 10px',borderRadius:'20px',fontWeight:'700',whiteSpace:'nowrap'}}>{m.tag}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{background:'#6B2D4E',padding:'64px 32px',textAlign:'center'}}>
        <h3 style={{color:'#FAF0E6',fontSize:'30px',fontWeight:'800',marginBottom:'8px'}}>What our communities say</h3>
        <p style={{color:'rgba(250,240,230,0.6)',marginBottom:'44px',fontSize:'14px'}}>Real stories from real communities worldwide</p>
        <div style={{maxWidth:'600px',margin:'0 auto'}}>
          {mounted&&<div key={activeT} className="tcard" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(212,175,122,0.3)',borderRadius:'18px',padding:'36px'}}>
            <p style={{color:'#FAF0E6',fontSize:'16px',lineHeight:'1.8',marginBottom:'28px',fontStyle:'italic'}}>
              "{TESTIMONIALS[activeT].text}"
            </p>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'14px'}}>
              <img src={TESTIMONIALS[activeT].img} alt={TESTIMONIALS[activeT].name}
                style={{width:'52px',height:'52px',borderRadius:'50%',objectFit:'cover',border:'2px solid #D4AF7A'}}/>
              <div style={{textAlign:'left'}}>
                <div style={{color:'#FAF0E6',fontWeight:'700',fontSize:'14px'}}>{TESTIMONIALS[activeT].name}</div>
                <div style={{color:'#D4AF7A',fontSize:'12px',marginTop:'2px'}}>{TESTIMONIALS[activeT].country}</div>
              </div>
            </div>
          </div>}
          <div style={{display:'flex',justifyContent:'center',gap:'8px',marginTop:'24px'}}>
            {TESTIMONIALS.map((_,i)=>(
              <div key={i} onClick={()=>setActiveT(i)} style={{width:i===activeT?'28px':'8px',height:'8px',borderRadius:'4px',background:i===activeT?'#D4AF7A':'rgba(255,255,255,0.3)',cursor:'pointer',transition:'all 0.3s ease'}}></div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{background:'#2C1A24',padding:'64px 32px',textAlign:'center'}}>
        <h3 style={{color:'#FAF0E6',fontSize:'34px',fontWeight:'800',marginBottom:'12px'}}>Ready to organize your community?</h3>
        <p style={{color:'rgba(250,240,230,0.55)',marginBottom:'36px',fontSize:'15px'}}>Join thousands of communities already using TARSYN worldwide</p>
        <div style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap'}}>
          <a href="/register" className="btn-gold" style={{padding:'15px 36px',background:'#D4AF7A',borderRadius:'12px',color:'#6B2D4E',textDecoration:'none',fontSize:'15px',fontWeight:'800',display:'inline-block'}}>Create Free Account</a>
          <a href="/login" className="btn-outline" style={{padding:'15px 36px',border:'2px solid rgba(212,175,122,0.5)',borderRadius:'12px',color:'#D4AF7A',textDecoration:'none',fontSize:'15px',display:'inline-block'}}>Sign In</a>
        </div>
      </div>

      <footer style={{background:'#2C1A24',textAlign:'center',padding:'22px',borderTop:'1px solid rgba(255,255,255,0.05)',color:'rgba(250,240,230,0.35)',fontSize:'12px'}}>
        <span style={{color:'#D4AF7A',fontWeight:'700'}}>TARSYN</span> — Together Always Rising, Supporting You Now · © 2026
      </footer>
    </div>
  );
}
