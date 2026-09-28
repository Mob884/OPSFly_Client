"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Phone, ArrowRight, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

const OUTCOME_BADGE = {
  resolved: { label: 'Resolved', color: '#22C55E', icon: CheckCircle2 },
  repeat: { label: 'Repeated', color: '#EF4444', icon: RotateCcw },
  pending: { label: 'Still open', color: '#FF8A00', icon: AlertCircle },
};

function formatDaysAgo(daysAgo) {
  if (daysAgo === null || daysAgo === undefined) return '';
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return '1 day ago';
  return `${daysAgo} days ago`;
}

/**
 * "OpsFly remembers" — surfaces prior history for whatever a note just
 * touched, right where the manager feels it: on the Note Analysis screen,
 * directly under the detected issues. Amber left border keeps it visually
 * distinct from the blue issue cards above it.
 */
export default function RecallCard({ recall }) {
  const router = useRouter();
  if (!recall?.hasHistory) return null;

  const incidents = (recall.priorIncidents || []).slice(0, 3);

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: '3px solid #FF8A00',
      borderRadius: 'var(--radius-lg, 16px)', padding: '16px 18px',
      marginTop: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Clock size={16} color="#FF8A00" />
        <span style={{ fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#FF8A00' }}>
          OpsFly Remembers
        </span>
      </div>

      {recall.recallSummary && (
        <p style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.5, margin: '0 0 12px' }}>
          {recall.recallSummary}
        </p>
      )}

      {incidents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: recall.relatedVendor ? 12 : 4 }}>
          {incidents.map((incident, i) => {
            const badge = OUTCOME_BADGE[incident.outcome] || OUTCOME_BADGE.pending;
            const Icon = badge.icon;
            return (
              <div key={i} style={{
                background: 'var(--bg-card-alt)', borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {formatDaysAgo(incident.daysAgo)}
                  </span>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.65rem', fontWeight: 800, color: badge.color,
                  }}>
                    <Icon size={11} /> {badge.label}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#fff', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {incident.description}
                </p>
                {incident.actionTaken && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Action taken: {incident.actionTaken}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {recall.relatedVendor && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          fontSize: '0.8rem', color: 'var(--text-secondary)',
        }}>
          <Phone size={13} color="var(--text-secondary)" />
          <span>
            Vendor: <strong style={{ color: '#fff' }}>{recall.relatedVendor.name}</strong>
            {recall.relatedVendor.phone ? ` — ${recall.relatedVendor.phone}` : ''}
          </span>
        </div>
      )}

      <button
        onClick={() => router.push('/corrective')}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          color: '#FF8A00', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', padding: 0,
        }}
      >
        View full history <ArrowRight size={13} />
      </button>
    </div>
  );
}
