import axios from 'axios';

// ── Simple in-memory cache ───────────────────────────────────────────────────
// Notes are cached until a new note is saved or deleted, preventing unnecessary
// network calls every time the user switches tabs.
const cache = {
  notes: null,       // null = not yet fetched
  notesEtag: null,   // future: use ETag/timestamp for validation
};

/** Call this whenever we write/delete a note so the cache is invalidated */
export function invalidateNotesCache() {
  cache.notes = null;
}

// ── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '',
  timeout: 60000,
  headers: { Accept: 'application/json' },
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

// ── API Functions ────────────────────────────────────────────────────────────

/** Analyze a transcript via the backend AI route */
export async function analyzeNote(transcript) {
  const response = await api.post('/api/notes/analyze', { transcript });
  return response.data;
}

/** Save a note — also invalidates the cache */
export async function saveNote(data) {
  const response = await api.post('/api/notes/save', data);
  invalidateNotesCache(); // force re-fetch next time
  return response.data;
}

/**
 * Fetch all notes — uses in-memory cache.
 * @param {boolean} force  Pass true to skip cache and always fetch fresh data.
 */
export async function getNotes(force = false) {
  if (!force && cache.notes !== null) {
    return cache.notes;
  }
  const response = await api.get('/api/notes');
  cache.notes = response.data;
  return cache.notes;
}

/** Delete a note — also invalidates the cache */
export async function deleteNote(id) {
  const response = await api.delete(`/api/notes/${id}`);
  invalidateNotesCache();
  return response.data;
}

export default api;
