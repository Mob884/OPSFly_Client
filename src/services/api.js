import axios from 'axios';

// ── Module-level store (survives tab switches in same session) ────────────────
// Update in-place after mutations instead of nullifying, so tab switches
// always show the correct state without waiting for a new DB round-trip.
const store = {
  notes: null,  // null = never fetched
  tasks: null,
};

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

// ── Notes ────────────────────────────────────────────────────────────────────

export async function analyzeNote(transcript) {
  const response = await api.post('/api/notes/analyze', { transcript });
  return response.data;
}

/** Save note — also invalidates notes + tasks cache (tasks may be created) */
export async function saveNote(data) {
  const response = await api.post('/api/notes/save', data);
  store.notes = null;  // force re-fetch
  store.tasks = null;
  return response.data;
}

/** Fetch notes. force=true always hits DB. */
export async function getNotes(force = false) {
  if (!force && store.notes !== null) return store.notes;
  const response = await api.get('/api/notes');
  store.notes = response.data;
  return store.notes;
}

/** Delete note — removes from cache in-place */
export async function deleteNote(id) {
  const response = await api.delete(`/api/notes/${id}`);
  if (store.notes) store.notes = store.notes.filter(n => n._id !== id);
  return response.data;
}

// Keep backwards compat
export function invalidateNotesCache() { store.notes = null; }

// ── Tasks ────────────────────────────────────────────────────────────────────

/** Fetch tasks. force=true always hits DB. */
export async function getTasks(force = false) {
  if (!force && store.tasks !== null) return store.tasks;
  const response = await api.get('/api/tasks');
  store.tasks = response.data;
  return store.tasks;
}

/** Create task — prepends to cache */
export async function createTask(data) {
  const response = await api.post('/api/tasks', data);
  const newTask = response.data;
  if (store.tasks) {
    const updated = [newTask, ...store.tasks];
    const order = { High: 0, Medium: 1, Low: 2 };
    updated.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3) || new Date(b.createdAt) - new Date(a.createdAt));
    store.tasks = updated;
  }
  return newTask;
}

/** Mark task complete — updates cache in-place with server response */
export async function completeTask(id) {
  const response = await api.patch(`/api/tasks/${id}`, { action: 'complete' });
  const updated = response.data;
  if (store.tasks) store.tasks = store.tasks.map(t => t._id === id ? updated : t);
  return updated;
}

/** Reopen task — updates cache in-place with server response */
export async function reopenTask(id) {
  const response = await api.patch(`/api/tasks/${id}`, { action: 'reopen' });
  const updated = response.data;
  if (store.tasks) store.tasks = store.tasks.map(t => t._id === id ? updated : t);
  return updated;
}

/** Delete task — removes from cache in-place */
export async function deleteTask(id) {
  const response = await api.delete(`/api/tasks/${id}`);
  if (store.tasks) store.tasks = store.tasks.filter(t => t._id !== id);
  return response.data;
}

// Keep backwards compat
export function invalidateTasksCache() { store.tasks = null; }

/** Assign task to a user */
export async function assignTask(id, assignedTo) {
  const response = await api.patch(`/api/tasks/${id}`, { action: 'assign', assignedTo });
  const updated = response.data;
  if (store.tasks) store.tasks = store.tasks.map(t => t._id === id ? updated : t);
  return updated;
}

// ── Summary (M4) ─────────────────────────────────────────────────────────────

/** Fetch (or generate) today's daily summary */
export async function getTodaySummary() {
  const response = await api.get('/api/summary/today');
  return response.data;
}

/** Force-regenerate today's daily summary */
export async function generateTodaySummary() {
  const response = await api.post('/api/summary/today');
  return response.data;
}

/** Fetch summary for a specific date (YYYY-MM-DD) */
export async function getSummaryByDate(date) {
  const response = await api.get(`/api/summary/${date}`);
  return response.data;
}

/** Fetch list of all past summaries (lightweight) */
export async function getSummaryList() {
  const response = await api.get('/api/summary/list');
  return response.data;
}

// ── Business DNA (M2) ─────────────────────────────────────────────────────────

/** Industry config (category pills, labels) for the current org. */
export const getIndustryConfig = () => api.get('/api/config').then((r) => r.data);

export const getBusinessProfile = () => api.get('/api/dna/profile').then((r) => r.data);
export const saveBusinessProfile = (data) => api.post('/api/dna/profile', data).then((r) => r.data);

export const getAssets = (params) => api.get('/api/dna/assets', { params }).then((r) => r.data);
export const addAsset = (data) => api.post('/api/dna/assets', data).then((r) => r.data);
export const updateAsset = (id, data) => api.put(`/api/dna/assets/${id}`, data).then((r) => r.data);
export const deleteAsset = (id) => api.delete(`/api/dna/assets/${id}`).then((r) => r.data);

export const getVendors = (params) => api.get('/api/dna/vendors', { params }).then((r) => r.data);
export const addVendor = (data) => api.post('/api/dna/vendors', data).then((r) => r.data);
export const updateVendor = (id, data) => api.put(`/api/dna/vendors/${id}`, data).then((r) => r.data);
export const deleteVendor = (id) => api.delete(`/api/dna/vendors/${id}`).then((r) => r.data);

/** Upload a raw file (FormData with a 'file' field) → { fileKey, signedUrl }. */
export const uploadFile = (formData) => api.post('/api/upload', formData).then((r) => r.data);

export const getDocuments = (params) => api.get('/api/dna/documents', { params }).then((r) => r.data);
export const uploadDocument = (data) => api.post('/api/dna/documents', data).then((r) => r.data);
export const deleteDocument = (id) => api.delete(`/api/dna/documents/${id}`).then((r) => r.data);

export const getDNAEntries = (params) => api.get('/api/dna/entries', { params }).then((r) => r.data);
export const addDNAEntry = (data) => api.post('/api/dna/entries', data).then((r) => r.data);
export const updateDNAEntry = (id, data) => api.put(`/api/dna/entries/${id}`, data).then((r) => r.data);

export const getOnboardingStatus = () => api.get('/api/dna/onboarding/status').then((r) => r.data);
export const updateOnboardingStep = (step) => api.patch('/api/dna/onboarding/step', { step }).then((r) => r.data);

// ── Notifications ────────────────────────────────────────────────────────────

/** Fetch recent notifications for logged in user */
export async function getNotifications() {
  const response = await api.get('/api/notifications');
  return response.data;
}

/** Mark all or specific notifications as read */
export async function markNotificationsAsRead(ids = null) {
  const response = await api.patch('/api/notifications', { ids });
  return response.data;
}

export default api;

