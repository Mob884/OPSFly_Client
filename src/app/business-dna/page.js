"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dna, Building2, Boxes, Users, FileText, Brain, Plus, ChevronRight, Loader2, Zap } from 'lucide-react';
import Header from '@/src/components/Header';
import { getOnboardingStatus, getBusinessProfile, getDNAEntries } from '@/src/services/api';
import { Card, SectionLabel } from '@/src/components/dna/DnaKit';

function HubCard({ icon: Icon, color, title, subtitle, actionLabel, onAction }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}1f`, border: `1px solid ${color}44` }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{title}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{subtitle}</div>
        </div>
      </div>
      <button className="btn btn-ghost" onClick={onAction} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span>{actionLabel}</span><ChevronRight size={16} />
      </button>
    </Card>
  );
}

export default function BusinessDNAHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entryTotal, setEntryTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [st, pr, en] = await Promise.all([
          getOnboardingStatus().catch(() => null),
          getBusinessProfile().catch(() => null),
          getDNAEntries({ limit: 4 }).catch(() => ({ entries: [], total: 0 })),
        ]);
        setStatus(st);
        setProfile(pr && !pr.exists ? pr : null);
        setEntries(en.entries || []);
        setEntryTotal(en.total || 0);
        // First-time org with nothing set up → send to onboarding welcome.
        if (st && !st.completed && !st.profileComplete && st.assetsCount === 0 && st.vendorsCount === 0) {
          router.replace('/business-dna/onboarding');
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Header title="Business DNA" showBack onBack={() => router.push('/more')} />
        <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={28} className="spin" color="var(--primary)" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Header title="Business DNA" showBack onBack={() => router.push('/more')} />
      <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,123,255,0.12)', border: '1px solid rgba(29,123,255,0.3)' }}>
            <Dna size={22} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>Business DNA</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              {profile?.restaurantName ? `${profile.restaurantName}'s operational knowledge` : 'Your operational knowledge'}
            </p>
          </div>
        </div>

        {status && !status.completed && (
          <Card style={{ background: 'rgba(29,123,255,0.08)', borderColor: 'rgba(29,123,255,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Zap size={18} color="var(--primary)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Finish your setup</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Step {status.step} of 4</div>
            </div>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => router.push('/business-dna/onboarding')}>Continue</button>
          </Card>
        )}

        <SectionLabel>Restaurant knowledge</SectionLabel>

        <HubCard icon={Building2} color="#1D7BFF" title="Restaurant Profile"
          subtitle={profile?.restaurantName ? `${profile.restaurantName}${profile.city ? ` · ${profile.city}` : ''}` : 'Not set up yet'}
          actionLabel="Edit Profile" onAction={() => router.push('/business-dna/onboarding/profile')} />

        <HubCard icon={Boxes} color="#00D4FF" title="Equipment"
          subtitle={`${status?.assetsCount ?? 0} asset${(status?.assetsCount ?? 0) === 1 ? '' : 's'} registered`}
          actionLabel="Manage Equipment" onAction={() => router.push('/business-dna/onboarding/assets')} />

        <HubCard icon={Users} color="#FFB800" title="Vendors"
          subtitle={`${status?.vendorsCount ?? 0} vendor${(status?.vendorsCount ?? 0) === 1 ? '' : 's'}`}
          actionLabel="Manage Vendors" onAction={() => router.push('/business-dna/onboarding/vendors')} />

        <HubCard icon={FileText} color="#22C55E" title="Documents"
          subtitle={`${status?.documentsCount ?? 0} document${(status?.documentsCount ?? 0) === 1 ? '' : 's'}`}
          actionLabel="Manage Documents" onAction={() => router.push('/business-dna/onboarding/documents')} />

        <SectionLabel>Operational knowledge</SectionLabel>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,214,143,0.12)', border: '1px solid rgba(0,214,143,0.3)' }}>
              <Brain size={20} color="var(--maintenance)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Knowledge entries</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{entryTotal} entr{entryTotal === 1 ? 'y' : 'ies'} · building info, utilities, procedures, lessons</div>
            </div>
          </div>
          {entries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map((e) => (
                <div key={e._id} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '8px 10px', background: 'var(--bg-card-alt)', borderRadius: 8 }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, textTransform: 'capitalize' }}>{e.entryType}</span> · {e.title || e.content?.slice(0, 60)}
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary" onClick={() => router.push('/business-dna/add-entry')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={18} /> Add Knowledge
          </button>
        </Card>

      </div>
    </div>
  );
}
