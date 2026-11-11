"use client";
import { useRef, useState, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { getPendingPhoto, setPendingPhoto, clearPendingPhoto } from '@/src/services/photoStore';

/**
 * M5: "Add Photo" control. Opens the camera on phones (file picker on
 * desktop), compresses the image, and keeps it attached until the note is sent.
 * Pass className="input-row" on Home to match the other input rows.
 */
export default function PhotoAttach({ className = '', disabled = false, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = getPendingPhoto()?.previewUrl || null;
    setPreview(url);
    onChange?.(!!url);
  }, []);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const p = await setPendingPhoto(file);
      setPreview(p.previewUrl);
      onChange?.(true);
    } catch (err) {
      setError(err.message || 'Could not use that photo');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    clearPendingPhoto();
    setPreview(null);
    onChange?.(false);
  };

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: 'none' }} data-testid="photo-input" />
      {preview ? (
        <>
          <img src={preview} alt="Attached" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>Photo attached</span>
          <button type="button" onClick={remove} aria-label="Remove photo" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit', width: '100%', textAlign: 'left' }}
        >
          {busy ? <Loader2 size={20} className="spinner" /> : <Camera size={20} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{busy ? 'Preparing photo...' : 'Add Photo'}</span>
        </button>
      )}
      {error && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{error}</span>}
    </div>
  );
}
