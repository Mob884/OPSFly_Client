"use client";
import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { getSignedFileUrl } from '@/src/services/api';

/** M5: thumbnail for the first photo attached to a note (signed URL fetched on demand). */
export default function NotePhoto({ note }) {
  const media = (note?.mediaFiles || []).find((m) => m.fileType === 'image');
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    if (media?.fileKey) getSignedFileUrl(media.fileKey).then((u) => alive && setUrl(u)).catch(() => {});
    return () => { alive = false; };
  }, [media?.fileKey]);
  if (!media) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      {url && !url.includes('mock-storage') ? (
        <img src={url} alt="Note photo" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--bg-card-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Camera size={20} color="var(--text-muted)" />
        </div>
      )}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        {media.aiAnalysis || 'Photo attached'}
        {media.area ? <div style={{ color: 'var(--text-muted)' }}>Area: {media.area}</div> : null}
      </div>
    </div>
  );
}
