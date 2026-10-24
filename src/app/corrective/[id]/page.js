"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Clock, Loader2, AlertTriangle } from 'lucide-react';
import Header from '@/src/components/Header';
import { getCorrectiveActionDetail, takeCorrectiveAction, resolveCorrectiveAction, answerFollowUp } from '@/src/services/api';
import { Field, Textarea, PrimaryButton, Card, SectionLabel } from '@/src/components/dna/DnaKit';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  action_taken: { label: 'Action Taken', color: '#FF8A00', bg: 'rgba(255,138,0,0.12)' },
  resolved: { label: 'Resolved', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  held: { label: 'Held', color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
  repeat: { label: 'Repeat', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

const HISTORY_LABEL = {
  opened: 'Opened',
  action_taken: 'Action taken',
  resolved: 'Resolved',
  follow_up_asked: 'Follow-up confirmed',
  repeat_detected: 'Marked as repeat',
};

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function CorrectiveActionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionTaken, setActionTaken] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCorrectiveActionDetail(id);
      setAction(data);
    } catch {
      setAction(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleTakeAction = async () => {
    if (!actionTaken.trim()) return;
    setSaving(true);
    try {
      await takeCorrectiveAction(id, { actionTaken: actionTaken.trim() });
      setActionTaken('');
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleResolve = async () => {
    setSaving(true);
    try {
      await resolveCorrectiveAction(id, { resolutionNote: resolutionNote.trim() });
      setResolutionNote('');
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleFollowUp = async (answer) => {
    setSaving(true);
    try {
      await answerFollowUp(id, { answer });
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Header title="Corrective Action" showBack />
        <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={28} className="spin" color="var(--primary)" />
        </div>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="page-wrapper">
        <Header title="Corrective Action" showBack />
        <div className="page" style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)' }}>Not found.</div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.open;
  const dueForFollowUp = action.status === 'resolved' && !action.followUpAsked && action.followUpAt && new Date(action.followUpAt) <= new Date();

  return (
    <div className="page-wrapper">
      <Header title="Corrective Action" showBack onBack={() => router.push('/corrective')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>

        <Card style={{ gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '4px 9px', borderRadius: 999, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
            {action.isIncident && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#FF8A00' }}>INCIDENT</span>}
          </div>
          <p style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600, margin: '10px 0 0', lineHeight: 1.5 }}>
            &ldquo;{action.sourceQuote}&rdquo;
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Opened {fmtDateTime(action.sourceTimestamp || action.createdAt)}
          </p>
          {action.isRepeat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
              <AlertTriangle size={13} color="#EF4444" />
              <span style={{ fontSize: '0.74rem', color: '#EF4444' }}>This issue returned after a previous fix (repeat #{action.repeatCount}).</span>
            </div>
          )}
        </Card>

        {dueForFollowUp && (
          <Card style={{ background: 'rgba(255,138,0,0.08)', borderColor: 'rgba(255,138,0,0.3)' }}>
            <p style={{ fontSize: '0.85rem', color: '#fff', margin: '0 0 12px' }}>You resolved this 48 hours ago. Is it still fixed?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleFollowUp('yes_fixed')} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>Yes, fixed ✓</button>
              <button onClick={() => handleFollowUp('no_repeat')} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>No, it&apos;s back ✗</button>
            </div>
          </Card>
        )}

        {action.status === 'open' && (
          <Card style={{ gap: 12 }}>
            <SectionLabel>Take action</SectionLabel>
            <Field label="What was done?">
              <Textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="e.g. Called Ace Refrigeration, tech en route" />
            </Field>
            <PrimaryButton loading={saving} onClick={handleTakeAction}>Mark Action Taken</PrimaryButton>
          </Card>
        )}

        {action.status === 'action_taken' && (
          <Card style={{ gap: 12 }}>
            <SectionLabel>Resolve</SectionLabel>
            <Field label="How was it resolved?">
              <Textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} placeholder="e.g. Tech replaced compressor, temp back to normal" />
            </Field>
            <PrimaryButton loading={saving} onClick={handleResolve}>Mark Resolved</PrimaryButton>
          </Card>
        )}

        {action.priorAction && (
          <Card style={{ gap: 8 }}>
            <SectionLabel>Previous attempt</SectionLabel>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              &ldquo;{action.priorAction.resolutionNote || 'Marked resolved'}&rdquo; — didn&apos;t hold.
            </p>
          </Card>
        )}

        <section>
          <SectionLabel>History</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            {(action.history || []).slice().reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <Clock size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{HISTORY_LABEL[h.action] || h.action}</div>
                  {h.note && <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>{h.note}</div>}
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtDateTime(h.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
