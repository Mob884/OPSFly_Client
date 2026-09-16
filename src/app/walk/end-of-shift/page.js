"use client";
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/src/components/Header';
import { submitEndOfShift } from '@/src/services/api';
import { Field, Textarea, PrimaryButton, GhostButton } from '@/src/components/dna/DnaKit';

function EndOfShiftForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [opportunity, setOpportunity] = useState('');
  const [strongPoint, setStrongPoint] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!sessionId) { router.push('/'); return; }
    setSaving(true); setError('');
    try {
      await submitEndOfShift(sessionId, { opportunity: opportunity.trim(), strongPoint: strongPoint.trim() });
      router.push('/');
    } catch (e) {
      setError(e.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Header title="End of Shift" showBack onBack={() => router.push('/')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
        <div style={{ marginTop: 6 }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0 }}>End of Shift</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>
            Two quick questions — under a minute, then you're done.
          </p>
        </div>

        <Field label="What's your #1 opportunity from this shift?">
          <Textarea
            value={opportunity}
            onChange={(e) => setOpportunity(e.target.value)}
            placeholder="e.g. Bar needs a second barback on Fridays"
            style={{ minHeight: 130, fontSize: '1rem' }}
          />
        </Field>

        <Field label="What's your #1 strong point from this shift?">
          <Textarea
            value={strongPoint}
            onChange={(e) => setStrongPoint(e.target.value)}
            placeholder="e.g. New server Jess handled a 12-top on her third shift"
            style={{ minHeight: 130, fontSize: '1rem' }}
          />
        </Field>

        {error && <p style={{ color: 'var(--staffing)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}

        <PrimaryButton loading={saving} onClick={submit}>Submit &amp; Close Shift</PrimaryButton>
        <GhostButton onClick={() => router.push('/')}>Skip for now</GhostButton>
      </div>
    </div>
  );
}

export default function EndOfShiftPage() {
  return (
    <Suspense fallback={null}>
      <EndOfShiftForm />
    </Suspense>
  );
}
