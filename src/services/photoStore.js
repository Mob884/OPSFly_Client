import { analyzePhoto } from '@/src/services/api';

// M5: the photo a manager attaches before sending a note. It lives in memory
// (not sessionStorage) so it survives the client-side hop from Home or the
// Recording screen to the Analysis screen without being serialized.
let pending = null; // { blob, previewUrl }

export function getPendingPhoto() {
  return pending;
}

export function clearPendingPhoto() {
  if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
  pending = null;
}

// Hands the preview URL over to the Analysis screen without revoking it.
function releasePendingPhoto() {
  pending = null;
}

function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Phone cameras produce 3-8MB images, but the upload endpoint caps at 4MB (the
 * hosting platform's own request limit is ~4.5MB). Scale to 1600px and
 * re-encode as JPEG, stepping quality down until it fits.
 */
export async function compressImage(file, maxDim = 1600) {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= 3.5 * 1024 * 1024) return blob;
  }
  throw new Error('Photo is too large to upload');
}

export async function setPendingPhoto(file) {
  const blob = await compressImage(file);
  clearPendingPhoto();
  pending = { blob, previewUrl: URL.createObjectURL(blob) };
  return pending;
}

/**
 * Adds the pending photo (if any) to a note analysis: Vision AI reads it
 * together with the note text, extra issues are merged in, and the stored
 * photo reference travels with the note to /api/notes/save. A failed photo
 * never blocks the note.
 */
export async function attachPhotoToAnalysis(data) {
  const photo = pending;
  if (!photo) return data;
  try {
    const r = await analyzePhoto(photo.blob, data.transcript || '');
    const merged = {
      ...data,
      issues: [...(data.issues || []), ...(r.issues || [])],
      photo: {
        fileKey: r.fileKey,
        mimeType: r.mimeType,
        signedUrl: r.signedUrl,
        previewUrl: photo.previewUrl,
        analysis: r.analysis,
        link: r.link,
      },
    };
    releasePendingPhoto();
    return merged;
  } catch (err) {
    console.error('Photo analysis failed:', err);
    releasePendingPhoto();
    return { ...data, photoError: 'The photo could not be uploaded, so this note will be saved without it.' };
  }
}
