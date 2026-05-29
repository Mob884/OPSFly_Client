"use client";
import React, { useEffect } from 'react';
import Header from '@/src/components/Header';
import { useAuth } from '@/src/context/AuthContext';
import { Settings, LogOut, Shield, User, Bell, AppWindow, HelpCircle } from 'lucide-react';

export default function MorePage() {
  const { user, logout } = useAuth();

  useEffect(() => {
    document.title = 'Settings — OpsFly';
  }, []);

  const isManager = user?.role === 'Manager';

  return (
    <>
      <Header title="Settings" />
      <main className="page" style={{ paddingTop: '16px', paddingBottom: '32px', gap: '24px' }}>
        
        {/* Profile Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0D1520 0%, #121C29 100%)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          
          {/* Avatar Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isManager ? 'rgba(255, 184, 0, 0.12)' : 'rgba(29, 123, 255, 0.12)',
            color: isManager ? 'var(--cost)' : 'var(--primary)',
            border: `2px solid ${isManager ? 'var(--cost)' : 'var(--primary)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 16px ${isManager ? 'rgba(255, 184, 0, 0.15)' : 'rgba(29, 123, 255, 0.15)'}`
          }}>
            {isManager ? <Shield size={28} /> : <User size={28} />}
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
              {user?.name || 'User Profile'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '3px' }}>
              {user?.email || 'email@opsfly.com'}
            </p>
          </div>

          {/* Role Badge */}
          <span style={{
            fontSize: '0.72rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '4px 14px',
            borderRadius: '20px',
            background: isManager ? 'rgba(255, 184, 0, 0.15)' : 'rgba(29, 123, 255, 0.15)',
            color: isManager ? 'var(--cost)' : 'var(--primary)',
            border: `1px solid ${isManager ? 'rgba(255,184,0,0.25)' : 'rgba(29,123,255,0.25)'}`
          }}>
            {user?.role || 'Staff'} Member
          </span>

        </div>

        {/* Settings Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          <div style={{
            fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 4px 6px'
          }}>
            Application Options
          </div>

          <div className="compact-list">
            
            <div className="compact-note-item" style={{ cursor: 'default' }}>
              <div className="note-icon-circle">
                <Bell size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="note-text-preview">Push Notifications</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>Disabled (Enable in OS settings)</p>
              </div>
            </div>

            <div className="compact-note-item" style={{ cursor: 'default' }}>
              <div className="note-icon-circle">
                <AppWindow size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="note-text-preview">PWA Offline Mode</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>Active and cached via ServiceWorker</p>
              </div>
            </div>

            <div className="compact-note-item" style={{ cursor: 'default' }}>
              <div className="note-icon-circle">
                <HelpCircle size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="note-text-preview">Support & Guides</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>Help documentation and feedback portal</p>
              </div>
            </div>

          </div>

        </div>

        {/* Log Out Action */}
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '16px 20px', borderRadius: '16px',
            fontFamily: 'inherit', fontWeight: '800', fontSize: '0.95rem',
            background: 'rgba(255, 77, 106, 0.1)', color: 'var(--staffing)',
            border: '1px solid rgba(255, 77, 106, 0.25)', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(255, 77, 106, 0.05)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 77, 106, 0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 77, 106, 0.1)'}
        >
          <LogOut size={18} />
          <span>Log Out of Account</span>
        </button>

      </main>
    </>
  );
}
