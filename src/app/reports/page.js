"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, Loader2, Calendar, ChevronRight,
  AlertTriangle, ClipboardList, FileText,
} from 'lucide-react';
import Header from '@/src/components/Header';
import { getSummaryList } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function toYMD(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fmtDate(d) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getWeekKey(d) {
  const date = new Date(d);
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toISOString();
}

function fmtWeek(isoKey) {
  const start = new Date(isoKey);
  const end = new Date(isoKey);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function getMonthKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMonth(key) {
  const [y, m] = key.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Row component ─────────────────────────────────────────────────────────────
function SummaryRow({ item, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'inherit', transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-alt)'}
    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'rgba(29,123,255,0.1)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Calendar size={18} color="var(--primary)" />
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: 3 }}>
          {fmtDate(item.date)}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span style={{ color: '#FF8A00' }}>{item.totalIssues} issues</span>
          {' · '}
          <span style={{ color: 'var(--primary)' }}>{item.totalTasks} tasks</span>
        </p>
      </div>
      <ChevronRight size={18} color="var(--text-muted)" />
    </button>
  );
}

// ── Group header ──────────────────────────────────────────────────────────────
function GroupHeader({ label, totalIssues, totalTasks }) {
  return (
    <div style={{
      padding: '8px 4px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {totalIssues} issues · {totalTasks} tasks
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { currentLocationId } = useAuth();
  const router = useRouter();
  const [tab, setTab]         = useState('daily');
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!currentLocationId) return;
    setLoading(true);
    getSummaryList()
      .then(setSummaries)
      .catch(() => setError('Could not load reports.'))
      .finally(() => setLoading(false));
  }, [currentLocationId]);

  const openSummary = (item) => {
    router.push(`/summary?date=${toYMD(item.date)}`);
  };

  // ── Group for weekly / monthly ────────────────────────────────────────────
  const weeklyGroups = {};
  const monthlyGroups = {};
  summaries.forEach(item => {
    const wk = getWeekKey(item.date);
    const mo = getMonthKey(item.date);
    if (!weeklyGroups[wk])  weeklyGroups[wk]  = { items: [], totalIssues: 0, totalTasks: 0 };
    if (!monthlyGroups[mo]) monthlyGroups[mo] = { items: [], totalIssues: 0, totalTasks: 0 };
    weeklyGroups[wk].items.push(item);
    weeklyGroups[wk].totalIssues  += item.totalIssues;
    weeklyGroups[wk].totalTasks   += item.totalTasks;
    monthlyGroups[mo].items.push(item);
    monthlyGroups[mo].totalIssues += item.totalIssues;
    monthlyGroups[mo].totalTasks  += item.totalTasks;
  });

  return (
    <>
      <Header title="Reports" />
      <main className="page" style={{ paddingTop: 16 }}>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: 'var(--bg-card)',
          borderRadius: 12, padding: 4, marginBottom: 4,
          border: '1px solid var(--border)',
        }}>
          {['daily', 'weekly', 'monthly'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px 0', borderRadius: 9,
              fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer',
              border: 'none', fontFamily: 'inherit', transition: 'all 0.2s',
              background: tab === t ? 'var(--primary)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted)',
              textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={32} className="spinner" color="var(--primary)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading reports…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 16px', color: '#EF4444', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && summaries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
            <BarChart3 size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 700, marginBottom: 6 }}>No reports yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Reports are generated automatically after notes are recorded. Record your first note to get started.
            </p>
          </div>
        )}

        {/* ── Daily tab ── */}
        {!loading && !error && tab === 'daily' && summaries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summaries.map(item => (
              <SummaryRow key={item._id} item={item} onClick={() => openSummary(item)} />
            ))}
          </div>
        )}

        {/* ── Weekly tab ── */}
        {!loading && !error && tab === 'weekly' && summaries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(weeklyGroups)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .map(([wk, group]) => (
                <div key={wk}>
                  <GroupHeader label={fmtWeek(wk)} totalIssues={group.totalIssues} totalTasks={group.totalTasks} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map(item => (
                      <SummaryRow key={item._id} item={item} onClick={() => openSummary(item)} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── Monthly tab ── */}
        {!loading && !error && tab === 'monthly' && summaries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(monthlyGroups)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([mo, group]) => (
                <div key={mo}>
                  <GroupHeader label={fmtMonth(mo)} totalIssues={group.totalIssues} totalTasks={group.totalTasks} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map(item => (
                      <SummaryRow key={item._id} item={item} onClick={() => openSummary(item)} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

      </main>
    </>
  );
}
