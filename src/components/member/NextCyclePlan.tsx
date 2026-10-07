'use client';

import { useEffect, useState } from 'react';

// "What are your plans for the next cycle?" card on the member space.
// Two states:
//  - ask:      three choice tiles + an optional note + a Send button
//  - answered: a compact summary of the answer, with "Change my answer"
// Once sent, the card collapses into the summary, so the typed note no longer
// sits in an open text box.

export type NextCycleAnswer = 'yes' | 'pause' | 'no';

const P = {
  bordeaux: '#6B2D4E',
  texteFonce: '#4A1F38',
  muted: '#8A7A88',
  border: '#EAD9BE',
  ivoire: '#FFFDF7',
  creme: '#FBEEDD',
};

const OPTIONS: Record<NextCycleAnswer, {
  icon: string; title: string; hint: string; summary: string; placeholder: string;
  ink: string; tint: string; ring: string;
}> = {
  yes: {
    icon: '↻', title: 'Continue', hint: 'I join the next cycle',
    summary: 'You are joining', placeholder: 'e.g. Count me in, same position if possible',
    ink: '#3F7D5C', tint: '#E9F3EC', ring: '#A9CDB8',
  },
  pause: {
    icon: '❚❚', title: 'Pause', hint: 'I skip it but stay in the group',
    summary: 'You are taking a pause from', placeholder: 'e.g. I take a break and come back in March',
    ink: '#9C7A2E', tint: '#FBF2DC', ring: '#E5CC8E',
  },
  no: {
    icon: '→', title: 'Leave', hint: 'I leave the group after this cycle',
    summary: 'You are not joining', placeholder: 'e.g. Thank you all, it was a pleasure',
    ink: '#B0525F', tint: '#F8E8EA', ring: '#E2B3BA',
  },
};

const ORDER: NextCycleAnswer[] = ['yes', 'pause', 'no'];

function prettyDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

type Props = {
  cycleNumber: number;
  cycleEnd: string | null;
  daysToEnd: number | null;
  currentAnswer: NextCycleAnswer | null;
  currentNote?: string;
  saving: boolean;
  onSubmit: (answer: NextCycleAnswer, note: string) => Promise<boolean>;
};

