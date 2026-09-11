// UNIMUNITY AI - visual identity
//
// ONE central UNIMUNITY AI. The photo shown is only a UI presentation
// choice, not a separate AI - see "PHASE 1.2 - FINAL TONTINE + CENTRAL AI
// + ADMIN & MEMBER CHAT" spec, Part 11: "The different avatars do NOT
// represent different AI systems... The avatar is a UI presentation
// decision. Do not create separate AI logic for the two avatars."
//
// `persona` picks which photo: 'admin' (male portrait, Part 9) for
// Super Admin / Admin-Organizer accounts, 'member' (female portrait,
// Part 10) for member accounts. Both photos were supplied by Rachele
// (AI-generated portraits, not real people) - see public/ai/. Neither
// image has any text baked in, matching the spec's "no text in the
// image" requirement; the AI's name is rendered separately by whatever
// screen uses this component.
import Image from 'next/image';

const C = {
  bordeaux: '#6B2D4E',
  or: '#E9C77B',
  creme: '#FBEEDD',
  ivoire: '#FFFDF7',
  success: '#3F7D5C',
  danger: '#C62828',
};

export type RobotAvatarState = 'welcome' | 'waiting' | 'thinking' | 'success' | 'error' | 'idle';
export type RobotAvatarVariant = 'bust' | 'head';
export type AIPersona = 'admin' | 'member';

const PERSONA_SRC: Record<AIPersona, string> = {
  admin: '/ai/ai-avatar-admin-male.png',
  member: '/ai/ai-avatar-member-female.png',
};

interface RobotAvatarProps {
  state?: RobotAvatarState;
  size?: number;
  variant?: RobotAvatarVariant;
  persona?: AIPersona;
}

function StatusBadge({ state, size }: { state: RobotAvatarState; size: number }) {
  const r = Math.max(6, size * 0.24);
  const style = { position: 'absolute' as const, bottom: -1, right: -1, width: r * 2, height: r * 2 };

  if (state === 'success') {
    return (
      <svg style={style} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill={C.success} stroke={C.ivoire} strokeWidth="2" />
        <path d="M7,12 L10.5,15.5 L17,8" stroke={C.ivoire} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === 'error') {
    return (
      <svg style={style} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill={C.danger} stroke={C.ivoire} strokeWidth="2" />
        <line x1="12" y1="7" x2="12" y2="13" stroke={C.ivoire} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1.4" fill={C.ivoire} />
      </svg>
    );
  }
  if (state === 'thinking' || state === 'waiting') {
    return (
      <svg style={style} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill={C.creme} stroke={C.bordeaux} strokeWidth="1.6" />
        <circle cx="7" cy="12" r="1.7" fill={C.bordeaux} opacity="0.9" />
        <circle cx="12" cy="12" r="1.7" fill={C.bordeaux} opacity="0.6" />
        <circle cx="17" cy="12" r="1.7" fill={C.bordeaux} opacity="0.35" />
      </svg>
    );
  }
  return (
    <svg style={style} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill={C.or} stroke={C.ivoire} strokeWidth="2.4" opacity={state === 'idle' ? 0.55 : 1} />
    </svg>
  );
}

export default function RobotAvatar({ state = 'welcome', size = 96, variant = 'bust', persona = 'member' }: RobotAvatarProps) {
  const ringColor = state === 'error' ? C.danger : state === 'success' ? C.success : C.or;
  const showBadge = variant === 'bust' || size >= 36;
  const label = persona === 'admin' ? 'UNIMUNITY AI (admin view)' : 'UNIMUNITY AI';

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        position: 'relative', display: 'inline-flex', flexShrink: 0,
        width: size, height: size, borderRadius: '50%', overflow: 'visible',
      }}
    >
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        border: `2px solid ${ringColor}`, background: C.ivoire, flexShrink: 0,
      }}>
        <Image
          src={PERSONA_SRC[persona]}
          alt=""
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
          unoptimized
        />
      </div>
      {showBadge && <StatusBadge state={state} size={size} />}
    </div>
  );
}
