"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, FileText } from 'lucide-react';
import Header from '@/src/components/Header';
import { getMorningReportHistory } from '@/src/services/api';

function formatDate(date) {
  return new Date(date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function MorningReportHistoryPage() {
  const router = useRouter();
  const [reports, setReports] = useState(null);

  useEffect(() => {
    getMorningReportHistory({ limit: 7 })
      .then((data) => setReports(data.reports || []))
      .catch((e) => {
        console.error('Failed to load morning report history', e);
        setReports([]);
      });
  }, []);

  return (
    <>
      <Header showBack title="Report History" />
      <main className="page">
        {reports === null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24, justifyContent: 'center' }}>
            <Loader2 size={20} className="spinner" />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading history...</span>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, background: 'var(--bg-card-alt)', borderRadius: 16, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No past reports yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map((report) => (
              <div
                key={report._id}
                onClick={() => {
                  sessionStorage.setItem('viewedMorningReport', JSON.stringify(report));
                  router.push('/report/morning?historical=1');
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, background: 'rgba(29,123,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={18} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                    {formatDate(report.reportDate)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {report.findings?.length > 0 ? report.findings[0].title : 'No critical findings'}
                    {report.findings?.length > 1 ? ` +${report.findings.length - 1} more` : ''}
                  </p>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
