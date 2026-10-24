"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/src/components/Header';
import { getBusinessProfile, saveBusinessProfile, updateOnboardingStep } from '@/src/services/api';
import { StepHeading, Field, Input, Select, Toggle, SectionLabel, PrimaryButton } from '@/src/components/dna/DnaKit';

const CUISINES = ['American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'Fast Casual', 'Fine Dining', 'Other'];
const POS = ['Toast', 'Square', 'Clover', 'Lightspeed', 'Other'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function Step1Profile() {
  const router = useRouter();
  const [form, setForm] = useState({
    restaurantName: '', address: '', city: '', state: '', zipCode: '', phone: '', email: '', website: '',
    cuisineType: '', numberOfLocations: '', isIndependent: true, franchiseName: '',
    numberOfEmployees: '', numberOfManagers: '', ownerInvolvedDaily: true, generalManagerName: '',
    posSystem: '', schedulingSoftware: '', inventorySoftware: '',
    operatingHours: DAYS.reduce((acc, d) => ({ ...acc, [d]: { open: '09:00', close: '22:00', closed: false } }), {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBusinessProfile().then((p) => {
      if (p && !p.exists) setForm((f) => ({ ...f, ...p, operatingHours: p.operatingHours || f.operatingHours }));
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setHour = (day, k, v) => setForm((f) => ({ ...f, operatingHours: { ...f.operatingHours, [day]: { ...f.operatingHours[day], [k]: v } } }));

  const handleNext = async () => {
    if (!form.restaurantName.trim()) { setError('Restaurant name is required'); return; }
    setSaving(true); setError('');
    try {
      await saveBusinessProfile({
        ...form,
        numberOfLocations: form.numberOfLocations ? Number(form.numberOfLocations) : undefined,
        numberOfEmployees: form.numberOfEmployees ? Number(form.numberOfEmployees) : undefined,
        numberOfManagers: form.numberOfManagers ? Number(form.numberOfManagers) : undefined,
      });
      await updateOnboardingStep(2);
      router.push('/business-dna/onboarding/assets');
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Header title="Restaurant Profile" showBack onBack={() => router.push('/business-dna/onboarding')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
        <StepHeading title="Restaurant Profile" step={1} />

        <SectionLabel>Restaurant Info</SectionLabel>
        <Field label="Restaurant name *"><Input value={form.restaurantName} onChange={(e) => set('restaurantName', e.target.value)} placeholder="e.g. Demo Diner" /></Field>
        <Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr', gap: 10 }}>
          <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => set('state', e.target.value)} /></Field>
          <Field label="Zip"><Input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        </div>
        <Field label="Website"><Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>

        <SectionLabel>Operations</SectionLabel>
        <Field label="Cuisine type">
          <Select value={form.cuisineType} onChange={(e) => set('cuisineType', e.target.value)}>
            <option value="">Select…</option>
            {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Number of locations"><Input type="number" value={form.numberOfLocations} onChange={(e) => set('numberOfLocations', e.target.value)} /></Field>
        <Toggle checked={form.isIndependent} onChange={(v) => set('isIndependent', v)} label={form.isIndependent ? 'Independent' : 'Franchise'} />
        {!form.isIndependent && <Field label="Franchise name"><Input value={form.franchiseName} onChange={(e) => set('franchiseName', e.target.value)} /></Field>}

        <SectionLabel>Hours</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DAYS.map((day) => (
            <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 42, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{day.slice(0, 3)}</span>
              {form.operatingHours[day].closed ? (
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Closed</span>
              ) : (
                <>
                  <Input type="time" value={form.operatingHours[day].open} onChange={(e) => setHour(day, 'open', e.target.value)} style={{ flex: 1, padding: '8px' }} />
                  <span style={{ color: 'var(--text-muted)' }}>–</span>
                  <Input type="time" value={form.operatingHours[day].close} onChange={(e) => setHour(day, 'close', e.target.value)} style={{ flex: 1, padding: '8px' }} />
                </>
              )}
              <Toggle checked={form.operatingHours[day].closed} onChange={(v) => setHour(day, 'closed', v)} />
            </div>
          ))}
        </div>

        <SectionLabel>Team</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Employees"><Input type="number" value={form.numberOfEmployees} onChange={(e) => set('numberOfEmployees', e.target.value)} /></Field>
          <Field label="Managers"><Input type="number" value={form.numberOfManagers} onChange={(e) => set('numberOfManagers', e.target.value)} /></Field>
        </div>
        <Toggle checked={form.ownerInvolvedDaily} onChange={(v) => set('ownerInvolvedDaily', v)} label="Owner involved daily" />
        <Field label="General Manager name"><Input value={form.generalManagerName} onChange={(e) => set('generalManagerName', e.target.value)} /></Field>

        <SectionLabel>Technology</SectionLabel>
        <Field label="POS system">
          <Select value={form.posSystem} onChange={(e) => set('posSystem', e.target.value)}>
            <option value="">Select…</option>
            {POS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Scheduling software"><Input value={form.schedulingSoftware} onChange={(e) => set('schedulingSoftware', e.target.value)} /></Field>
        <Field label="Inventory software"><Input value={form.inventorySoftware} onChange={(e) => set('inventorySoftware', e.target.value)} /></Field>

        {error && <p style={{ color: 'var(--staffing)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        <PrimaryButton loading={saving} onClick={handleNext}>Save &amp; Continue</PrimaryButton>
      </div>
    </div>
  );
}
