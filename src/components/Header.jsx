"use client";
import React, { useState } from 'react';
import { Bell, ChevronLeft, LogOut, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';

export default function Header({ title = 'OpsFly', showBack = false, onBack }) {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleBack = () => { if (onBack) onBack(); else router.back(); };

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';
  const isManager = user?.role === 'Manager';

  const handleLogoutClick = () => {
    logout();
    setDropdownOpen(false);
    router.push('/login');
  };

  return (
    <header className="header" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showBack && (
          <button onClick={handleBack} className="back-btn">
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="header-logo-group">
          {!showBack && (
            <div style={{
              width: 30, height: 30, borderRadius: '8px',
              background: 'linear-gradient(135deg, #1D7BFF, #00D4FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '0.85rem', color: '#fff'
            }}>O</div>
          )}
          <span className="header-logo-text">{title}</span>
        </div>
      </div>

      {isAuthenticated && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <div className="header-bell" style={{ cursor: 'pointer' }}>
            <Bell size={20} color="var(--text-secondary)" />
            <div className="header-bell-dot" />
          </div>

          {/* Dynamic Initial Avatar */}
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isManager ? 'rgba(255, 184, 0, 0.1)' : 'rgba(29, 123, 255, 0.1)',
              border: `1px solid ${isManager ? 'rgba(255, 184, 0, 0.3)' : 'rgba(29, 123, 255, 0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.85rem',
              color: isManager ? 'var(--cost)' : 'var(--primary)',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: dropdownOpen ? `0 0 10px ${isManager ? 'rgba(255, 184, 0, 0.3)' : 'rgba(29, 123, 255, 0.3)'}` : 'none',
              transition: 'all 0.2s',
            }}
          >
            {userInitial}
          </button>

          {/* Premium Settings & Logout Dropdown */}
          {dropdownOpen && (
            <>
              {/* Click-away backdrop */}
              <div
                onClick={() => setDropdownOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 999 }}
              />
              <div style={{
                position: 'absolute', right: 0, top: '42px', zIndex: 1000,
                background: '#0D1520', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '12px 0', minWidth: '190px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                <div style={{ padding: '4px 16px 8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800, marginTop: '2px' }}>
                    {user?.role}
                  </div>
                </div>

                <button
                  onClick={handleLogoutClick}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                    color: 'var(--staffing)', fontSize: '0.82rem', fontWeight: '800',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 77, 106, 0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
