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

// Rachele asked for every colored circular overlay on the avatar photos -
// the gold "idle" dot, the green success check, the red error mark, the
// thinking dots - to be removed outright, not just the yellow one, and
// for the fix to be in the component that generates them rather than a
// CSS patch on top. That component was this file's StatusBadge (a small
// SVG badge drawn in the corner of the photo) plus the state-dependent
// ring color below (which turned the whole border red/green). Both are
// gone now: the avatar is just the photo in a single, constant-colored
// ring - the "normal avatar container/border" she asked to keep - with
// nothing else drawn on top of it. `state` stays in the props for the
// existing call sites (AIContent.tsx passes 'thinking' while the AI is
// answering, for example) but no longer changes what's rendered; if a
// visual "thinking/sent/error" cue is wanted again later, it should live
// next to the message bubble, not as an overlay on the identity photo.
export default function RobotAvatar({ size = 96, persona = 'member' }: RobotAvatarProps) {
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
        border: `2px solid ${C.or}`, background: C.ivoire, flexShrink: 0,
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
    </div>
  );
}
