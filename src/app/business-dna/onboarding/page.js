"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Dna, ArrowRight, Boxes, Users, FileText, Building2 } from 'lucide-react';
import Header from '@/src/components/Header';

const STEPS = [
  { icon: Building2, label: 'Restaurant Profile', desc: 'The basics — identity, hours, team, tech' },
  { icon: Boxes, label: 'Equipment', desc: 'Your digital asset register' },
  { icon: Users, label: 'Vendors', desc: 'Suppliers and service providers' },
  { icon: FileText, label: 'Documents', desc: 'SOPs, manuals, inspections' },
];

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <div className="page-wrapper">
      <Header title="Business DNA" showBack onBack={() => router.push('/more')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, marginTop: 12 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(29,123,255,0.12)', border: '1px solid rgba(29,123,255,0.3)',
          }}>
            <Dna size={30} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.25 }}>
            Let&apos;s build your Digital Restaurant
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 340, lineHeight: 1.55 }}>
            Business DNA is your restaurant&apos;s living operational memory — its equipment, vendors, documents, and
            hard-won knowledge, all in one place. It grows automatically as your team records notes.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map(({ icon: Icon, label, desc }, i) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: 14,
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0, fontSize: '0.8rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(29,123,255,0.1)', color: 'var(--primary)', border: '1px solid var(--border)',
              }}>{i + 1}</div>
              <Icon size={20} color="var(--text-secondary)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => router.push('/business-dna/onboarding/profile')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Get Started <ArrowRight size={18} />
          </button>
          <button className="btn btn-ghost" onClick={() => router.push('/')}>
            Skip for now
          </button>
        </div>

      </div>
    </div>
  );
}
