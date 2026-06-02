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
const COMMUNITY_IMGS = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=300&fit=crop',
];

export default function HomePage() {
  const [lang,setLang]=useState('English');
  const [hoverCard,setHoverCard]=useState<string|null>(null);
  const [activeT,setActiveT]=useState(0);
  const [activeImg,setActiveImg]=useState(0);
  const [mounted,setMounted]=useState(false);

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
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes imgFade{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:scale(1)}}
        .animate-fade{animation:fadeUp 0.8s ease forwards;}
        .floating{animation:float 3s ease-in-out infinite;}
        .tcard{animation:slideIn 0.5s ease forwards;}
        .img-fade{animation:imgFade 0.8s ease forwards;}
        .btn-gold:hover{background:#c49a5a!important;transform:translateY(-2px);box-shadow:0 8px 24px rgba(212,175,122,0.4);}
        .btn-outline:hover{background:rgba(255,255,255,0.12)!important;transform:translateY(-2px);}
        .btn-gold,.btn-outline{transition:all 0.2s ease;}
        .logo-icon:hover{transform:rotate(20deg);}
        .logo-icon{transition:transform 0.3s ease;}
      `}</style>

      {/* NAVBAR */}
      <nav style={{background:'#6B2D4E',padding:'14px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 12px rgba(0,0,0,0.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div className="logo-icon" style={{width:'38px',height:'38px',background:'#D4AF7A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',cursor:'pointer'}}>✦</div>
          <div>
            <div style={{color:'#FFFFFF',fontSize:'20px',fontWeight:'700',letterSpacing:'3px'}}>TARSYN</div>
            <div style={{color:'#D4AF7A',fontSize:'9px',letterSpacing:'3px'}}>YOUR COMMUNITY. YOUR POWER.</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <select value={lang} onChange={e=>setLang(e.target.value)}
            style={{padding:'7px 12px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'#FFFFFF',fontSize:'13px',cursor:'pointer',outline:'none'}}>
            {LANGUAGES.map(l=><option key={l} value={l} style={{background:'#6B2D4E',color:'white'}}>{l}</option>)}
          </select>
          <a href="/login" style={{padding:'9px 20px',border:'1.5px solid rgba(255,255,255,0.4)',borderRadius:'8px',color:'#FFFFFF',textDecoration:'none',fontSize:'14px'}}>Sign In</a>
          <a href="/register" style={{padding:'9px 20px',background:'#D4AF7A',borderRadius:'8px',color:'#6B2D4E',textDecoration:'none',fontSize:'14px',fontWeight:'700'}}>Create Account</a>
        </div>
      </nav>

      {/* HERO */}
      <div style={{background:'#6B2D4E',padding:'80px 32px 60px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'20px',left:'5%',opacity:0.12,fontSize:'70px',pointerEvents:'none'}} className="floating">🤝</div>
        <div style={{position:'absolute',top:'30px',right:'6%',opacity:0.12,fontSize:'60px',pointerEvents:'none',animationDelay:'1s'}} className="floating">💰</div>
        <div style={{position:'absolute',bottom:'30px',left:'8%',opacity:0.10,fontSize:'50px',pointerEvents:'none',animationDelay:'0.5s'}} className="floating">🌍</div>

        <h1 style={{color:'#FFFFFF',fontSize:'48px',fontWeight:'700',marginBottom:'16px',position:'relative'}}>The Smart Way to Manage</h1>
        <h2 style={{color:'#D4AF7A',fontSize:'48px',fontWeight:'700',marginBottom:'24px',fontStyle:'italic',position:'relative'}}>Your Community</h2>
        <p style={{color:'rgba(250,240,230,0.85)',fontSize:'18px',maxWidth:'600px',margin:'0 auto 40px',lineHeight:'1.7',position:'relative'}}>
          Track contributions, manage members, generate receipts and reports automatically. Built for Haitian Sol groups, African tontines and communities worldwide.
        </p>
        <div style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap',position:'relative'}}>
          <a href="/register" className="btn-gold" style={{padding:'16px 36px',background:'#D4AF7A',borderRadius:'10px',color:'#6B2D4E',textDecoration:'none',fontSize:'16px',fontWeight:'700',display:'inline-block'}}>Create Free Account</a>
          <a href="/login" className="btn-outline" style={{padding:'16px 36px',border:'2px solid rgba(255,255,255,0.4)',borderRadius:'10px',color:'#FFFFFF',textDecoration:'none',fontSize:'16px',display:'inline-block'}}>Sign In</a>
        </div>

        <div style={{display:'flex',justifyContent:'center',alignItems:'center',marginTop:'48px',flexWrap:'wrap',gap:'4px'}}>
          {[{i:'MJ',bg:'#C4748E',img:TESTIMONIALS[0].img},{i:'KD',bg:'#4A7C59',img:TESTIMONIALS[1].img},{i:'RA',bg:'#D4AF7A',img:TESTIMONIALS[2].img},{i:'PM',bg:'#2C1A24',img:TESTIMONIALS[3].img}].map((a,idx)=>(
            <div key={a.i} style={{width:'44px',height:'44px',borderRadius:'50%',overflow:'hidden',border:'2px solid rgba(255,255,255,0.5)',marginLeft:idx>0?'-10px':'0',zIndex:10-idx}}>
              <img src={a.img} alt={a.i} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
          ))}
          <span style={{color:'rgba(250,240,230,0.7)',fontSize:'13px',marginLeft:'16px'}}>+2,400 communities worldwide</span>
        </div>
      </div>

      {/* COMMUNITY PHOTO SLIDER */}
      <div style={{background:'#2C1A24',padding:'48px 32px',textAlign:'center'}}>
        <h3 style={{color:'#D4AF7A',fontSize:'20px',fontWeight:'600',marginBottom:'24px',letterSpacing:'1px'}}>COMMUNITIES AROUND THE WORLD</h3>
        <div style={{maxWidth:'700px',margin:'0 auto',borderRadius:'16px',overflow:'hidden',boxShadow:'0 16px 48px rgba(0,0,0,0.4)',position:'relative'}}>
          {mounted&&<img key={activeImg} src={COMMUNITY_IMGS[activeImg]} alt="community" className="img-fade"
            style={{width:'100%',height:'340px',objectFit:'cover',display:'block'}}/>}
          <div style={{position:'absolute',bottom:'16px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'8px'}}>
            {COMMUNITY_IMGS.map((_,i)=>(
              <div key={i} onClick={()=>setActiveImg(i)} style={{width:i===activeImg?'24px':'8px',height:'8px',borderRadius:'4px',background:i===activeImg?'#D4AF7A':'rgba(255,255,255,0.5)',cursor:'pointer',transition:'all 0.3s ease'}}></div>
            ))}
          </div>
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'linear-gradient(to top, rgba(44,26,36,0.6) 0%, transparent 50%)',pointerEvents:'none'}}></div>
        </div>
      </div>

      {/* STATS */}
      <div style={{background:'#EDD9E5',padding:'40px 32px'}}>
        <div style={{display:'flex',justifyContent:'center',gap:'60px',flexWrap:'wrap'}}>
          {[['25','Languages Supported'],['100%','Automatic & Free'],['∞','Members — No Limit']].map(([v,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:'36px',fontWeight:'700',color:'#6B2D4E'}}>{v}</div>
              <div style={{fontSize:'14px',color:'#7A5068',marginTop:'4px'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MODULES */}
      <div style={{padding:'60px 32px',textAlign:'center'}}>
        <h3 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'700',marginBottom:'8px'}}>One Platform — Every Community</h3>
        <p style={{color:'#7A5068',marginBottom:'40px'}}>Each module is completely independent with its own space, rules and reports</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'16px',maxWidth:'800px',margin:'0 auto'}}>
          {MODULES.map(m=>(
            <div key={m.title}
              onMouseEnter={()=>setHoverCard(m.title)}
              onMouseLeave={()=>setHoverCard(null)}
              style={{background:'white',border:`1.5px solid ${hoverCard===m.title?'#6B2D4E':'#D9C0CC'}`,borderRadius:'12px',padding:'20px',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',transform:hoverCard===m.title?'translateY(-4px)':'translateY(0)',boxShadow:hoverCard===m.title?'0 8px 24px rgba(107,45,78,0.12)':'none',transition:'all 0.2s ease',cursor:'pointer'}}>
              <div style={{fontSize:'28px'}}>{m.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:'700',color:'#2C1A24',fontSize:'15px'}}>{m.title}</div>
                <div style={{fontSize:'12px',color:'#7A5068',marginTop:'2px'}}>{m.desc}</div>
              </div>
              <div style={{fontSize:'11px',background:'#EDD9E5',color:'#6B2D4E',padding:'3px 8px',borderRadius:'20px',fontWeight:'600',whiteSpace:'nowrap'}}>{m.tag}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{background:'#6B2D4E',padding:'60px 32px',textAlign:'center'}}>
        <h3 style={{color:'#FFFFFF',fontSize:'28px',fontWeight:'700',marginBottom:'8px'}}>What our communities say</h3>
        <p style={{color:'rgba(250,240,230,0.6)',marginBottom:'40px',fontSize:'14px'}}>Real stories from real communities worldwide</p>
        <div style={{maxWidth:'600px',margin:'0 auto'}}>
          {mounted&&<div key={activeT} className="tcard" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(212,175,122,0.3)',borderRadius:'16px',padding:'32px'}}>
            <p style={{color:'rgba(250,240,230,0.9)',fontSize:'16px',lineHeight:'1.7',marginBottom:'24px',fontStyle:'italic'}}>
              "{TESTIMONIALS[activeT].text}"
            </p>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'12px'}}>
              <img src={TESTIMONIALS[activeT].img} alt={TESTIMONIALS[activeT].name}
                style={{width:'48px',height:'48px',borderRadius:'50%',objectFit:'cover',border:'2px solid #D4AF7A'}}/>
              <div style={{textAlign:'left'}}>
                <div style={{color:'#FFFFFF',fontWeight:'600',fontSize:'14px'}}>{TESTIMONIALS[activeT].name}</div>
                <div style={{color:'#D4AF7A',fontSize:'12px'}}>{TESTIMONIALS[activeT].country}</div>
              </div>
            </div>
          </div>}
          <div style={{display:'flex',justifyContent:'center',gap:'8px',marginTop:'20px'}}>
            {TESTIMONIALS.map((_,i)=>(
              <div key={i} onClick={()=>setActiveT(i)} style={{width:i===activeT?'24px':'8px',height:'8px',borderRadius:'4px',background:i===activeT?'#D4AF7A':'rgba(255,255,255,0.3)',cursor:'pointer',transition:'all 0.3s ease'}}></div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{background:'#2C1A24',padding:'60px 32px',textAlign:'center'}}>
        <h3 style={{color:'#FFFFFF',fontSize:'32px',fontWeight:'700',marginBottom:'12px'}}>Ready to organize your community?</h3>
        <p style={{color:'rgba(250,240,230,0.6)',marginBottom:'32px'}}>Join thousands of communities already using TARSYN worldwide</p>
        <div style={{display:'flex',gap:'16px',justifyContent:'center',flexWrap:'wrap'}}>
          <a href="/register" className="btn-gold" style={{padding:'14px 32px',background:'#D4AF7A',borderRadius:'10px',color:'#6B2D4E',textDecoration:'none',fontSize:'15px',fontWeight:'700',display:'inline-block'}}>Create Free Account</a>
          <a href="/login" className="btn-outline" style={{padding:'14px 32px',border:'2px solid rgba(212,175,122,0.5)',borderRadius:'10px',color:'#D4AF7A',textDecoration:'none',fontSize:'15px',display:'inline-block'}}>Sign In</a>
        </div>
      </div>

      <footer style={{background:'#2C1A24',textAlign:'center',padding:'20px',borderTop:'1px solid rgba(255,255,255,0.05)',color:'rgba(250,240,230,0.4)',fontSize:'12px'}}>
        <span style={{color:'#D4AF7A'}}>TARSYN</span> — Together Always Rising, Supporting You Now · © 2026
      </footer>
    </div>
  );
}