export default function NextCyclePlan({ cycleNumber, cycleEnd, daysToEnd, currentAnswer, currentNote, saving, onSubmit }: Props) {
  const next = cycleNumber + 1;
  const [editing, setEditing] = useState(!currentAnswer);
  const [choice, setChoice] = useState<NextCycleAnswer | null>(currentAnswer);
  const [note, setNote] = useState(currentNote || '');
  const [justSent, setJustSent] = useState(false);

  // When the saved answer changes (other group, reload), start from it again.
  useEffect(() => {
    setEditing(!currentAnswer);
    setChoice(currentAnswer);
    setNote(currentNote || '');
  }, [currentAnswer, currentNote]);

  const when = daysToEnd !== null && daysToEnd < 0
    ? `Cycle ${cycleNumber} has ended`
    : cycleEnd
      ? `Cycle ${cycleNumber} ends on ${prettyDate(cycleEnd)}` + (daysToEnd !== null ? ` · in ${daysToEnd} day${daysToEnd === 1 ? '' : 's'}` : '')
      : `Cycle ${cycleNumber} is coming to an end`;

  const send = async () => {
    if (!choice || saving) return;
    const ok = await onSubmit(choice, note.trim());
    if (ok) { setEditing(false); setJustSent(true); }
  };

  // The big confirmation only stays a few seconds, then shrinks to a chip.
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (!justSent) return;
    const t1 = setTimeout(() => setFading(true), 3500);
    const t2 = setTimeout(() => { setJustSent(false); setFading(false); }, 4100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [justSent]);

  const cancelEdit = () => {
    setChoice(currentAnswer);
    setNote(currentNote || '');
    setEditing(false);
  };

  const card: React.CSSProperties = {
    background: `linear-gradient(135deg, ${P.creme} 0%, ${P.ivoire} 70%)`,
    border: '1px solid ' + P.border,
    borderRadius: 16,
    padding: '16px 18px',
    marginBottom: 14,
    boxShadow: '0 2px 10px rgba(107,45,78,0.06)',
  };

  // ---------- Answered, settled: a small chip that leaves room for the grid ----------
  if (!editing && currentAnswer && !justSent) {
    const o = OPTIONS[currentAnswer];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span
          title={currentNote ? '\u201C' + currentNote + '\u201D' : undefined}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px 5px 6px', borderRadius: 999,
            background: o.tint, border: '1px solid ' + o.ring, fontSize: 12, fontWeight: 700, color: o.ink,
          }}
        >
          <span aria-hidden style={{
            width: 20, height: 20, borderRadius: '50%', background: o.ink, color: 'white',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800,
          }}>{o.icon}</span>
          Cycle {next}: {o.title}
        </span>
        <button
          onClick={() => setEditing(true)}
          style={{ border: 'none', background: 'transparent', padding: 0, color: P.muted, fontSize: 11.5, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Change
        </button>
      </div>
    );
  }

  // ---------- Answered just now: confirmation, fades away after a few seconds ----------
  if (!editing && currentAnswer) {
    const o = OPTIONS[currentAnswer];
    return (
      <div style={{ ...card, background: `linear-gradient(135deg, ${o.tint} 0%, ${P.ivoire} 75%)`, borderColor: o.ring, transition: 'opacity .6s ease', opacity: fading ? 0 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div aria-hidden style={{
            width: 42, height: 42, borderRadius: '50%', background: o.ink, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0,
          }}>{o.icon}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: P.texteFonce }}>
              {o.summary} cycle {next}
            </div>
            <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>
              ✓ Sent to your organizer · 
              you can change it until cycle {next} starts.
            </div>
          </div>
          <button
            onClick={() => { setJustSent(false); setEditing(true); }}
            style={{
              padding: '7px 14px', borderRadius: 999, border: '1.5px solid ' + o.ring, background: 'white',
              color: o.ink, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
            }}
          >
            Change my answer
          </button>
        </div>
        {currentNote && (
          <div style={{
            marginTop: 12, marginLeft: 56, padding: '8px 12px', borderLeft: '3px solid ' + o.ring,
            background: 'rgba(255,255,255,0.7)', borderRadius: '0 10px 10px 0',
            fontSize: 12.5, color: P.texteFonce, fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            “{currentNote}”
          </div>
        )}
      </div>
    );
  }

  // ---------- Ask: choice tiles + optional note ----------
  const picked = choice ? OPTIONS[choice] : null;
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: P.bordeaux, background: 'white', border: '1px solid ' + P.border, borderRadius: 999, padding: '3px 10px',
        }}>Cycle {next}</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: P.bordeaux }}>What&apos;s next for you?</h3>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: P.muted }}>{when}. Let your organizer know your plans.</p>

      <div role="radiogroup" aria-label={`Your plans for cycle ${next}`}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {ORDER.map((key) => {
          const o = OPTIONS[key];
          const sel = choice === key;
          return (
            <button
              key={key}
              role="radio"
              aria-checked={sel}
              onClick={() => setChoice(key)}
              disabled={saving}
              style={{
                position: 'relative', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '11px 12px', borderRadius: 12,
                border: '2px solid ' + (sel ? o.ink : P.border),
                background: sel ? o.tint : 'white',
                boxShadow: sel ? '0 3px 10px ' + o.ring + '66' : 'none',
                transition: 'border-color .15s, background .15s, box-shadow .15s',
              }}
            >
              <span aria-hidden style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: sel ? o.ink : o.tint, color: sel ? 'white' : o.ink, fontWeight: 800, fontSize: 14,
              }}>{o.icon}</span>
              <span>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: sel ? o.ink : P.texteFonce }}>{o.title}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: P.muted, lineHeight: 1.35 }}>{o.hint}</span>
              </span>
              {sel && (
                <span aria-hidden style={{ position: 'absolute', top: 7, right: 9, fontSize: 12, fontWeight: 800, color: o.ink }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {picked && (
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: P.texteFonce, marginBottom: 5 }}>
            A note for your organizer <span style={{ fontWeight: 500, color: P.muted }}>(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder={picked.placeholder}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10,
              border: '1.5px solid ' + P.border, fontSize: 13, fontFamily: 'inherit',
              resize: 'vertical', background: 'white', color: P.texteFonce, outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = picked.ink; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = P.border; }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button
              onClick={send}
              disabled={saving}
              style={{
                padding: '9px 20px', borderRadius: 999, border: 'none', cursor: saving ? 'wait' : 'pointer',
                background: P.bordeaux, color: 'white', fontWeight: 800, fontSize: 13,
                opacity: saving ? 0.7 : 1, boxShadow: '0 3px 10px rgba(107,45,78,0.25)',
              }}
            >
              {saving ? 'Sending...' : 'Send my answer'}
            </button>
            {currentAnswer && (
              <button
                onClick={cancelEdit}
                disabled={saving}
                style={{ padding: '9px 14px', borderRadius: 999, border: 'none', background: 'transparent', color: P.muted, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: P.muted }}>{note.length}/500</span>
          </div>
        </div>
      )}
    </div>
  );
}
