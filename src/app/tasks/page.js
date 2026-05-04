import Header from '@/src/components/Header';
import { ClipboardList, Clock } from 'lucide-react';

export const metadata = { title: 'Tasks – OpsFly' };

export default function TasksPage() {
  return (
    <>
      <Header title="Tasks" />
      <main className="coming-soon">
        <div style={{
          width: 72, height: 72, borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(29,123,255,0.2), rgba(0,212,255,0.1))',
          border: '1px solid rgba(29,123,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <ClipboardList size={32} color="var(--primary)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '12px' }}>Task Manager</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '280px' }}>
          AI-detected issues automatically become tasks. Assign, track, and close them from here.
        </p>
        <div style={{
          marginTop: '32px', padding: '16px 24px',
          background: 'var(--bg-card)', borderRadius: '12px',
          border: '1px solid var(--border)', fontSize: '0.85rem',
          color: 'var(--primary)', fontWeight: '700', display: 'flex',
          alignItems: 'center', gap: '8px'
        }}>
          <Clock size={16} /> Coming in Milestone 3
        </div>
      </main>
    </>
  );
}
