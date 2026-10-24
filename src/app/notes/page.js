"use client";
import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Calendar, Trash2, FileText, X, CheckSquare, Square } from 'lucide-react';
import Header from '@/src/components/Header';
import { getNotes, deleteNote, invalidateNotesCache } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';

const SEVERITY_COLORS = {
  staffing:    { bg: 'rgba(239,68,68,0.12)',  color: '#EF4444' },
  'cost risk': { bg: 'rgba(255,138,0,0.12)',  color: '#FF8A00' },
  maintenance: { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
  other:       { bg: 'rgba(29,123,255,0.12)', color: '#1D7BFF' },
};
function issueStyle(type = '') {
  return SEVERITY_COLORS[type.toLowerCase()] || SEVERITY_COLORS.other;
}

export default function NotesPage() {
  const { currentLocationId } = useAuth();
  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [deleting, setDeleting]   = useState(null);      // single-delete id
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]   = useState(new Set()); // selected ids
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (!currentLocationId) return;
    setLoading(true);
    getNotes(true)
      .then(setNotes)
      .catch(err => console.error('Failed to fetch notes', err))
      .finally(() => setLoading(false));
  }, [currentLocationId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter(n =>
      n.transcript?.toLowerCase().includes(q) ||
      n.issues?.some(i => i.type?.toLowerCase().includes(q))
    );
  }, [notes, query]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && filtered.every(n => selected.has(n._id));
  const someSelected = selected.size > 0;

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(n => n._id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  // ── Single delete ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteNote(id);
      invalidateNotesCache();
      setNotes(prev => prev.filter(n => n._id !== id));
    } catch {
      alert('Failed to delete note.');
    } finally {
      setDeleting(null);
    }
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const count = selected.size;
    if (!window.confirm(`Delete ${count} selected note${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => deleteNote(id)));
      invalidateNotesCache();
      setNotes(prev => prev.filter(n => !selected.has(n._id)));
      exitSelectMode();
    } catch {
      alert('Some notes could not be deleted. Please try again.');
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <>
      <Header showBack title="All Notes" />
      <main className="page" style={{ paddingTop: 16 }}>

        {/* ── Search + Select toggle ── */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1 }}>
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

          {/* Select / Cancel button */}
          {!loading && notes.length > 0 && (
            <button
              onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
              style={{
                background: selectMode ? 'rgba(239,68,68,0.1)' : 'var(--bg-card)',
                color: selectMode ? '#EF4444' : 'var(--text-secondary)',
                border: `1px solid ${selectMode ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                borderRadius: 10, padding: '0 14px', height: 42,
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
        </div>

        {/* ── Bulk action bar (appears when in select mode) ── */}
        {selectMode && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-card)', borderRadius: 12,
            padding: '10px 14px', border: '1px solid var(--border)',
          }}>
            {/* Select all */}
            <button
              onClick={toggleSelectAll}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {allSelected
                ? <CheckSquare size={18} color="var(--primary)" />
                : <Square size={18} color="var(--text-muted)" />
              }
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {selected.size} selected
            </span>

            {/* Bulk delete */}
            <button
              onClick={handleBulkDelete}
              disabled={!someSelected || bulkDeleting}
              style={{
                background: someSelected ? 'rgba(239,68,68,0.15)' : 'transparent',
                color: someSelected ? '#EF4444' : 'var(--text-muted)',
                border: `1px solid ${someSelected ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
                borderRadius: 8, padding: '6px 14px',
                fontWeight: 700, fontSize: '0.82rem', cursor: someSelected ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {bulkDeleting
                ? <Loader2 size={14} className="spinner" />
                : <Trash2 size={14} />
              }
              {bulkDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}

        {/* ── Note count ── */}
        {!loading && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: 4 }}>
            {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}{query ? ' found' : ' total'}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' }}>
            <Loader2 size={32} className="spinner" color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading notes...</p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
            <FileText size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 700, marginBottom: 6 }}>{query ? 'No results' : 'No notes yet'}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {query ? 'Try a different search term.' : 'Record your first note to get started.'}
            </p>
          </div>
        )}

        {/* ── Notes list ── */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(note => {
              const isSelected = selected.has(note._id);
              return (
                <div
                  key={note._id}
                  onClick={selectMode ? () => toggleSelect(note._id) : undefined}
                  style={{
                    background: isSelected ? 'rgba(29,123,255,0.08)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'rgba(29,123,255,0.4)' : 'var(--border)'}`,
                    borderRadius: 16,
                    padding: '14px 16px',
                    opacity: deleting === note._id ? 0.4 : 1,
                    transition: 'all 0.15s',
                    cursor: selectMode ? 'pointer' : 'default',
                  }}
                >
                  {/* Header: date + time + checkbox OR delete */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {/* Checkbox in select mode */}
                      {selectMode && (
                        <div style={{ marginRight: 4 }}>
                          {isSelected
                            ? <CheckSquare size={18} color="var(--primary)" />
                            : <Square size={18} color="var(--text-muted)" />
                          }
                        </div>
                      )}
                      <Calendar size={12} />
                      <span>{new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Single delete (only when NOT in select mode) */}
                    {!selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(note._id); }}
                        disabled={deleting === note._id}
                        style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#EF4444', borderRadius: 8,
                          width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                        }}
                      >
                        {deleting === note._id
                          ? <Loader2 size={14} className="spinner" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    )}
                  </div>

                  {/* Transcript */}
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#fff', marginBottom: note.issues?.length > 0 ? 10 : 0 }}>
                    {note.transcript}
                  </p>

                  {/* Issue tags */}
                  {note.issues?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {note.issues.map((issue, i) => {
                        const s = issueStyle(issue.type);
                        return (
                          <span key={i} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: s.bg, color: s.color }}>
                            {issue.type}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
