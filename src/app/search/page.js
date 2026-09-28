"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Loader2, FileText, Wrench, Truck, ClipboardCheck, BookOpen,
} from 'lucide-react';
import Header from '@/src/components/Header';
import { searchAll } from '@/src/services/api';

const GROUPS = [
  { key: 'notes', label: 'Notes', icon: FileText },
  { key: 'assets', label: 'Equipment', icon: Wrench },
  { key: 'vendors', label: 'Vendors', icon: Truck },
  { key: 'correctiveActions', label: 'Corrective Actions', icon: ClipboardCheck },
  { key: 'dnaEntries', label: 'Business DNA', icon: BookOpen },
];

function labelFor(key, item) {
  if (key === 'notes') return item.transcript;
  if (key === 'assets') return item.name;
  if (key === 'vendors') return item.name;
  if (key === 'correctiveActions') return item.sourceQuote || '(no description)';
  if (key === 'dnaEntries') return item.title || item.content;
  return '';
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchAll({ q: query.trim(), type: 'all', limit: 10 });
      setResults(data);
    } catch (err) {
      console.error('Search failed', err);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const totalResults = results
    ? GROUPS.reduce((sum, g) => sum + (results[g.key]?.length || 0), 0)
    : 0;

  const navigateTo = (key, item) => {
    if (key === 'notes') router.push('/notes');
    else if (key === 'correctiveActions') router.push(`/corrective/${item._id}`);
    else if (key === 'assets' || key === 'vendors' || key === 'dnaEntries') router.push('/business-dna');
  };

  return (
    <>
      <Header showBack title="Search" />
      <main className="page">
        <form onSubmit={handleSearch} className="input-group">
          <div className="input-row">
            <Search size={18} color="var(--text-muted)" />
            <input
              autoFocus
              placeholder="Search notes, equipment, vendors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.95rem', outline: 'none', flex: 1 }}
            />
            {loading && <Loader2 size={16} className="spinner" />}
          </div>
        </form>

        {!searched && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Search across every note, asset, vendor, and corrective action your team has ever logged.
          </div>
        )}

        {searched && !loading && totalResults === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No results for "{query}".
          </div>
        )}

        {results && totalResults > 0 && GROUPS.map(({ key, label, icon: Icon }) => {
          const items = results[key] || [];
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                {label} ({items.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => navigateTo(key, item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                    }}
                  >
                    <Icon size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span style={{
                      fontSize: '0.85rem', color: '#fff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {labelFor(key, item)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
