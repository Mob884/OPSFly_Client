"use client";
import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Calendar, Trash2, FileText, X } from 'lucide-react';
import Header from '@/src/components/Header';
import { getNotes, deleteNote, invalidateNotesCache } from '@/src/services/api';

const SEVERITY_COLORS = {
  staffing:    { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444' },
  'cost risk': { bg: 'rgba(255,138,0,0.12)',   color: '#FF8A00' },
  maintenance: { bg: 'rgba(34,197,94,0.12)',   color: '#22C55E' },
  other:       { bg: 'rgba(29,123,255,0.12)',  color: '#1D7BFF' },
};
function issueStyle(type = '') {
  return SEVERITY_COLORS[type.toLowerCase()] || SEVERITY_COLORS.other;
}

export default function NotesPage() {
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState('');
  const [deleting, setDeleting] = useState(null); // id being deleted

  useEffect(() => {
    getNotes(true) // force fresh fetch when entering Notes page
      .then(setNotes)
      .catch(err => console.error('Failed to fetch notes', err))
      .finally(() => setLoading(false));
  }, []);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter(n =>
      n.transcript?.toLowerCase().includes(q) ||
      n.issues?.some(i => i.type?.toLowerCase().includes(q))
    );
  }, [notes, query]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteNote(id);
      invalidateNotesCache();
      setNotes(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      alert('Failed to delete note. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <Header showBack title="All Notes" />
      <main className="page" style={{ paddingTop: 16 }}>

        {/* Search bar */}
        <div className="search-bar">
          <Search size={17} color="var(--text-muted)" />
          <input
            placeholder="Search notes or issues..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Note count */}
        {!loading && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: 4 }}>
            {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}{query ? ' found' : ' total'}
          </div>
        )}

        {/* States */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
            <Loader2 size={32} className="spinner" color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading notes...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
            <FileText size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 700, marginBottom: 6 }}>{query ? 'No results' : 'No notes yet'}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {query ? 'Try a different search term.' : 'Record your first note to get started.'}
            </p>
          </div>
        )}

        {/* Notes list */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(note => (
              <div
                key={note._id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  opacity: deleting === note._id ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Header row: date + time + delete */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <Calendar size={12} />
                    <span>{new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <button
                    onClick={() => handleDelete(note._id)}
                    disabled={deleting === note._id}
                    title="Delete note"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#EF4444',
                      borderRadius: 8,
                      width: 30, height: 30,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  >
                    {deleting === note._id
                      ? <Loader2 size={14} className="spinner" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>

                {/* Transcript */}
                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#fff', marginBottom: note.issues?.length > 0 ? 12 : 0 }}>
                  {note.transcript}
                </p>

                {/* Issue tags */}
                {note.issues?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {note.issues.map((issue, i) => {
                      const style = issueStyle(issue.type);
                      return (
                        <span key={i} style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          padding: '3px 10px', borderRadius: 6,
                          background: style.bg, color: style.color,
                        }}>
                          {issue.type}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
