"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Calendar } from 'lucide-react';
import Header from '@/src/components/Header';
import { getNotes } from '@/src/services/api';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header showBack title="All Notes" />
      
      <main className="page">
        <div className="search-bar">
          <Search size={18} color="var(--text-secondary)" />
          <input placeholder="Search through your notes..." />
        </div>

        <div className="notes-list">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px' }}>
              <Loader2 size={32} className="spinner" color="var(--primary)" />
              <p style={{ color: 'var(--text-muted)' }}>Loading history...</p>
            </div>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No notes found.
            </div>
          ) : (
            notes.map((note) => (
              <div key={note._id} className="note-card" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <Calendar size={12} />
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>{note.transcript}</p>
                {note.issues?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {note.issues.map((issue, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--primary)' }}>
                        {issue.type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
