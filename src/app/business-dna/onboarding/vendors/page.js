"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Star, Truck, X, Zap } from 'lucide-react';
import Header from '@/src/components/Header';
import { getIndustryConfig, getVendors, addVendor, deleteVendor, updateOnboardingStep } from '@/src/services/api';
import { StepHeading, Field, Input, Select, Textarea, Pills, Toggle, PrimaryButton, Card } from '@/src/components/dna/DnaKit';

const DEFAULT_CATEGORIES = ['Food & Beverage', 'HVAC', 'Plumbing', 'Electrical', 'Pest Control', 'Linen', 'Grease', 'Fire Suppression', 'Refrigeration', 'General Maintenance', 'Other'];
const RESPONSE_TIMES = ['Under 2 hours', 'Same day', 'Next day', 'Scheduled only'];

export default function Step3Vendors() {
  const router = useRouter();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [vendors, setVendors] = useState([]);
  const [filter, setFilter] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', primaryContact: '', phone: '', email: '', website: '', accountNumber: '', emergencyContact: false, averageResponseTime: '', rating: 0, preferredVendor: false, notes: '' });

  const load = useCallback(async () => {
    try { const list = await getVendors({}); setVendors(Array.isArray(list) ? list : []); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    getIndustryConfig().then((c) => { if (c?.vendorCategories?.length) setCategories(c.vendorCategories); }).catch(() => {});
    load();
  }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addVendor({ ...form, rating: form.rating || undefined });
      setForm({ name: '', category: '', primaryContact: '', phone: '', email: '', website: '', accountNumber: '', emergencyContact: false, averageResponseTime: '', rating: 0, preferredVendor: false, notes: '' });
      setShowForm(false);
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setVendors((v) => v.filter((x) => x._id !== id));
    try { await deleteVendor(id); } catch { load(); }
  };

  const shown = filter ? vendors.filter((v) => v.category === filter) : vendors;

  return (
    <div className="page-wrapper">
      <Header title="Your Vendors" showBack onBack={() => router.push('/business-dna/onboarding/assets')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
        <StepHeading title="Your Vendors" step={3} />

        <Pills options={categories} value={filter} onChange={setFilter} />

        {shown.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0' }}>
            No vendors yet. Add your first below.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((v) => (
            <Card key={v._id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Truck size={18} color="var(--primary)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {v.name}
                  {v.emergencyContact && <Zap size={13} color="var(--cost)" />}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {[v.category, v.phone].filter(Boolean).join(' · ')}
                </div>
              </div>
              {v.rating > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.74rem', color: 'var(--cost)' }}>
                  <Star size={12} fill="var(--cost)" /> {v.rating}
                </span>
              )}
              <button onClick={() => handleDelete(v._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--staffing)' }}><Trash2 size={16} /></button>
            </Card>
          ))}
        </div>

        {showForm ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#fff' }}>Add Vendor</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <Field label="Vendor name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Primary contact"><Input value={form.primaryContact} onChange={(e) => set('primaryContact', e.target.value)} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Email"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Website"><Input value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
              <Field label="Account number"><Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} /></Field>
            </div>
            <Field label="Average response time">
              <Select value={form.averageResponseTime} onChange={(e) => set('averageResponseTime', e.target.value)}>
                <option value="">Select…</option>
                {RESPONSE_TIMES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Rating">
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => set('rating', n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <Star size={22} color="var(--cost)" fill={n <= form.rating ? 'var(--cost)' : 'none'} />
                  </button>
                ))}
              </div>
            </Field>
            <Toggle checked={form.emergencyContact} onChange={(v) => set('emergencyContact', v)} label="Emergency contact (24/7)" />
            <Toggle checked={form.preferredVendor} onChange={(v) => set('preferredVendor', v)} label="Preferred vendor" />
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
            <PrimaryButton loading={saving} onClick={handleAdd}>Add Vendor</PrimaryButton>
          </Card>
        ) : (
          <button className="btn btn-ghost" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={18} /> Add Vendor
          </button>
        )}

        <button className="btn btn-primary" onClick={async () => { await updateOnboardingStep(4); router.push('/business-dna/onboarding/documents'); }}>
          {vendors.length ? 'Continue' : 'Skip'} &rarr; Documents
        </button>
      </div>
    </div>
  );
}
