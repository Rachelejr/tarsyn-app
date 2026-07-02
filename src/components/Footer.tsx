'use client';

export const APP_VERSION = '1.0.0';

const COMPANY_NAME = 'Ma Production Luxenn Zara LLC';
const CURRENT_YEAR = new Date().getFullYear();

const C = {
  bg: '#B24C72',
  textFaint: 'rgba(251,238,221,0.7)',
  textGold: '#E9C77B',
  divider: 'rgba(255,255,255,0.12)',
};

export default function Footer({
  onLanguageClick,
}: {
  onLanguageClick?: () => void;
}) {
  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.divider}`, padding: '20px 32px' }}>
      <style>{`
        .tarsyn-footer-desktop { display: flex; }
        .tarsyn-footer-mobile { display: none; }
        @media (max-width: 640px) {
          .tarsyn-footer-desktop { display: none; }
          .tarsyn-footer-mobile { display: flex; }
        }
        .tarsyn-footer-link {
          color: ${C.textFaint};
          font-size: 11px;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .tarsyn-footer-link:hover { color: ${C.textGold}; }
      `}</style>

      <div className="tarsyn-footer-desktop" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: C.textGold, fontWeight: 700, fontSize: '13px', letterSpacing: '1px' }}>TARSYN™</span>
          <span style={{ color: C.textFaint, fontSize: '12px' }}>
            A product of <strong style={{ color: 'rgba(251,238,221,0.9)' }}>{COMPANY_NAME}</strong>
          </span>
          <span style={{ color: C.textFaint, fontSize: '11px' }}>· © {CURRENT_YEAR} All Rights Reserved</span>
          <span style={{ color: C.textFaint, fontSize: '11px' }}>· Version {APP_VERSION}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <a href="/privacy" className="tarsyn-footer-link">Privacy</a>
          <a href="/terms" className="tarsyn-footer-link">Terms</a>
          <button onClick={onLanguageClick} className="tarsyn-footer-link" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit' }}>
            Language
          </button>
        </div>
      </div>

      <div className="tarsyn-footer-mobile" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '2px' }}>
        <span style={{ color: C.textGold, fontWeight: 700, fontSize: '13px', letterSpacing: '1px' }}>TARSYN™</span>
        <span style={{ color: C.textFaint, fontSize: '11px' }}>by {COMPANY_NAME}</span>
      </div>
    </footer>
  );
}