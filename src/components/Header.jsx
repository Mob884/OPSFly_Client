"use client";
import { Bell, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header({ title = 'OpsFly', showBack = false, onBack }) {
  const router = useRouter();
  const handleBack = () => { if (onBack) onBack(); else router.back(); };

  return (
    <header className="header">
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="header-bell">
          <Bell size={20} color="var(--text-secondary)" />
          <div className="header-bell-dot" />
        </div>
        <div className="user-avatar" style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-card-alt)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)'
        }}>F</div>
      </div>
    </header>
  );
}
