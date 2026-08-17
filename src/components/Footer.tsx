'use client';

export const APP_VERSION = '1.0.0';

const COMPANY_NAME = 'Ma Production Luxenn Zara LLC';
const CURRENT_YEAR = new Date().getFullYear();

const C = {
  bg: '#6B2D4E',
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
        .UNIMUNITY-footer-desktop { display: flex; }
        .UNIMUNITY-footer-mobile { display: none; }
        @media (max-width: 640px) {
          .UNIMUNITY-footer-desktop { display: none; }
          .UNIMUNITY-footer-mobile { display: flex; }
        }
        .UNIMUNITY-footer-link {
          color: ${C.textFaint};
          font-size: 11px;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .UNIMUNITY-footer-link:hover { color: ${C.textGold}; }
      `}</style>

      <div className="UNIMUNITY-footer-desktop" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: C.textGold, fontWeight: 700, fontSize: '13px', letterSpacing: '1px' }}>UNIMUNITY™</span>
          <span style={{ color: C.textFaint, fontSize: '12px' }}>
            A product of <strong style={{ color: 'rgba(251,238,221,0.9)' }}>{COMPANY_NAME}</strong>
          </span>
          <span style={{ color: C.textFaint, fontSize: '11px' }}>· © {CURRENT_YEAR} All Rights Reserved</span>
          <span style={{ color: C.textFaint, fontSize: '11px' }}>· Version {APP_VERSION}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <a href="/privacy" className="UNIMUNITY-footer-link">Privacy</a>
          <a href="/terms" className="UNIMUNITY-footer-link">Terms</a>
          <button onClick={onLanguageClick} className="UNIMUNITY-footer-link" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit' }}>
            Language
          </button>
        </div>
      </div>

      <div className="UNIMUNITY-footer-mobile" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '2px' }}>
        <span style={{ color: C.textGold, fontWeight: 700, fontSize: '13px', letterSpacing: '1px' }}>UNIMUNITY™</span>
        <span style={{ color: C.textFaint, fontSize: '11px' }}>by {COMPANY_NAME}</span>
      </div>
    </footer>
  );
}