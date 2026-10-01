"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { getMorningReport } from '@/src/services/api';

const MANAGER_ROLES = ['owner', 'district_manager', 'gm', 'agm', 'department_manager', 'Manager'];

/**
 * "What each role wakes up to" — a compact preview of today's Morning
 * Report on Home, below the shift-handover/walk panel. Fetches (and lazily
 * generates, server-side) today's report on mount; dismissible per session
 * so it doesn't compete with the mic once the manager has seen it.
 */
export default function MorningReportPanel() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [report, setReport] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !MANAGER_ROLES.includes(user?.role)) return;
    getMorningReport().then(setReport).catch(() => {});
  }, [isAuthenticated, user?.role]);

  if (!isAuthenticated || !MANAGER_ROLES.includes(user?.role) || !report || dismissed) return null;

  const findings = report.findings || [];
  const openTotal = report.openItemsSummary?.total || 0;
  const firstFinding = findings[0];

  return (
    <div style={{ width: '100%', maxWidth: 'var(--app-max-width)', margin: '12px auto 0', padding: '0 16px' }}>
      <div
        onClick={() => router.push('/report/morning')}
        style={{
          background: 'linear-gradient(135deg, #1a1030 0%, #0D1520 100%)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg, 16px)',
          padding: '16px 18px', cursor: 'pointer', position: 'relative',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          style={{
            position: 'absolute', top: 10, right: 12, background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', padding: 4,
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Sparkles size={16} color="#C084FC" />
          <span style={{ fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#C084FC' }}>
            Morning Report
          </span>
        </div>

        <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
          Good morning, {user?.name?.split(' ')[0] || 'there'}.
        </p>

        <p style={{
          margin: '0 0 10px', fontSize: '0.82rem', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {firstFinding ? firstFinding.title : 'Nothing critical to report — smooth shift.'}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {findings.length} finding{findings.length === 1 ? '' : 's'} · {openTotal} open item{openTotal === 1 ? '' : 's'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 800, color: '#C084FC' }}>
            View full report <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
