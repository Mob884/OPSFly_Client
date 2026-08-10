"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2, FileText, CheckCircle2, X } from 'lucide-react';
import Header from '@/src/components/Header';
import { getDocuments, uploadFile, uploadDocument, deleteDocument, updateOnboardingStep } from '@/src/services/api';
import { StepHeading, Field, Input, Select, Textarea, Pills, PrimaryButton, Card } from '@/src/components/dna/DnaKit';

const DOC_TYPES = ['Employee Handbook', 'Cleaning SOPs', 'Health Inspection', 'Equipment Manuals', 'Opening Checklist', 'Closing Checklist', 'Emergency Procedures', 'Other'];

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Step4Documents() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', documentType: '', description: '', file: null });

  const load = useCallback(async () => {
    try { const list = await getDocuments({}); setDocs(Array.isArray(list) ? list : []); } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.file) { setError('Please choose a file'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', form.file);
      fd.append('folder', 'documents');
      const { fileKey } = await uploadFile(fd);
      await uploadDocument({
        title: form.title.trim(),
        documentType: form.documentType,
        description: form.description,
        fileKey,
        fileName: form.file.name,
        mimeType: form.file.type,
        fileSize: form.file.size,
      });
      setForm({ title: '', documentType: '', description: '', file: null });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDocs((d) => d.filter((x) => x._id !== id));
    try { await deleteDocument(id); } catch { load(); }
  };

  const finish = async () => {
    await updateOnboardingStep(5);
    router.push('/business-dna');
  };

  const shown = filter ? docs.filter((d) => d.documentType === filter) : docs;

  return (
    <div className="page-wrapper">
      <Header title="Your Documents" showBack onBack={() => router.push('/business-dna/onboarding/vendors')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
        <StepHeading title="Your Documents" step={4} />

        <Pills options={DOC_TYPES} value={filter} onChange={setFilter} />

        {shown.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0' }}>
            No documents yet. Upload your first below.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((d) => (
            <Card key={d._id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText size={18} color="var(--primary)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={d.signedUrl || '#'} target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>{d.title}</a>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {[d.documentType, fmtSize(d.fileSize)].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button onClick={() => handleDelete(d._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--staffing)' }}><Trash2 size={16} /></button>
            </Card>
          ))}
        </div>

        {showForm ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#fff' }}>Upload Document</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <Field label="Title *"><Input value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Document type">
              <Select value={form.documentType} onChange={(e) => set('documentType', e.target.value)}>
                <option value="">Select…</option>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Description"><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }}
              onChange={(e) => set('file', e.target.files?.[0] || null)} />
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {form.file ? <><CheckCircle2 size={16} color="var(--maintenance)" /> {form.file.name}</> : <><Upload size={16} /> Choose file</>}
            </button>
            {error && <p style={{ color: 'var(--staffing)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
            <PrimaryButton loading={saving} onClick={handleUpload}>Upload</PrimaryButton>
          </Card>
        ) : (
          <button className="btn btn-ghost" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Upload size={18} /> Upload Document
          </button>
        )}

        <button className="btn btn-primary" onClick={finish}>Finish Setup</button>
      </div>
    </div>
  );
}
