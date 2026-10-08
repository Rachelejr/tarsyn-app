'use client';

import { ALWAYS_ALLOWED, NEVER_ALLOWED } from '@/lib/assistants';

// "What an assistant can / cannot do" - shown on the assistants pages.
export default function RightsLists({ compact = false }: { compact?: boolean }) {
  const item = (icon: string, color: string, text: string) => (
    <li key={text} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: compact ? 12 : 12.5, color: '#3A2F1F', lineHeight: 1.45, margin: '0 0 6px' }}>
      <span style={{ color, fontWeight: 800, flexShrink: 0 }}>{icon}</span>{text}
    </li>
  );
  return (
    <div>
      <p className="ap-label" style={{ color: '#3F7D5C' }}>Always allowed</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>{ALWAYS_ALLOWED.map(t => item('\u2713', '#3F7D5C', t))}</ul>
      <p className="ap-label" style={{ color: '#B0525F' }}>Never allowed</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{NEVER_ALLOWED.map(t => item('\u2715', '#B0525F', t))}</ul>
    </div>
  );
}
