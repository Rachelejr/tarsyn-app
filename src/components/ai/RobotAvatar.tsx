// UNIMUNITY AI Assistant - visual identity
// The one official UNIMUNITY AI character - identical across every role
// and every screen it appears on. This is a faithful React port of the
// approved design canvas (RobotAvatar.dc.html): same geometry, same
// brand colors, same six expression states. Never fork this into a
// per-module or per-role variant.

const C = {
  bordeaux: '#6B2D4E',
  or: '#E9C77B',
  creme: '#FBEEDD',
  danger: '#C62828',
  ivoire: '#FFFDF7',
};

export type RobotAvatarState = 'welcome' | 'waiting' | 'thinking' | 'success' | 'error' | 'idle';
export type RobotAvatarVariant = 'bust' | 'head';

interface RobotAvatarProps {
  state?: RobotAvatarState;
  size?: number;
  variant?: RobotAvatarVariant;
}

export default function RobotAvatar({ state = 'welcome', size = 96, variant = 'bust' }: RobotAvatarProps) {
  const isBust = variant === 'bust';
  const hasGlow = state !== 'idle';

  return (
    <div style={{ display: 'inline-flex', lineHeight: 0 }}>
      <svg width={size} height={size} viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {hasGlow && <circle cx="60" cy="58" r="54" fill={C.or} opacity="0.16" />}

        {isBust && (
          <>
            <path d="M14,150 L34,100 L86,100 L106,150 Z" fill={C.bordeaux} />
            <path d="M34,100 L86,100" stroke={C.or} strokeWidth="3" strokeLinecap="round" />
            <path d="M60,113 L64,121 L60,129 L56,121 Z" fill={C.or} />
          </>
        )}

        <line x1="60" y1="20" x2="60" y2="13" stroke={C.or} strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="8" r="5" fill={C.or} />

        <rect x="20" y="20" width="80" height="76" rx="26" fill={C.bordeaux} />
        <rect x="10" y="50" width="10" height="20" rx="5" fill={C.or} />
        <rect x="100" y="50" width="10" height="20" rx="5" fill={C.or} />
        <ellipse cx="45" cy="32" rx="18" ry="8" fill={C.ivoire} opacity="0.12" />

        <rect x="32" y="36" width="56" height="46" rx="16" fill={C.creme} stroke={C.or} strokeWidth="2" />

        {state === 'welcome' && (
          <>
            <path d="M40,56 Q46,48 52,56" stroke={C.bordeaux} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M68,56 Q74,48 80,56" stroke={C.bordeaux} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M44,68 Q60,80 76,68" stroke={C.bordeaux} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}

        {state === 'waiting' && (
          <>
            <ellipse cx="46" cy="56" rx="5" ry="6" fill={C.bordeaux} />
            <ellipse cx="74" cy="56" rx="5" ry="6" fill={C.bordeaux} />
            <line x1="50" y1="72" x2="70" y2="72" stroke={C.bordeaux} strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="89" r="2.4" fill={C.or} opacity="0.4" />
            <circle cx="60" cy="89" r="2.4" fill={C.or} opacity="0.7" />
            <circle cx="70" cy="89" r="2.4" fill={C.or} opacity="1" />
          </>
        )}

        {state === 'thinking' && (
          <>
            <ellipse cx="46" cy="56" rx="5" ry="6" fill={C.bordeaux} />
            <path d="M68,56 Q74,52 80,56" stroke={C.bordeaux} strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="60" cy="72" r="4" fill="none" stroke={C.bordeaux} strokeWidth="3" />
            <circle cx="100" cy="18" r="4" fill={C.or} opacity="0.5" />
            <circle cx="109" cy="7" r="6" fill={C.or} opacity="0.75" />
          </>
        )}

        {state === 'success' && (
          <>
            <path d="M40,56 Q46,48 52,56" stroke={C.bordeaux} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M68,56 Q74,48 80,56" stroke={C.bordeaux} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M42,66 Q60,84 78,66" stroke={C.bordeaux} strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="98" cy="90" r="13" fill={C.or} stroke={C.creme} strokeWidth="2" />
            <path d="M92,90 L96,95 L104,84" stroke="#4A1F38" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {state === 'error' && (
          <>
            <line x1="41" y1="51" x2="51" y2="57" stroke={C.bordeaux} strokeWidth="3" strokeLinecap="round" />
            <line x1="79" y1="51" x2="69" y2="57" stroke={C.bordeaux} strokeWidth="3" strokeLinecap="round" />
            <path d="M48,74 Q60,68 72,74" stroke={C.bordeaux} strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="98" cy="90" r="13" fill={C.danger} stroke={C.creme} strokeWidth="2" />
            <line x1="98" y1="83" x2="98" y2="91" stroke={C.ivoire} strokeWidth="3" strokeLinecap="round" />
            <circle cx="98" cy="96" r="1.6" fill={C.ivoire} />
          </>
        )}

        {state === 'idle' && (
          <>
            <path d="M40,57 Q46,60 52,57" stroke={C.bordeaux} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M68,57 Q74,60 80,57" stroke={C.bordeaux} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <line x1="54" y1="74" x2="66" y2="74" stroke={C.bordeaux} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          </>
        )}
      </svg>
    </div>
  );
}
