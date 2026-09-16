"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Wrench, CheckCircle2, RotateCcw, ChevronRight, Loader2 } from 'lucide-react';
import Header from '@/src/components/Header';
import { getCorrectiveActions, answerFollowUp } from '@/src/services/api';
import { Pills, Card } from '@/src/components/dna/DnaKit';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  action_taken: { label: 'Action Taken', color: '#FF8A00', bg: 'rgba(255,138,0,0.12)' },
  resolved: { label: 'Resolved', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  held: { label: 'Held', color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
  repeat: { label: 'Repeat', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

const FILTERS = ['All', 'Open', 'Action Taken', 'Resolved', 'Repeat'];
const FILTER_TO_STATUS = { Open: 'open', 'Action Taken': 'action_taken', Resolved: 'resolved', Repeat: 'repeat' };

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CorrectiveActionsPage() {
  const router = useRouter();
  const [actions, setActions] = useState([]);
  const [filter, setFilter] = useState('Open');
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = FILTER_TO_STATUS[filter];
      const data = await getCorrectiveActions(status ? { status } : {});
      setActions(Array.isArray(data) ? data : []);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const dueForFollowUp = actions.filter(
    (a) => a.status === 'resolved' && !a.followUpAsked && a.followUpAt && new Date(a.followUpAt) <= new Date()
  );

  const handleFollowUp = async (id, answer) => {
    setAnswering(id);
    try {
      await answerFollowUp(id, { answer });
      await load();
    } catch { /* ignore */ } finally {
      setAnswering(null);
    }
  };

  return (
    <div className="page-wrapper">
      <Header title="Corrective Actions" showBack onBack={() => router.push('/tasks')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>

        {dueForFollowUp.map((a) => (
          <Card key={a._id} style={{ background: 'rgba(255,138,0,0.08)', borderColor: 'rgba(255,138,0,0.3)' }}>
            <p style={{ fontSize: '0.85rem', color: '#fff', margin: '0 0 12px', lineHeight: 1.5 }}>
              You resolved <strong>&ldquo;{a.sourceQuote}&rdquo;</strong> 48 hours ago. Is it still fixed?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleFollowUp(a._id, 'yes_fixed')}
                disabled={answering === a._id}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Yes, fixed ✓
              </button>
              <button
                onClick={() => handleFollowUp(a._id, 'no_repeat')}
                disabled={answering === a._id}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                No, it&apos;s back ✗
              </button>
            </div>
          </Card>
        ))}

        <Pills options={FILTERS} value={filter} onChange={(v) => setFilter(v || 'All')} />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={28} className="spin" color="var(--primary)" />
          </div>
        ) : actions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 24px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} style={{ marginBottom: 10, opacity: 0.6 }} />
            <p style={{ fontSize: '0.85rem' }}>Nothing here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions.map((a) => {
              const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.open;
              return (
                <button
                  key={a._id}
                  onClick={() => router.push(`/corrective/${a._id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, cursor: 'pointer', width: '100%' }}
                >
                  {a.status === 'repeat' ? <AlertTriangle size={17} color={cfg.color} /> : <Wrench size={17} color="var(--text-secondary)" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.sourceQuote || '(no description)'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Opened {fmtDate(a.createdAt)}{a.isIncident ? ' · Incident' : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '4px 9px', borderRadius: 999, color: cfg.color, background: cfg.bg, flexShrink: 0 }}>
                    {cfg.label}
                  </span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
