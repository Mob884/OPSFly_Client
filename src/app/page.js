"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import {
  Mic, PenLine, Camera, Users, DollarSign, Wrench, AlertTriangle,
  ClipboardCheck, ChevronRight, Loader2, CalendarDays, ArrowLeft, Building2, TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import Header from '@/src/components/Header';
import OnboardingBanner from '@/src/components/dna/OnboardingBanner';
import { getNotes, getTasks, analyzeNote, getTodaySummary } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import axios from 'axios';

const ISSUE_ICONS = {
  Staffing: <Users size={15} />,
  'Cost Risk': <DollarSign size={15} />,
  Maintenance: <Wrench size={15} />,
};

const PRIORITY_CONFIG = {
  High:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  Medium: { color: '#FF8A00', bg: 'rgba(255,138,0,0.12)'  },
  Low:    { color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
};

export default function Home() {
  const { user, currentLocationId, setCurrentLocationId, accessibleLocations } = useAuth();
  const router = useRouter();
  
  // Dashboard view mode: 'overview' or 'drilldown' (for owner/DM)
  const [viewMode, setViewMode] = useState('overview');

  // Redirect to onboarding if no locations are set up
  useEffect(() => {
    if (user && accessibleLocations && accessibleLocations.length === 0) {
      router.push('/register');
    }
  }, [user, accessibleLocations, router]);
  
  // Scoped active location data
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [textNote, setTextNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);

  // Overview Aggregate Data
  const [overviewData, setOverviewData] = useState([]);
  const [totalTeamCount, setTotalTeamCount] = useState(0);
  const [loadingOverview, setLoadingOverview] = useState(false);

  const isOwnerOrDM = ['owner', 'district_manager'].includes(user?.role);

  // Load Overview statistics
  const loadOverviewStats = useCallback(async () => {
    if (!accessibleLocations || accessibleLocations.length === 0) return;
    try {
      setLoadingOverview(true);
      const token = localStorage.getItem('opsfly_token');
      
      // Fetch users in organization
      const usersRes = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTotalTeamCount(usersRes.data?.length || 0);

      // Fetch notes & tasks per location
      const promises = accessibleLocations.map(async (loc) => {
        try {
          const [notesRes, tasksRes] = await Promise.all([
            axios.get('/api/notes', {
              headers: { Authorization: `Bearer ${token}`, 'x-location-id': loc._id }
            }),
            axios.get('/api/tasks', {
              headers: { Authorization: `Bearer ${token}`, 'x-location-id': loc._id }
            })
          ]);
          
          const locNotes = notesRes.data || [];
          const locTasks = tasksRes.data || [];
          
          // Open issues count today
          const todayStr = new Date().toDateString();
          const todayNotes = locNotes.filter(n => new Date(n.createdAt).toDateString() === todayStr);
          const openIssuesCount = todayNotes.reduce((acc, n) => acc + (n.issues?.length || 0), 0);
          
          // Count issues this week (created in last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const weeklyNotes = locNotes.filter(n => new Date(n.createdAt) >= sevenDaysAgo);
          const weeklyIssuesCount = weeklyNotes.reduce((acc, n) => acc + (n.issues?.length || 0), 0);

          const openTasksCount = locTasks.filter(t => t.status === 'open').length;
          const completedTasksCount = locTasks.filter(t => t.status === 'completed').length;
          const weeklyCompletedTasksCount = locTasks.filter(t => t.status === 'completed' && new Date(t.completedAt || t.updatedAt) >= sevenDaysAgo).length;

          // Last activity timestamp
          const lastAct = locNotes.length > 0 ? new Date(locNotes[0].createdAt) : null;

          return {
            locationId: loc._id,
            locationName: loc.name,
            address: loc.address,
            isActive: loc.isActive,
            deleted: loc.deleted,
            openIssuesCount,
            openTasksCount,
            completedTasksCount,
            weeklyIssuesCount,
            weeklyCompletedTasksCount,
            lastActivity: lastAct ? lastAct.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No activity yet'
          };
        } catch (err) {
          return {
            locationId: loc._id,
            locationName: loc.name,
            isActive: loc.isActive,
            deleted: loc.deleted,
            openIssuesCount: 0,
            openTasksCount: 0,
            completedTasksCount: 0,
            weeklyIssuesCount: 0,
            weeklyCompletedTasksCount: 0,
            lastActivity: 'Offline'
          };
        }
      });

      const results = await Promise.all(promises);
      setOverviewData(results.filter(r => !r.deleted));
    } catch (err) {
      console.error('Failed to load overview statistics', err);
    } finally {
      setLoadingOverview(false);
    }
  }, [accessibleLocations]);

  // Load drilldown details (current active location)
  const loadDrilldownDetails = useCallback(async () => {
    if (!currentLocationId) return;
    try {
      setLoading(true);
      const [notesData, tasksData] = await Promise.all([
        getNotes(true),
        getTasks(true)
      ]);
      setNotes(notesData.slice(0, 5));
      setTasks(tasksData.filter(t => t.status === 'open').slice(0, 3));
      
      getTodaySummary().then(setSummary).catch(() => setSummary(null));
    } catch (err) {
      console.error('Failed to load local data', err);
    } finally {
      setLoading(false);
    }
  }, [currentLocationId]);

  // Trigger data loading
  useEffect(() => {
    if (isOwnerOrDM && viewMode === 'overview') {
      loadOverviewStats();
    } else {
      loadDrilldownDetails();
    }
  }, [viewMode, currentLocationId, loadOverviewStats, loadDrilldownDetails, isOwnerOrDM]);

  const handleDrilldown = (locId) => {
    setCurrentLocationId(locId);
    setViewMode('drilldown');
  };

  const handleTextSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!textNote.trim() || isAnalyzingText) return;
    setIsAnalyzingText(true);
    try {
      const result = await analyzeNote(textNote);
      const analysisData = { transcript: textNote, source: 'text', issues: result.issues, analyzedAt: new Date() };
      sessionStorage.setItem('lastAnalysis', JSON.stringify(analysisData));
      router.push('/analysis');
      setTextNote('');
    } catch (err) {
      const fallbackData = { transcript: textNote, source: 'text', issues: [] };
      sessionStorage.setItem('lastAnalysis', JSON.stringify(fallbackData));
      router.push('/analysis');
    } finally {
      setIsAnalyzingText(false);
    }
  };

  // Header switcher override - if owner/DM switch location from header dropdown, change view mode to drilldown
  useEffect(() => {
    if (isOwnerOrDM && currentLocationId) {
      setViewMode('drilldown');
    }
  }, [currentLocationId, isOwnerOrDM]);

  // Overview Stats Aggregations
  const aggOpenIssuesToday = overviewData.reduce((acc, r) => acc + r.openIssuesCount, 0);
  const aggOpenTasks = overviewData.reduce((acc, r) => acc + r.openTasksCount, 0);
  const aggCompletedTasks = overviewData.reduce((acc, r) => acc + r.completedTasksCount, 0);
  const aggWeeklyIssues = overviewData.reduce((acc, r) => acc + r.weeklyIssuesCount, 0);
  const aggWeeklyCompletedTasks = overviewData.reduce((acc, r) => acc + r.weeklyCompletedTasksCount, 0);

  const activeLoc = accessibleLocations.find(l => l._id === currentLocationId);
  const activeLocationName = activeLoc ? activeLoc.name : 'Loading location...';
  const openCount = tasks.length;

  return (
    <>
      <Header />
      <OnboardingBanner />

      {/* ────────────────── OVERVIEW VIEW MODE ────────────────── */}
      {isOwnerOrDM && viewMode === 'overview' && (
        <main className="page" style={{ paddingBottom: '30px', gap: '22px' }}>
          
          {/* Dashboard Header */}
          <section className="greeting-block" style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0 }}>Operations Overview 👋</h1>
              <span style={{
                fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase',
                background: 'rgba(255, 184, 0, 0.15)', color: 'var(--cost)',
                border: '1px solid rgba(255, 184, 0, 0.25)', padding: '2px 8px', borderRadius: '12px'
              }}>{user?.role?.replace('_', ' ')}</span>
            </div>
            <p style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Organization stats across all operational locations
            </p>
          </section>

          {/* Loading Indicator */}
          {loadingOverview ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 0' }}>
              <Loader2 className="spinner" size={28} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aggregating organization metrics...</span>
            </div>
          ) : (
            <>
              {/* AGGREGATE METRICS ROW */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Open Issues</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: aggOpenIssuesToday > 0 ? '#EF4444' : '#fff', marginTop: 4 }}>{aggOpenIssuesToday}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Open Tasks</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', marginTop: 4 }}>{aggOpenTasks}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Completed</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22C55E', marginTop: 4 }}>{aggCompletedTasks}</div>
                </div>
              </div>

              {/* OWNER ONLY: ORGANIZATION OVERVIEW CARD */}
              {user?.role === 'owner' && (
                <section style={{ background: 'linear-gradient(135deg, #0D1520 0%, #121C29 100%)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={14} color="var(--primary)" /> Organization Metrics
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Total Locations</span>
                      <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>{accessibleLocations.length}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Total Team Members</span>
                      <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>{totalTeamCount}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Issues (7d)</span>
                      <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={12} color="#EF4444" /> {aggWeeklyIssues}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Tasks Finished (7d)</span>
                      <p style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} color="#22C55E" /> {aggWeeklyCompletedTasks}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* PER LOCATION CARDS */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per Location Analytics</span>

                {overviewData.map(loc => (
                  <div
                    key={loc.locationId}
                    onClick={() => handleDrilldown(loc.locationId)}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 12,
                      padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18,
                      cursor: 'pointer', transition: 'all 0.2s', borderLeft: `4px solid ${loc.isActive ? 'var(--primary)' : 'var(--text-muted)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{loc.locationName}</span>
                        {!loc.isActive && (
                          <span style={{ fontSize: '0.55rem', fontWeight: 900, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '1px 4px', borderRadius: 4, marginLeft: 8 }}>INACTIVE</span>
                        )}
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>

                    <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', background: 'var(--bg-card-alt)', borderRadius: 12, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 800, color: loc.openIssuesCount > 0 ? '#EF4444' : 'var(--text-secondary)' }}>
                          <AlertTriangle size={14} />
                          <span>{loc.openIssuesCount} issues today</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                          <ClipboardCheck size={14} />
                          <span>{loc.openTasksCount} open tasks</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        <span>{loc.lastActivity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}

        </main>
      )}

      {/* ────────────────── DRILLDOWN VIEW MODE (STANDARD HOME VIEW) ────────────────── */}
      {(!isOwnerOrDM || viewMode === 'drilldown') && (
        <main className="page">
          
          {/* Overview Back-navigation button */}
          {isOwnerOrDM && (
            <button
              onClick={() => { setViewMode('overview'); setCurrentLocationId(null); }}
              style={{
                alignSelf: 'flex-start', background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '8px 14px', fontSize: '0.75rem', fontWeight: 800,
                color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Overview</span>
            </button>
          )}

          {/* Greeting */}
          <section className="greeting-block" style={{ paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0 }}>Good morning, {user?.name ? user.name.split(' ')[0] : 'Fred'} 👋</h1>
              {user?.role && (
                <span style={{
                  fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase',
                  background: 'rgba(29, 123, 255, 0.15)', color: 'var(--primary)',
                  border: '1px solid rgba(29, 123, 255, 0.25)', padding: '2px 8px', borderRadius: '12px'
                }}>{user.role.replace('_', ' ')}</span>
              )}
              {user?.department && (
                <span style={{
                  fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase',
                  background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E',
                  border: '1px solid rgba(34, 197, 94, 0.25)', padding: '2px 8px', borderRadius: '12px'
                }}>{user.department}</span>
              )}
            </div>
            <p style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Active Location: <strong style={{ color: '#fff' }}>{activeLocationName}</strong>
            </p>
          </section>

          {/* Main Action Card */}
          <div className="action-card">
            {activeLoc?.isActive === false ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <AlertTriangle size={24} color="#EF4444" style={{ marginInline: 'auto', marginBottom: 8 }} />
                <span>This location is deactivated and cannot receive new notes.</span>
              </div>
            ) : (
              <>
                <div className="mic-container" onClick={() => router.push('/recording')}>
                  <div className="mic-glow"></div>
                  <div className="mic-circle">
                    <Mic size={32} color="#fff" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="tap-label">Tap to record note</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', margin: '4px 0' }}>OR</div>
                <div className="input-group">
                  <div className="input-row">
                    {isAnalyzingText ? <Loader2 size={20} className="spinner" color="var(--primary)" /> : <PenLine size={20} />}
                    <form onSubmit={handleTextSubmit} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        id="text-input" placeholder={isAnalyzingText ? "Analyzing..." : "Type a note..."}
                        className="home-text-input" value={textNote} onChange={(e) => setTextNote(e.target.value)} disabled={isAnalyzingText}
                      />
                      {textNote.trim() && !isAnalyzingText && (
                        <button type="submit" style={{
                          background: 'var(--primary)', border: 'none',
                          width: '28px', height: '28px', borderRadius: '50%',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', boxShadow: '0 2px 8px var(--primary-glow)',
                        }}>
                          <ChevronRight size={18} strokeWidth={3} />
                        </button>
                      )}
                    </form>
                  </div>
                  <div className="input-row" style={{ opacity: 0.4 }}>
                    <Camera size={20} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Add Photo (M5)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Today's Notes */}
          <section>
            <div className="section-head">
              <h3>Today's Notes</h3>
              <Link href="/notes" className="view-all">View all</Link>
            </div>
            <div className="notes-mini-list">
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
                  <Loader2 size={16} className="spinner" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading notes...</p>
                </div>
              ) : notes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-card-alt)', borderRadius: '16px' }}>
                  <ClipboardCheck size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notes recorded yet. Tap the mic to get started.</p>
                </div>
              ) : (
                notes.map(note => (
                  <div key={note._id} className="note-item" onClick={() => router.push('/notes')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '45px' }}>
                      <span className="time" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="dot" style={{ backgroundColor: note.issues?.length > 0 ? 'var(--staffing)' : 'var(--primary)' }}></div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
                      <span className="text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem', color: '#fff' }}>
                        {note.transcript}
                      </span>
                      {note.issues?.length > 0 && (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                          fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
                          fontWeight: '700', marginLeft: '8px', border: '1px solid rgba(239,68,68,0.2)',
                        }}>{note.issues.length}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Open Tasks */}
          <section>
            <div className="section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>Open Tasks</h3>
                {!loading && (
                  <span style={{
                    fontSize: '0.72rem', background: openCount > 0 ? 'rgba(239,68,68,0.15)' : 'var(--bg-card-alt)',
                    color: openCount > 0 ? '#EF4444' : 'var(--text-muted)',
                    padding: '2px 8px', borderRadius: '6px', fontWeight: '800',
                  }}>{openCount}</span>
                )}
              </div>
              <Link href="/tasks" className="view-all">View all</Link>
            </div>

            <div className="tasks-mini-list">
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
                  <Loader2 size={16} className="spinner" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg-card-alt)', borderRadius: '16px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No open tasks. Looking good!</p>
                </div>
              ) : (
                tasks.map(task => {
                  const cfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
                  const Icon = ISSUE_ICONS[task.sourceIssueType] || <AlertTriangle size={15} />;
                  return (
                    <div key={task._id} className="task-item" onClick={() => router.push('/tasks')} style={{ cursor: 'pointer' }}>
                      <div className="task-icon-box" style={{ background: cfg.bg, color: cfg.color }}>
                        {Icon}
                      </div>
                      <span className="task-title">{task.title}</span>
                      <span className="task-badge" style={{ background: cfg.bg, color: cfg.color }}>
                        {task.priority}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Daily Summary */}
          <section>
            <div className="section-head">
              <h3>Daily Summary</h3>
              <Link href="/summary" className="view-all">View full</Link>
            </div>
            <Link href="/summary" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(29,123,255,0.15) 0%, rgba(29,123,255,0.05) 100%)',
                border: '1px solid rgba(29,123,255,0.25)', borderRadius: 18, padding: '18px',
                display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: 'rgba(29,123,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CalendarDays size={24} color="var(--primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  {summary ? (
                    <>
                      <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 4 }}>
                        {summary.totalIssues} issue{summary.totalIssues !== 1 ? 's' : ''} detected today
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {summary.keyConcerns?.[0] || 'Tap to view AI summary'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 4 }}>
                        Today's Summary
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        AI-generated overview of today's operations
                      </p>
                    </>
                  )}
                </div>
                <ChevronRight size={20} color="var(--primary)" />
              </div>
            </Link>
          </section>

        </main>
      )}

      {/* Styled css additions */}
      <style>{`
        .greeting-block h1 {
          font-size: 1.4rem;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #fff;
        }
      `}</style>
    </>
  );
}
