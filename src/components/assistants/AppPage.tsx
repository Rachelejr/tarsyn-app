'use client';

import { useRouter } from 'next/navigation';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';

// The app's standard page frame (same header as Add Member / Record Payment):
// cream-to-bordeaux bar, UNIMUNITY logo on the left, shimmering title in the
// middle, date / time / weather on the right, then the page, then the footer.
export default function AppPage({ title, subtitle, back, children }: {
  title: string; subtitle?: string; back?: { label: string; href: string }; children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .ap-card { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 18px; box-shadow: 0 2px 14px rgba(107,45,78,0.06); padding: 18px 22px; }
        .ap-head { display: flex; align-items: center; gap: 11px; margin: 0 0 14px; padding-bottom: 11px; border-bottom: 1px solid #F3E6D8; }
        .ap-ico { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .ap-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .ap-label { display: block; color: #A08B7D; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 4px; }
        .ap-in { width: 100%; height: 38px; padding: 0 11px; border: 1.5px solid #EAD9BE; border-radius: 10px; font-size: 13.5px; color: #3A2F1F; outline: none; box-sizing: border-box; background: #FFFDF9; font-family: inherit; transition: border-color .15s, box-shadow .15s; }
        textarea.ap-in { height: auto; padding: 9px 11px; resize: vertical; }
        .ap-in:focus { border-color: #E9C77B; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF; }
        .ap-in.bad { border-color: #C62828; }
        .ap-btn { height: 42px; padding: 0 20px; border-radius: 12px; font-size: 13.5px; font-weight: 800; cursor: pointer; border: none; transition: transform .15s, filter .15s; }
        .ap-btn:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
        .ap-btn:disabled { opacity: .6; cursor: not-allowed; }
        .ap-primary { background: linear-gradient(135deg,#6B2D4E,#4A1F38); color: #FBEEDD; box-shadow: 0 6px 16px rgba(107,45,78,0.25); }
        .ap-soft { background: #FBEEDD; color: #6B2D4E; border: 1.5px solid #F0DCA8; }
        .ap-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .ap-back:hover { background: #FBEEDD; }
        .ap-hdr-title, .ap-hdr-sub { -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; display: block; background-size: 200% auto; animation: ap-shimmer 4s linear infinite; }
        .ap-hdr-title { background-image: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%); }
        .ap-hdr-sub { background-image: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%); }
        @keyframes ap-shimmer { 0% { background-position: 0% center; } 100% { background-position: -200% center; } }
        @media (max-width: 760px) { .ap-hdr { grid-template-columns: 1fr !important; justify-items: center; row-gap: 8px; } .ap-hdr > * { justify-self: center !important; } .ap-hdr-sub { white-space: normal; } }
      `}</style>
      <div style={{ flex: 1 }}>
        <div className="ap-hdr" style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start' }} />
          <div style={{ textAlign: 'center', justifySelf: 'center' }}>
            <h1 className="ap-hdr-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>{title}</h1>
            {subtitle && <p className="ap-hdr-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>{subtitle}</p>}
          </div>
          <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px 28px' }}>
          {back && (
            <div style={{ marginBottom: 12 }}>
              <button className="ap-back" onClick={() => router.push(back.href)}>{back.label}</button>
            </div>
          )}
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
