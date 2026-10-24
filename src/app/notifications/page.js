"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/src/components/Header';
import { getNotifications, markNotificationsAsRead } from '@/src/services/api';
import { Bell, Check, Loader2, CalendarDays, ClipboardCheck, MessageSquare, ShieldAlert } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const list = await getNotifications();
      setNotifications(list || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Notifications — OpsFly';
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      const updated = await markNotificationsAsRead();
      setNotifications(updated || []);
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleTapNotification = async (item) => {
    try {
      // Mark as read immediately on click
      if (!item.read) {
        const updated = await markNotificationsAsRead([item._id]);
        setNotifications(updated || []);
      }
      
      // Navigate to correct section
      if (item.type === 'note_added') {
        router.push('/notes');
      } else {
        router.push('/tasks');
      }
    } catch (err) {
      console.error('Failed to process notification tap', err);
    }
  };

  const getNotificationIcon = (type) => {
    if (type === 'task_assigned') return <ClipboardCheck size={18} color="var(--primary)" />;
    if (type === 'task_completed') return <Check size={18} color="#22C55E" />;
    return <MessageSquare size={18} color="#FF8A00" />;
  };

  return (
    <>
      <Header title="Notifications" showBack />
      
      <main className="page" style={{ paddingTop: '16px', paddingBottom: '30px' }}>
        
        {/* Header Actions */}
        {notifications.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '8px' }}>
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll || !notifications.some(n => !n.read)}
              style={{
                background: 'none', border: 'none', color: 'var(--primary)',
                fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, opacity: notifications.some(n => !n.read) ? 1 : 0.5
              }}
            >
              {markingAll ? <Loader2 size={12} className="spinner" /> : <Check size={14} />}
              <span>Mark all as read</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0' }}>
            <Loader2 size={32} className="spinner" color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading alerts...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
            <ShieldAlert size={40} color="var(--staffing)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          /* Empty State */
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginInline: 'auto', marginBottom: 16
            }}>
              <Bell size={24} color="var(--text-muted)" />
            </div>
            <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem', marginBottom: 6 }}>All caught up!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>You have no recent notifications.</p>
          </div>
        ) : (
          /* Notifications list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(item => (
              <div
                key={item._id}
                onClick={() => handleTapNotification(item)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: 14, background: item.read ? 'var(--bg-card)' : 'rgba(29, 123, 255, 0.05)',
                  border: `1px solid ${item.read ? 'var(--border)' : 'rgba(29, 123, 255, 0.25)'}`,
                  borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {/* Active/Unread blue dot */}
                {!item.read && (
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)',
                    boxShadow: '0 0 6px var(--primary)'
                  }} />
                )}

                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: item.read ? 'rgba(255,255,255,0.04)' : 'rgba(29,123,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {getNotificationIcon(item.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <p style={{
                    fontSize: '0.85rem', fontWeight: item.read ? 600 : 750,
                    color: item.read ? 'var(--text-secondary)' : '#fff',
                    lineHeight: 1.4, margin: 0
                  }}>
                    {item.message}
                  </p>
                  <span style={{
                    display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)',
                    marginTop: 6
                  }}>
                    {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </>
  );
}
