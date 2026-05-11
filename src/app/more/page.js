import Header from '@/src/components/Header';
import { Settings, Clock } from 'lucide-react';

export const metadata = { title: 'More – OpsFly' };

export default function MorePage() {
  return (
    <div>
      <Header title="More" />
      <main className="coming-soon">
        <div style={{
          width: 72, height: 72, borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(29,123,255,0.2), rgba(0,212,255,0.1))',
          border: '1px solid rgba(29,123,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <Settings size={32} color="var(--primary)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '12px' }}>Settings & Profile</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '280px' }}>
          Manage your account, venue profile, notification preferences, and more.
        </p>
        <div style={{
          marginTop: '32px', padding: '16px 24px',
          background: 'var(--bg-card)', borderRadius: '12px',
          border: '1px solid var(--border)', fontSize: '0.85rem',
          color: 'var(--primary)', fontWeight: '700', display: 'flex',
          alignItems: 'center', gap: '8px'
        }}>
          <Clock size={16} /> Coming in Milestone 4
        </div>
      </main>
    </div>
  );
}
