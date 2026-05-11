"use client";
import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Mic, PenLine, Camera, Users, DollarSign, Wrench, AlertTriangle, ClipboardCheck, ChevronRight, Loader2, CalendarDays, BarChart3 } from 'lucide-react';
import Header from '@/src/components/Header';
import { getNotes, getTasks, analyzeNote, getTodaySummary } from '@/src/services/api';

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
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [textNote, setTextNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const [notesData, tasksData] = await Promise.all([getNotes(), getTasks()]);
        setNotes(notesData.slice(0, 5));
        setTasks(tasksData.filter(t => t.status === 'open').slice(0, 3));
        // Load today's summary in background (non-blocking)
        getTodaySummary().then(setSummary).catch(() => {});
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const openCount = tasks.length;

  return (
    <>
      <Header />
      <main className="page">
        {/* Greeting */}
        <section className="greeting-block">
          <h1>Good morning, Fred 👋</h1>
          <p>Let's keep your operations running smooth.</p>
        </section>

        {/* Main Action Card */}
        <div className="action-card">
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
                  id="text-input"
                  placeholder={isAnalyzingText ? "Analyzing..." : "Type a note..."}
                  className="home-text-input"
                  value={textNote}
                  onChange={(e) => setTextNote(e.target.value)}
                  disabled={isAnalyzingText}
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notes yet today.</p>
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

        {/* Open Tasks — real data */}
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No open tasks. 🎉</p>
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

        {/* Daily Summary card */}
        <section>
          <div className="section-head">
            <h3>Daily Summary</h3>
            <Link href="/summary" className="view-all">View full</Link>
          </div>
          <Link href="/summary" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(29,123,255,0.15) 0%, rgba(29,123,255,0.05) 100%)',
              border: '1px solid rgba(29,123,255,0.25)',
              borderRadius: 18, padding: '18px',
              display: 'flex', alignItems: 'center', gap: 16,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: 'rgba(29,123,255,0.15)',
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
    </>
  );
}
