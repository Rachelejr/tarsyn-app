'use client';

import type { OrganizerGroup } from '@/lib/assistants';

// Choose the groups an assistant works in. A group already given to the
// OTHER assistant is shown but locked, so two assistants never share a group.
export default function GroupPicker({ groups, value, onChange, currentAssistantId, invalid }: {
  groups: OrganizerGroup[]; value: string[]; onChange: (ids: string[]) => void;
  currentAssistantId: string | null; invalid?: boolean;
}) {
  const free = groups.filter(g => !g.assistantId || g.assistantId === currentAssistantId);
  const allFreeChosen = free.length > 0 && free.every(g => value.includes(g.id));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);

  if (groups.length === 0) {
    return <p style={{ margin: 0, fontSize: 13, color: '#8A7B6C' }}>You have no group yet. Create a group first, then invite an assistant for it.</p>;
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: invalid ? '#C62828' : '#8A7B6C', fontWeight: invalid ? 700 : 500 }}>
          {value.length} of {free.length} available group{free.length !== 1 ? 's' : ''} selected
        </span>
        {free.length > 1 && (
          <button type="button" onClick={() => onChange(allFreeChosen ? [] : free.map(g => g.id))}
            style={{ background: 'none', border: 'none', color: '#6B2D4E', fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
            {allFreeChosen ? 'Unselect all' : 'Select all available'}
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, maxHeight: 260, overflowY: 'auto', padding: 2 }}>
        {groups.map(g => {
          const locked = !!g.assistantId && g.assistantId !== currentAssistantId;
          const on = value.includes(g.id);
          return (
            <label key={g.id} title={locked ? `Managed by ${g.assistantName}` : ''}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 11, cursor: locked ? 'not-allowed' : 'pointer',
                border: '1.5px solid ' + (on ? '#6B2D4E' : invalid ? '#E8B4B8' : '#EAD9BE'), background: locked ? '#F5F0EA' : on ? '#F8EEF3' : '#FFFDF9', opacity: locked ? 0.75 : 1 }}>
              <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(g.id)} style={{ width: 16, height: 16, accentColor: '#6B2D4E' }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#4A1F38', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                {locked && <span style={{ display: 'block', fontSize: 11, color: '#A08B7D' }}>Managed by {g.assistantName}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
