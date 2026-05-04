"use client";
import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Mic, PenLine, Camera, Users, DollarSign, Wrench, ClipboardCheck, ChevronRight, Loader2 } from 'lucide-react';
import Header from '@/src/components/Header';
import { getNotes, analyzeNote } from '@/src/services/api';

/**
 * Home Page — Converted to Next.js Client Component
 */
export default function Home() {
  const [notes, setNotes] = useState([]);
  const [textNote, setTextNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const data = await getNotes();
      setNotes(data.slice(0, 5)); // Show latest 5 on home
    } catch (err) {
      console.error('Failed to fetch notes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!textNote.trim() || isAnalyzingText) return;

    setIsAnalyzingText(true);
    try {
      const result = await analyzeNote(textNote);
      // Next.js uses router.push instead of navigate
      // We pass state via query params or a global store if needed, 
      // but for simplicity with existing logic, we'll use sessionStorage or similar
      // Actually, Next.js doesn't support 'state' in push natively like react-router
      // So we'll use sessionStorage to pass the analysis data
      const analysisData = { 
        transcript: textNote, 
        source: 'text',
        issues: result.issues,
        analyzedAt: new Date()
      };
      sessionStorage.setItem('lastAnalysis', JSON.stringify(analysisData));
      router.push('/analysis');
      
      setTextNote('');
    } catch (err) {
      console.error('Analysis failed', err);
      const fallbackData = { 
        transcript: textNote, 
        source: 'text',
        issues: []
      };
      sessionStorage.setItem('lastAnalysis', JSON.stringify(fallbackData));
      router.push('/analysis');
    } finally {
      setIsAnalyzingText(false);
    }
  };

  return (
    <>
      <Header />
      
      <main className="page">
        {/* Greeting Section */}
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
          
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', margin: '8px 0' }}>OR</div>
          
          <div className="input-group">
            <div className="input-row">
              {isAnalyzingText ? <Loader2 size={20} className="spinner" color="var(--primary)" /> : <PenLine size={20} />}
              <form 
                onSubmit={handleTextSubmit}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <input 
                  id="text-input"
                  placeholder={isAnalyzingText ? "Analyzing..." : "Type a note..."} 
                  className="home-text-input"
                  value={textNote}
                  onChange={(e) => setTextNote(e.target.value)}
                  disabled={isAnalyzingText}
                />
                {textNote.trim() && !isAnalyzingText && (
                  <button 
                    type="submit"
                    style={{ 
                      background: 'var(--primary)', 
                      border: 'none', 
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: '0 2px 8px var(--primary-glow)'
                    }}
                  >
                    <ChevronRight size={18} strokeWidth={3} />
                  </button>
                )}
              </form>
            </div>
            
            <div className="input-row" style={{ opacity: 0.5 }}>
              <Camera size={20} />
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Add Photo (M4)</span>
            </div>
          </div>
        </div>

        {/* Today's Notes Section */}
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
                    <span className="text" style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      fontSize: '0.9rem',
                      color: '#fff'
                    }}>
                      {note.transcript}
                    </span>
                    {note.issues?.length > 0 && (
                      <span style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: '#EF4444', 
                        fontSize: '0.7rem', 
                        padding: '1px 6px', 
                        borderRadius: '4px',
                        fontWeight: '700',
                        marginLeft: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}>
                        {note.issues.length}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Open Tasks Section */}
        <section>
          <div className="section-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3>Open Tasks</h3>
              <span style={{ 
                fontSize: '0.75rem', 
                background: 'var(--bg-card-alt)', 
                padding: '2px 8px', 
                borderRadius: '4px', 
                color: 'var(--text-secondary)',
                fontWeight: '700'
              }}>3</span>
            </div>
            <Link href="/tasks" className="view-all">View all</Link>
          </div>
          
          <div className="tasks-mini-list">
            <div className="task-item">
              <div className="task-icon-box" style={{ background: 'rgba(255, 77, 106, 0.15)', color: 'var(--staffing)' }}>
                <Users size={16} />
              </div>
              <span className="task-title">Review staffing coverage</span>
              <span className="task-badge badge-high">High</span>
            </div>
            <div className="task-item">
              <div className="task-icon-box" style={{ background: 'rgba(255, 184, 0, 0.15)', color: 'var(--cost)' }}>
                <DollarSign size={16} />
              </div>
              <span className="task-title">Check bar pour control</span>
              <span className="task-badge badge-medium">Medium</span>
            </div>
            <div className="task-item">
              <div className="task-icon-box" style={{ background: 'rgba(0, 214, 143, 0.15)', color: 'var(--maintenance)' }}>
                <Wrench size={16} />
              </div>
              <span className="task-title">Replace entrance plant</span>
              <span className="task-badge badge-low">Low</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
