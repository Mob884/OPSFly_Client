"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import Header from '@/src/components/Header';
import { addDNAEntry } from '@/src/services/api';
import { Field, Input, Select, Textarea, PrimaryButton, Card, SectionLabel } from '@/src/components/dna/DnaKit';

const ENTRY_TYPES = [
  { value: 'building', label: 'Building Info' },
  { value: 'utility', label: 'Utility Info' },
  { value: 'emergency', label: 'Emergency Contact / Procedure' },
  { value: 'maintenance', label: 'Maintenance Record' },
  { value: 'procedure', label: 'Operating Procedure' },
  { value: 'lesson', label: 'Lesson Learned' },
  { value: 'custom', label: 'Other' },
];

const EXAMPLES = [
  'Water shutoff is located behind the walk-in cooler, red valve on the left pipe',
  'Main breaker panel is in the back office, labeled by zone',
  'Emergency plumber: Mike\'s Plumbing 555-1234, call after hours too',
];

export default function AddDNAEntry() {
  const router = useRouter();
  const [entryType, setEntryType] = useState('building');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags((t) => [...t, tagInput.trim()]);
      setTagInput('');
    }
  };

  const save = async () => {
    if (!content.trim()) { setError('Please enter the knowledge to remember'); return; }
    setSaving(true); setError('');
    try {
      await addDNAEntry({ entryType, title: title.trim() || undefined, content: content.trim(), tags });
      router.push('/business-dna');
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-wrapper">
      <Header title="Add Knowledge" showBack onBack={() => router.push('/business-dna')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '6px 0 0' }}>Add Knowledge</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>Capture anything worth remembering. This grows your Business DNA forever.</p>

        <Field label="Entry type">
          <Select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
            {ENTRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>

        <Field label="Title (optional)"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water shutoff location" /></Field>

        <Field label="Knowledge *">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe it in your own words…" />
        </Field>

        <Field label="Tags" hint="Type a tag and press Enter">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="water, emergency…" />
        </Field>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((t) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', fontWeight: 700, background: 'rgba(29,123,255,0.12)', color: 'var(--primary)', border: '1px solid rgba(29,123,255,0.25)', padding: '4px 8px', borderRadius: 999 }}>
                {t}<button onClick={() => setTags((prev) => prev.filter((x) => x !== t))} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}

        {error && <p style={{ color: 'var(--staffing)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        <PrimaryButton loading={saving} onClick={save}>Save Knowledge</PrimaryButton>

        <SectionLabel>Examples</SectionLabel>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-card-alt)' }}>
          {EXAMPLES.map((ex) => (
            <div key={ex} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>&ldquo;{ex}&rdquo;</div>
          ))}
        </Card>
      </div>
    </div>
  );
}
