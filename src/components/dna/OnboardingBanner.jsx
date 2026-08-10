"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dna, ChevronRight } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { getOnboardingStatus } from '@/src/services/api';

const MANAGER_ROLES = ['owner', 'district_manager', 'gm', 'agm', 'Manager'];

/**
 * Dashboard nudge to finish Business DNA setup. Renders nothing unless the
 * user is a manager AND onboarding is incomplete. Self-padded so it can sit
 * directly under the Header regardless of which dashboard view is active.
 */
export default function OnboardingBanner() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !MANAGER_ROLES.includes(user?.role)) return;
    getOnboardingStatus().then(setStatus).catch(() => {});
  }, [isAuthenticated, user?.role]);

  if (!status || status.completed || !MANAGER_ROLES.includes(user?.role)) return null;

  const percent = Math.round(((status.step - 1) / 4) * 100);

  return (
    <div style={{ width: '100%', maxWidth: 'var(--app-max-width)', margin: '12px auto 0', padding: '0 16px' }}>
      <button
        onClick={() => router.push('/business-dna/onboarding')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(29,123,255,0.14), rgba(0,212,255,0.08))',
          border: '1px solid rgba(29,123,255,0.35)', borderRadius: 'var(--radius-lg)',
          padding: '14px 16px', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,123,255,0.18)', border: '1px solid rgba(29,123,255,0.4)' }}>
          <Dna size={19} color="var(--primary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#fff' }}>Complete your Business DNA setup</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{percent}% complete · Step {status.step} of 4</div>
          <div style={{ marginTop: 8, height: 5, width: '100%', background: 'var(--bg-card-alt)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percent}%`, background: 'var(--primary)', borderRadius: 999 }} />
          </div>
        </div>
        <ChevronRight size={18} color="var(--text-secondary)" />
      </button>
    </div>
  );
}
