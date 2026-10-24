"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Wrench, X } from 'lucide-react';
import Header from '@/src/components/Header';
import { getIndustryConfig, getAssets, addAsset, deleteAsset, getVendors, updateOnboardingStep } from '@/src/services/api';
import { StepHeading, Field, Input, Select, Textarea, Pills, PrimaryButton, Card } from '@/src/components/dna/DnaKit';

const DEFAULT_CATEGORIES = ['Kitchen Equipment', 'Refrigeration', 'HVAC', 'POS Systems', 'Ice Machine', 'Fryers', 'Ovens', 'Dishwasher', 'Security', 'Other'];

export default function Step2Assets() {
  const router = useRouter();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [assets, setAssets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [filter, setFilter] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', manufacturer: '', model: '', serialNumber: '', purchaseYear: '', physicalLocation: '', preferredVendorId: '', notes: '' });

  const load = useCallback(async () => {
    try {
      const list = await getAssets({});
      setAssets(Array.isArray(list) ? list : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    getIndustryConfig().then((c) => { if (c?.assetCategories?.length) setCategories(c.assetCategories); }).catch(() => {});
    getVendors({}).then((v) => setVendors(Array.isArray(v) ? v : [])).catch(() => {});
    load();
  }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addAsset({ ...form, purchaseYear: form.purchaseYear ? Number(form.purchaseYear) : undefined, preferredVendorId: form.preferredVendorId || undefined });
      setForm({ name: '', category: '', manufacturer: '', model: '', serialNumber: '', purchaseYear: '', physicalLocation: '', preferredVendorId: '', notes: '' });
      setShowForm(false);
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setAssets((a) => a.filter((x) => x._id !== id));
    try { await deleteAsset(id); } catch { load(); }
  };

  const shown = filter ? assets.filter((a) => a.category === filter) : assets;

  return (
    <div className="page-wrapper">
      <Header title="Your Equipment" showBack onBack={() => router.push('/business-dna/onboarding/profile')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
        <StepHeading title="Your Equipment" step={2} subtitle="Let's build your digital restaurant" />

        <Pills options={categories} value={filter} onChange={setFilter} />

        {shown.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0' }}>
            No equipment yet. Add your first piece below.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((a) => (
            <Card key={a._id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Wrench size={18} color="var(--primary)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{a.name}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {[a.category, [a.manufacturer, a.model].filter(Boolean).join(' '), a.physicalLocation].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button onClick={() => handleDelete(a._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--staffing)' }}><Trash2 size={16} /></button>
            </Card>
          ))}
        </div>

        {showForm ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#fff' }}>Add Equipment</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <Field label="Equipment name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Manufacturer"><Input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} /></Field>
              <Field label="Model"><Input value={form.model} onChange={(e) => set('model', e.target.value)} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Serial number"><Input value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} /></Field>
              <Field label="Purchase year"><Input type="number" value={form.purchaseYear} onChange={(e) => set('purchaseYear', e.target.value)} /></Field>
            </div>
            <Field label="Physical location"><Input value={form.physicalLocation} onChange={(e) => set('physicalLocation', e.target.value)} placeholder="Kitchen, Walk-in, Bar…" /></Field>
            {vendors.length > 0 && (
              <Field label="Preferred vendor">
                <Select value={form.preferredVendorId} onChange={(e) => set('preferredVendorId', e.target.value)}>
                  <option value="">None</option>
                  {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
            <PrimaryButton loading={saving} onClick={handleAdd}>Add Equipment</PrimaryButton>
          </Card>
        ) : (
          <button className="btn btn-ghost" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={18} /> Add Equipment
          </button>
        )}

        <button className="btn btn-primary" onClick={async () => { await updateOnboardingStep(3); router.push('/business-dna/onboarding/vendors'); }}>
          {assets.length ? 'Continue' : 'Skip'} &rarr; Vendors
        </button>
      </div>
    </div>
  );
}
