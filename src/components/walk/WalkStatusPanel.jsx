"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Footprints, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { getHandover, getActiveWalk, startWalk, endWalk } from '@/src/services/api';
import HandoverCard from './HandoverCard';
import WalkActiveBanner from './WalkActiveBanner';

const MANAGER_ROLES = ['owner', 'district_manager', 'gm', 'agm', 'department_manager', 'Manager'];

/**
 * Self-contained orchestrator for the Four Corner Walk status shown on
 * Home: fetches handover + active-walk state, and owns the start/end walk
 * actions so switching between the handover card and the active-walk
 * banner is instant (no navigation, no reload) — the mic button stays the
 * screen's primary CTA throughout.
 */
export default function WalkStatusPanel() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [handover, setHandover] = useState(null);
  const [activeWalk, setActiveWalk] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !MANAGER_ROLES.includes(user?.role)) return;
    getActiveWalk().then(setActiveWalk).catch(() => {});
    getHandover().then((h) => { if (h && h.wasUnread) setHandover(h); }).catch(() => {});
  }, [isAuthenticated, user?.role]);

  const handleStartWalk = async () => {
    setStarting(true);
    try {
      const session = await startWalk();
      setActiveWalk({ _id: session.walkSessionId, startedAt: session.startedAt, noteCount: 0 });
      setHandover(null);
    } catch (e) {
      console.error('Failed to start walk', e);
    } finally {
      setStarting(false);
    }
  };

  const handleEndWalk = async () => {
    if (!activeWalk) return;
    setEnding(true);
    try {
      await endWalk(activeWalk._id);
      router.push(`/walk/end-of-shift?sessionId=${activeWalk._id}`);
    } catch (e) {
      console.error('Failed to end walk', e);
      setEnding(false);
    }
  };

  if (!isAuthenticated || !MANAGER_ROLES.includes(user?.role)) return null;

  if (activeWalk) {
    return <WalkActiveBanner session={activeWalk} onEndWalk={handleEndWalk} ending={ending} />;
  }

  if (handover && !dismissed) {
    return (
      <HandoverCard
        handover={handover}
        onStartWalk={handleStartWalk}
        onDismiss={() => setDismissed(true)}
        starting={starting}
      />
    );
  }

  // No pending handover to react to, but a manager can still start a walk
  // anytime — a quiet link, not a card, so it doesn't compete with the mic.
  return (
    <div style={{ width: '100%', maxWidth: 'var(--app-max-width)', margin: '10px auto 0', padding: '0 16px', display: 'flex', justifyContent: 'flex-end' }}>
      <button
        onClick={handleStartWalk}
        disabled={starting}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '4px 2px', opacity: starting ? 0.6 : 1 }}
      >
        {starting ? <Loader2 size={14} className="spin" /> : <Footprints size={14} />}
        {starting ? 'Starting…' : 'Start Walk'}
      </button>
    </div>
  );
}
