"use client";
import React, { useEffect, useState } from 'react';

function elapsedLabel(startedAt) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Subtle "walk in progress" banner. Deliberately quiet — the mic button
 * stays the primary call to action, this is just a status strip with a
 * small End Walk link, not a takeover screen.
 */
export default function WalkActiveBanner({ session, onEndWalk, ending }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!session) return null;

  return (
    <div style={{ width: '100%', maxWidth: 'var(--app-max-width)', margin: '12px auto 0', padding: '0 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: 'var(--radius-md)', padding: '10px 14px',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0, boxShadow: '0 0 6px #22C55E' }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', flex: 1 }}>
          Walk active · {elapsedLabel(session.startedAt)} · {session.noteCount || 0} note{session.noteCount === 1 ? '' : 's'}
        </span>
        <button
          onClick={onEndWalk}
          disabled={ending}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', padding: '4px 6px', opacity: ending ? 0.6 : 1 }}
        >
          {ending ? 'Ending…' : 'End Walk'}
        </button>
      </div>
    </div>
  );
}
