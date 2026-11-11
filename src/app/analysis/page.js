"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, AlertTriangle, Users, DollarSign,
  Wrench, Edit2, Trash2, Loader2, ClipboardList
} from 'lucide-react';
import Header from '@/src/components/Header';
import RecallCard from '@/src/components/RecallCard';
import { saveNote, getAssets, getVendors } from '@/src/services/api';
import { Link2, Check, Camera } from 'lucide-react';

const SEVERITY_COLOR = { high: '#EF4444', medium: '#FF8A00', low: '#22C55E' };

function getSeverityColor(sev) {
  return SEVERITY_COLOR[sev?.toLowerCase()] || 'var(--primary)';
}

function getIssueIcon(type) {
  switch (type) {
    case 'Staffing':    return <Users size={16} />;
    case 'Cost Risk':   return <DollarSign size={16} />;
    case 'Maintenance': return <Wrench size={16} />;
    default:            return <AlertTriangle size={16} />;
  }
}

export default function AnalysisPage() {
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [savedTasks, setSavedTasks] = useState(null); // null = not saved yet, [] = saved with no tasks
  const [savedRecall, setSavedRecall] = useState(null);
  const [dnaMatches, setDnaMatches] = useState({}); // { issueIdx: { kind: 'asset'|'vendor', id, name } }
  const [linkedIssues, setLinkedIssues] = useState({}); // { issueIdx: true } — user-confirmed links

  useEffect(() => {
    const data = sessionStorage.getItem('lastAnalysis');
    if (data) {
      const parsed = JSON.parse(data);
      setAnalysisData(parsed);
      setEditedTranscript(parsed.transcript || (parsed.photo?.analysis?.description ? `Photo: ${parsed.photo.analysis.description}` : ''));
    } else {
      router.push('/');
    }
  }, []);

  // Best-effort keyword match against existing Business DNA (equipment +
  // vendors) so a manager can link an issue to the asset it's about without
  // typing it in twice. No match found is the common, expected case.
  useEffect(() => {
    if (!analysisData?.issues?.length) return;
    (async () => {
      try {
        const [assets, vendors] = await Promise.all([getAssets({}), getVendors({})]);
        const matches = {};
        analysisData.issues.forEach((issue, idx) => {
          const words = `${issue.quote || ''} ${issue.type || ''}`.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
          const asset = (assets || []).find((a) => {
            const name = (a.name || '').toLowerCase();
            return name && words.some((w) => name.includes(w) || w.includes(name.split(' ')[0]));
          });
          if (asset) { matches[idx] = { kind: 'asset', id: asset._id, name: asset.name }; return; }
          const vendor = (vendors || []).find((v) => words.some((w) => (v.category || '').toLowerCase().includes(w)));
          if (vendor) matches[idx] = { kind: 'vendor', id: vendor._id, name: vendor.name };
        });
        // M5: issues Vision AI found in the photo are linked to the photo's
        // equipment / vendor automatically (the manager can still un-link).
        const link = analysisData.photo?.link;
        const auto = {};
        if (link) {
          analysisData.issues.forEach((issue, idx) => {
            if (!issue.fromPhoto) return;
            if (link.assetId) { matches[idx] = { kind: 'asset', id: link.assetId, name: link.assetName }; auto[idx] = true; }
            else if (link.vendorId) { matches[idx] = { kind: 'vendor', id: link.vendorId, name: link.vendorName }; auto[idx] = true; }
          });
        }
        setDnaMatches(matches);
        if (Object.keys(auto).length) setLinkedIssues((prev) => ({ ...auto, ...prev }));
      } catch {
        // DNA linking is a nice-to-have — never block the save flow on it.
      }
    })();
  }, [analysisData]);

  if (!analysisData) return null;

  const { issues = [] } = analysisData;
  const photoSrc = analysisData.photo?.previewUrl
    || (analysisData.photo?.signedUrl && !analysisData.photo.signedUrl.includes('mock-storage') ? analysisData.photo.signedUrl : null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const issuesToSave = issues.map((issue, idx) => {
        if (!linkedIssues[idx] || !dnaMatches[idx]) return issue;
        const key = dnaMatches[idx].kind === 'asset' ? 'assetId' : 'vendorId';
        return { ...issue, [key]: dnaMatches[idx].id };
      });
      const result = await saveNote({
        transcript: editedTranscript,
        source: analysisData.source || 'voice',
        captureSource: 'web',
        issues: issuesToSave,
        analyzedAt: analysisData.analyzedAt || new Date(),
        mediaFiles: analysisData.photo
          ? [{
              fileKey: analysisData.photo.fileKey,
              mimeType: analysisData.photo.mimeType,
              aiAnalysis: analysisData.photo.analysis?.description || '',
              equipmentHint: analysisData.photo.analysis?.equipmentHint || '',
              tags: analysisData.photo.analysis?.tags || [],
              linkedAssetId: analysisData.photo.link?.assetId || undefined,
              linkedVendorId: analysisData.photo.link?.vendorId || undefined,
            }]
          : undefined,
      });
      // Show the auto-created tasks (+ any recalled history for this note)
      setSavedTasks(result.tasks || []);
      setSavedRecall(result.recall || null);
      sessionStorage.removeItem('lastAnalysis');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── POST-SAVE: show tasks created ──────────────────────────────────────────
  if (savedTasks !== null) {
    return (
      <>
        <Header showBack title="Saved!" />
        <main className="page">
          <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <CheckCircle2 size={32} color="#22C55E" />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>Note Saved!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {savedTasks.length > 0
                ? `${savedTasks.length} task${savedTasks.length > 1 ? 's' : ''} created automatically.`
                : 'No issues detected — no tasks created.'}
            </p>
          </div>

          {savedTasks.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Tasks Created
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {savedTasks.map((task, i) => {
                  const color = SEVERITY_COLOR[task.priority?.toLowerCase()] || '#FF8A00';
                  return (
                    <div key={i} style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 14, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: color, boxShadow: `0 0 6px ${color}80`,
                      }} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{task.title}</span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 4,
                        background: `${color}20`, color,
                      }}>{task.priority}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {savedRecall?.hasHistory && (
            <div style={{ marginTop: savedTasks.length > 0 ? 16 : 0 }}>
              <RecallCard recall={savedRecall} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {savedTasks.length > 0 && (
              <button className="confirm-btn" onClick={() => router.push('/tasks')}>
                <ClipboardList size={18} /> View Tasks
              </button>
            )}
            <button className="secondary-btn" onClick={() => router.push('/')}>
              Back to Home
            </button>
          </div>
        </main>
      </>
    );
  }

  // ── PRE-SAVE: show analysis & confirm ─────────────────────────────────────
  return (
    <>
      <Header showBack title="Note Analysis" />
      <main className="page">
        {/* Status checklist */}
        <div className="status-list">
          <div className="status-item">
            <div className="status-check"><CheckCircle2 size={14} /></div>
            Note processed
          </div>
          <div className="status-item">
            <div className="status-check"><CheckCircle2 size={14} /></div>
            Transcribed
          </div>
          <div className="status-item">
            <div className="status-check"><CheckCircle2 size={14} /></div>
            {issues.length > 0 ? `${issues.length} issue${issues.length > 1 ? 's' : ''} detected` : 'No issues detected'}
          </div>
        </div>

        {/* M5: attached photo + what Vision AI saw */}
        {analysisData.photo && (
          <div className="transcript-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {photoSrc ? (
              <img src={photoSrc} alt="Attached" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
            ) : null}
            <div style={{ flex: 1 }}>
              <div className="transcript-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={13} /> Photo analysis</div>
              <p className="transcript-text" style={{ fontSize: '0.9rem' }}>
                {analysisData.photo.analysis?.description || 'The photo is attached. AI analysis is not available right now.'}
              </p>
              {(analysisData.photo.link?.assetName || analysisData.photo.link?.vendorName || analysisData.photo.link?.area) && (
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {analysisData.photo.link?.assetName && <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(34,197,94,0.12)' }}>Equipment: {analysisData.photo.link.assetName}</span>}
                  {analysisData.photo.link?.vendorName && <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(29,123,255,0.12)' }}>Vendor: {analysisData.photo.link.vendorName}</span>}
                  {analysisData.photo.link?.area && <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>Area: {analysisData.photo.link.area}</span>}
                </div>
              )}
            </div>
          </div>
        )}
        {analysisData.photoError && (
          <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.82rem' }}>
            {analysisData.photoError}
          </div>
        )}

        {/* Transcript card */}
        <div className="transcript-card">
          <div className="transcript-label">Transcript</div>
          {isEditing ? (
            <textarea
              value={editedTranscript}
              onChange={e => setEditedTranscript(e.target.value)}
              autoFocus
              style={{
                width: '100%', minHeight: '100px', background: 'var(--bg-card-alt)',
                padding: '12px', borderRadius: '12px', border: '1px solid var(--primary)',
                color: '#fff', fontSize: '0.95rem', lineHeight: 1.6,
                outline: 'none', fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          ) : (
            <p className="transcript-text">{editedTranscript || 'No transcript available.'}</p>
          )}
        </div>

        {/* Detected Issues */}
        <div>
          <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Detected Issues ({issues.length})
          </h3>

          {issues.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {issues.map((issue, idx) => {
                const color = getSeverityColor(issue.severity);
                return (
                  <div key={idx} style={{
                    background: 'var(--bg-card)', padding: '16px', borderRadius: '16px',
                    border: `1px solid ${color}30`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ background: `${color}15`, color, borderRadius: 8, padding: '6px', display: 'flex' }}>
                        {getIssueIcon(issue.type)}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1 }}>{issue.type}</span>
                      {issue.fromPhoto && <span title="Found in the photo" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: 'var(--text-secondary)' }}><Camera size={12} /> Photo</span>}
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                        padding: '3px 8px', borderRadius: 4,
                        background: `${color}20`, color, border: `1px solid ${color}40`,
                      }}>{issue.severity}</span>
                    </div>
                    {issue.quote && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        "{issue.quote}"
                      </p>
                    )}
                    {issue.suggestedTask && (
                      <div style={{
                        marginTop: 10, padding: '8px 12px',
                        background: 'rgba(29,123,255,0.08)', borderRadius: 8,
                        fontSize: '0.8rem', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <ClipboardList size={13} />
                        Task will be created: <strong>{issue.suggestedTask}</strong>
                      </div>
                    )}
                    {dnaMatches[idx] && (
                      <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 8,
                        background: linkedIssues[idx] ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${linkedIssues[idx] ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <Link2 size={13} color={linkedIssues[idx] ? '#22C55E' : 'var(--text-secondary)'} />
                        <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          This looks related to <strong style={{ color: '#fff' }}>{dnaMatches[idx].name}</strong>. Link it?
                        </span>
                        <button
                          onClick={() => setLinkedIssues((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999,
                            border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800,
                            background: linkedIssues[idx] ? '#22C55E' : 'var(--primary)', color: '#fff',
                          }}
                        >
                          {linkedIssues[idx] ? <><Check size={11} /> Linked</> : 'Yes'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '24px', background: 'var(--bg-card-alt)',
              borderRadius: '16px', color: 'var(--text-muted)', fontSize: '0.9rem',
            }}>
              No operational issues detected.
            </div>
          )}
        </div>

        {/* Actions */}
        <button className="confirm-btn" onClick={handleSave} disabled={isSaving} style={{ marginTop: 8 }}>
          {isSaving ? <Loader2 size={20} className="spinner" /> : <CheckCircle2 size={20} />}
          {isSaving ? 'Saving & Creating Tasks...' : 'Confirm & Save'}
        </button>

        <div style={{ display: 'flex', gap: '10px', marginBottom: 40 }}>
          <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setIsEditing(!isEditing)}>
            <Edit2 size={16} /> {isEditing ? 'Done Editing' : 'Edit Note'}
          </button>
          <button className="secondary-btn" style={{ flex: 0, width: 56, color: '#EF4444' }} onClick={() => router.push('/')}>
            <Trash2 size={16} />
          </button>
        </div>
      </main>
    </>
  );
}
