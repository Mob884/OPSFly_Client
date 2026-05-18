"use client";
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar, ChevronLeft, ChevronRight, RefreshCw, Loader2,
  AlertTriangle, CheckCircle2, Users, DollarSign, Wrench,
  Share2, ClipboardList, FileText,
} from 'lucide-react';
import Header from '@/src/components/Header';
import { getTodaySummary, getSummaryByDate, generateTodaySummary } from '@/src/services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}
function toYMD(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function isToday(d) {
  return new Date(d).toDateString() === new Date().toDateString();
}
function isFuture(d) {
  const date = new Date(d); date.setHours(0, 0, 0, 0);
  const now  = new Date();  now.setHours(0, 0, 0, 0);
  return date > now;
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────
function SummaryInner() {
  const searchParams = useSearchParams();
  const [activeDate, setActiveDate] = useState(() => {
    const q = searchParams.get('date');
    return q ? new Date(q) : new Date();
  });
  const [summary, setSummary]    = useState(null);
  const [loading, setLoading]    = useState(true);
  const [regenerating, setRegen] = useState(false);
  const [error, setError]        = useState('');

  const fetchSummary = useCallback(async (date) => {
    setLoading(true); setError('');
    try {
      const data = isToday(date)
        ? await getTodaySummary()
        : await getSummaryByDate(toYMD(date));
      setSummary(data);
    } catch { setError('Could not load summary. Please try again.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchSummary(activeDate); }, [activeDate, fetchSummary]);

  const changeDate = (delta) => {
    const next = new Date(activeDate);
    next.setDate(next.getDate() + delta);
    if (!isFuture(next)) setActiveDate(next);
  };

  const handleRegenerate = async () => {
    if (!isToday(activeDate)) return;
    setRegen(true);
    try { setSummary(await generateTodaySummary()); }
    catch { setError('Regeneration failed. Please try again.'); }
    finally { setRegen(false); }
  };

  const handleShare = () => {
    if (!summary) return;
    const text = [
      `📊 OpsFly Daily Summary — ${fmtDate(activeDate)}`,
      ``,
      `Issues: ${summary.totalIssues} | Tasks: ${summary.totalTasks}`,
      ``,
      `🔴 Key Concerns:`,
      ...summary.keyConcerns.map(c => `• ${c}`),
      ``,
      `✅ Recommended Actions:`,
      ...summary.recommendedActions.map(a => `• ${a}`),
    ].join('\n');
    if (navigator.share) navigator.share({ title: 'OpsFly Daily Summary', text });
    else navigator.clipboard.writeText(text);
  };

  const nextDisabled = isFuture(new Date(activeDate.getTime() + 86_400_000));

  return (
    <>
      {/* Date Navigator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-card)', borderRadius: 14,
        padding: '10px 14px', border: '1px solid var(--border)',
      }}>
        <button onClick={() => changeDate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Calendar size={14} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {isToday(activeDate) ? 'Today — ' : ''}{fmtDate(activeDate)}
            </span>
          </div>
        </div>
        <button onClick={() => changeDate(1)} disabled={nextDisabled}
          style={{ background: 'none', border: 'none', color: nextDisabled ? 'var(--border)' : 'var(--text-muted)', cursor: nextDisabled ? 'not-allowed' : 'pointer', display: 'flex' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {isToday(activeDate) && (
          <button onClick={handleRegenerate} disabled={regenerating || loading} style={{
            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 10, padding: '10px',
            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {regenerating ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
            {regenerating ? 'Generating…' : 'Regenerate'}
          </button>
        )}
        <button onClick={handleShare} disabled={!summary || loading} style={{
          flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', borderRadius: 10, padding: '10px',
          fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Share2 size={14} /> Share
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={36} className="spinner" color="var(--primary)" style={{ marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {isToday(activeDate) ? "Generating today's summary…" : 'Loading summary…'}
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 16px', color: '#EF4444', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && summary && summary.totalIssues === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
          <FileText size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 700, marginBottom: 6 }}>No issues recorded</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No notes were saved on this day.</p>
        </div>
      )}

      {/* Summary content */}
      {!loading && !error && summary && summary.totalIssues > 0 && (
        <>
          {/* Stats 2×2 grid */}
          <div>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Day Overview
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Total Issues"  value={summary.totalIssues}       color="var(--primary)" icon={AlertTriangle} />
              <StatCard label="Staffing"      value={summary.staffingIssues}    color="#EF4444"        icon={Users} />
              <StatCard label="Cost Risks"    value={summary.costRisks}         color="#FF8A00"        icon={DollarSign} />
              <StatCard label="Maintenance"   value={summary.maintenanceIssues} color="#22C55E"        icon={Wrench} />
            </div>
          </div>

          {/* Task progress */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <ClipboardList size={24} color="var(--primary)" />
            <div>
              <p style={{ fontWeight: 800, fontSize: '1rem' }}>
                {summary.completedTasks}/{summary.totalTasks} Tasks Done
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Created from today's notes</p>
            </div>
            <div style={{
              marginLeft: 'auto',
              background: summary.completedTasks === summary.totalTasks && summary.totalTasks > 0
                ? 'rgba(34,197,94,0.15)' : 'rgba(29,123,255,0.12)',
              color: summary.completedTasks === summary.totalTasks && summary.totalTasks > 0
                ? '#22C55E' : 'var(--primary)',
              padding: '4px 12px', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem',
            }}>
              {summary.totalTasks === 0 ? 'None'
                : summary.completedTasks === summary.totalTasks ? 'All Done!'
                : `${Math.round((summary.completedTasks / summary.totalTasks) * 100)}%`}
            </div>
          </div>

          {/* Key Concerns */}
          {summary.keyConcerns?.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                🔴 Key Concerns
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.keyConcerns.map((concern, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', marginTop: 5, flexShrink: 0, boxShadow: '0 0 6px #EF4444' }} />
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#fff' }}>{concern}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {summary.recommendedActions?.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                ✅ Recommended Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.recommendedActions.map((action, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-card)', border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <CheckCircle2 size={18} color="#22C55E" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#fff' }}>{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Generated {summary.generatedAt
              ? new Date(summary.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </p>
        </>
      )}
    </>
  );
}

// ── Page wrapper (Suspense required for useSearchParams) ──────────────────────
export default function SummaryPage() {
  return (
    <>
      <Header title="Daily Summary" />
      <main className="page" style={{ paddingTop: 16 }}>
        <Suspense fallback={
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={36} className="spinner" color="var(--primary)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading summary…</p>
          </div>
        }>
          <SummaryInner />
        </Suspense>
      </main>
    </>
  );
}
