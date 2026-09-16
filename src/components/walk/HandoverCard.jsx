"use client";
import React from 'react';
import { ClipboardList, Eye, ArrowRight, Loader2 } from 'lucide-react';

const SEVERITY_COLOR = { high: '#EF4444', medium: '#FF8A00', low: '#22C55E' };
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * Shift handover recap shown once, at shift start, before the manager
 * begins their walk. Purely presentational — Home page owns the fetch and
 * the Start Walk action so it can swap this card for WalkActiveBanner the
 * instant a walk starts, with no navigation or reload.
 */
export default function HandoverCard({ handover, onStartWalk, onDismiss, starting }) {
  if (!handover) return null;

  const openItems = [...(handover.openItems || [])]
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3))
    .slice(0, 3);
  const watchItems = (handover.watchItems || []).slice(0, 2);

  return (
    <div style={{ width: '100%', maxWidth: 'var(--app-max-width)', margin: '12px auto 0', padding: '0 16px' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderLeft: '3px solid var(--primary)',
        borderRadius: 'var(--radius-lg)', padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ClipboardList size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary)' }}>
            Before Your Walk
          </span>
        </div>

        {openItems.length > 0 && (
          <div style={{ marginBottom: watchItems.length ? 10 : 12 }}>
            {openItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEVERITY_COLOR[item.severity] || SEVERITY_COLOR.medium, flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: '#fff', lineHeight: 1.45 }}>{item.description}</span>
              </div>
            ))}
          </div>
        )}

        {watchItems.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Watch</span>
            {watchItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Eye size={12} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.description}</span>
              </div>
            ))}
          </div>
        )}

        {handover.lastShiftAnswers?.opportunity && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
            <strong style={{ color: '#fff' }}>#1 Opportunity:</strong> {handover.lastShiftAnswers.opportunity}
          </p>
        )}

        <button
          className="btn btn-primary"
          onClick={onStartWalk}
          disabled={starting}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: starting ? 0.7 : 1 }}
        >
          {starting ? <Loader2 size={16} className="spin" /> : <>Start Walk <ArrowRight size={16} /></>}
        </button>
        <button
          onClick={onDismiss}
          style={{ display: 'block', width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center', padding: '4px 0' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
