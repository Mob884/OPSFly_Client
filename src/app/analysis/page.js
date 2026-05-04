"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, AlertTriangle, Users, DollarSign, Wrench, FileText, Trash2, Edit2, Loader2 } from 'lucide-react';
import Header from '@/src/components/Header';
import { saveNote } from '@/src/services/api';

/**
 * Note Analysis Page — Converted to Next.js
 */
export default function AnalysisPage() {
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');

  useEffect(() => {
    const data = sessionStorage.getItem('lastAnalysis');
    if (data) {
      const parsed = JSON.parse(data);
      setAnalysisData(parsed);
      setEditedTranscript(parsed.transcript);
    } else {
      router.push('/');
    }
  }, []);

  if (!analysisData) return null;

  const { issues = [] } = analysisData;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveNote({
        transcript: editedTranscript,
        source: analysisData.source || 'voice',
        issues: issues,
        analyzedAt: analysisData.analyzedAt || new Date()
      });
      router.push('/');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'high': return '#FF4D6A';
      case 'medium': return '#FFB800';
      case 'low': return '#00D68F';
      default: return 'var(--primary)';
    }
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case 'Staffing': return <Users size={16} />;
      case 'Cost Risk': return <DollarSign size={16} />;
      case 'Maintenance': return <Wrench size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  return (
    <>
      <Header showBack title="Note Analysis" />
      
      <main className="page">
        <div className="status-list">
          <div className="status-item">
            <div className="status-check"><CheckCircle2 size={14} /></div>
            Note processed successfully
          </div>
          <div className="status-item">
            <div className="status-check"><CheckCircle2 size={14} /></div>
            Transcribed
          </div>
          <div className="status-item">
            <div className="status-check"><CheckCircle2 size={14} /></div>
            Analyzed
          </div>
        </div>

        <div className="transcript-card">
          <div className="transcript-label">Transcript</div>
          {isEditing ? (
            <textarea 
              className="home-text-input"
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              autoFocus
              style={{ width: '100%', minHeight: '100px', background: 'var(--bg-card-alt)', padding: '12px', borderRadius: '12px', border: '1px solid var(--primary)' }}
            />
          ) : (
            <p className="transcript-text">{editedTranscript || 'No transcript available.'}</p>
          )}
        </div>

        <div style={{ marginTop: '24px', marginBottom: '24px' }}>
           <h3 style={{ fontSize: '0.9rem', marginBottom: '16px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             Detected Issues ({issues.length})
           </h3>
           
           {issues.length > 0 ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {issues.map((issue, idx) => (
                 <div key={idx} className="task-item" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                     <div className="task-icon-box" style={{ background: 'rgba(255,255,255,0.05)', color: getSeverityColor(issue.severity) }}>
                       {getIssueIcon(issue.type)}
                     </div>
                     <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{issue.type}</span>
                         <span className="task-badge" style={{ background: `${getSeverityColor(issue.severity)}20`, color: getSeverityColor(issue.severity), border: `1px solid ${getSeverityColor(issue.severity)}40` }}>
                           {issue.severity}
                         </span>
                       </div>
                     </div>
                   </div>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '8px 0' }}>
                     "{issue.quote}"
                   </p>
                 </div>
               ))}
             </div>
           ) : (
             <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-card-alt)', borderRadius: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
               No operational issues detected.
             </div>
           )}
        </div>

        <button 
          className="confirm-btn" 
          onClick={handleSave}
          disabled={isSaving}
          style={{ marginTop: '20px' }}
        >
          {isSaving ? <Loader2 size={20} className="spinner" /> : <CheckCircle2 size={20} />}
          {isSaving ? 'Processing...' : 'Confirm & Save'}
        </button>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', marginBottom: '40px' }}>
          <button 
            className="secondary-btn" 
            style={{ flex: 1 }}
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit2 size={18} />
            {isEditing ? 'Finish' : 'Edit Note'}
          </button>
          <button 
            className="secondary-btn" 
            style={{ flex: 0, color: 'var(--staffing)', width: '60px' }}
            onClick={() => router.push('/')}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </main>
    </>
  );
}
