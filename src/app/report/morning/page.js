"use client";
import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2, CheckCircle2, Eye, AlertTriangle, Clock, ChevronRight, RefreshCw,
} from 'lucide-react';
import Header from '@/src/components/Header';
import { getMorningReport, regenerateMorningReport } from '@/src/services/api';

const SEVERITY_COLOR = { high: '#EF4444', medium: '#FF8A00', low: '#22C55E' };

function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ──────────
function MorningReportInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHistorical = searchParams.get('historical') === '1';
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [expanded, setExpanded] = useState({});
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const data = await getMorningReport();
      setReport(data);
    } catch (e) {
      console.error('Failed to load morning report', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHistorical) {
      const stored = sessionStorage.getItem('viewedMorningReport');
      if (stored) {
        setReport(JSON.parse(stored));
        setLoading(false);
        return;
      }
    }
    load();
    return () => clearTimeout(pollRef.current);
  }, [isHistorical]);

  // If somehow still nothing after the first load, poll every 5s — mirrors
  // the "your report is being generated" state the spec calls for.
  useEffect(() => {
    if (!isHistorical && !loading && !report) {
      pollRef.current = setTimeout(load, 5000);
    }
    return () => clearTimeout(pollRef.current);
  }, [loading, report, isHistorical]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const data = await regenerateMorningReport();
      setReport(data);
    } catch (e) {
      console.error('Failed to regenerate morning report', e);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading || !report) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Loader2 size={28} className="spinner" color="var(--primary)" style={{ marginBottom: 12 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Your report is being generated...
        </p>
      </div>
    );
  }

  const findings = report.findings || [];
  const openItems = report.openItemsSummary || {};
  const watchList = report.watchList || [];

  return (
    <>
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Morning Report</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {formatTime(report.reportDate || report.generatedAt)}
          </p>
        </div>
        {!isHistorical && (
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px',
              color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
              opacity: regenerating ? 0.6 : 1,
            }}
          >
            {regenerating ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        )}
      </section>

      {/* FINDINGS */}
      <section>
        <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Findings {findings.length > 0 ? `(${findings.length})` : ''}
        </h3>

        {findings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, background: 'var(--bg-card-alt)', borderRadius: 16, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Nothing critical to report — smooth shift.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {findings.map((finding, i) => {
              const color = SEVERITY_COLOR[finding.severity] || SEVERITY_COLOR.medium;
              return (
                <div key={i} style={{
                  background: 'var(--bg-card)', border: `1px solid ${color}30`,
                  borderRadius: 16, padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 4, background: `${color}20`, color,
                    }}>{finding.severity}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', flex: 1 }}>{finding.title}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px' }}>
                    {finding.detail}
                  </p>
                  {finding.recommendedAction && (
                    <p style={{
                      fontSize: '0.82rem', color: 'var(--primary)', margin: '0 0 10px',
                      paddingLeft: 10, borderLeft: '2px solid var(--primary)',
                    }}>
                      Recommended action: {finding.recommendedAction}
                    </p>
                  )}
                  {finding.priorHistory && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10,
                        background: 'rgba(255,138,0,0.12)', border: 'none', borderRadius: 999,
                        padding: '4px 10px', fontSize: '0.7rem', fontWeight: 800, color: '#FF8A00', cursor: 'pointer',
                      }}
                    >
                      <Clock size={11} /> Prior history
                    </button>
                  )}
                  {expanded[i] && finding.priorHistory && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.45 }}>
                      {finding.priorHistory}
                    </p>
                  )}
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                    — {finding.sourceManagerName || 'Unknown'}, {formatTime(finding.sourceTime)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* OPEN ITEMS */}
      <section>
        <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Open Items
        </h3>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: openItems.oldest ? 10 : 0 }}>
            <AlertTriangle size={16} color={openItems.total > 0 ? '#EF4444' : 'var(--text-muted)'} />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{openItems.total || 0} open item{openItems.total === 1 ? '' : 's'}</span>
          </div>
          {openItems.oldest && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Oldest: <strong style={{ color: '#fff' }}>{openItems.oldest.description}</strong> (open since {formatTime(openItems.oldest.openSince)})
            </p>
          )}
          {(openItems.byLocation || []).length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {openItems.byLocation.map((loc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>{loc.locationName}</span>
                  <span style={{ fontWeight: 800, color: '#fff' }}>{loc.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WHAT WENT RIGHT */}
      {report.whatWentRight && (
        <section>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: 16,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16,
          }}>
            <CheckCircle2 size={18} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0, lineHeight: 1.5 }}>{report.whatWentRight}</p>
          </div>
        </section>
      )}

      {/* WATCH LIST */}
      {watchList.length > 0 && (
        <section>
          <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Watch List
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {watchList.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Eye size={14} color="var(--text-muted)" /> {item}
              </div>
            ))}
          </div>
        </section>
      )}

      {!isHistorical && (
        <button
          onClick={() => router.push('/report/morning/history')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--primary)',
            fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', padding: '12px 0', marginBottom: 24,
          }}
        >
          Previous reports <ChevronRight size={16} />
        </button>
      )}
    </>
  );
}

// ── Page wrapper (Suspense required for useSearchParams) ──────────────────────
export default function MorningReportPage() {
  return (
    <>
      <Header showBack title="Morning Report" />
      <main className="page">
        <Suspense fallback={
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={36} className="spinner" color="var(--primary)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading report…</p>
          </div>
        }>
          <MorningReportInner />
        </Suspense>
      </main>
    </>
  );
}
