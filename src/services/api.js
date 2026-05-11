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
  const response = await api.post('/api/tasks/create', data);
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
  const response = await api.patch(`/api/tasks/${id}/complete`);
  const updated = response.data;
  if (store.tasks) {
    store.tasks = store.tasks.map(t => t._id === id ? updated : t);
  }
  return updated;
}

/** Reopen task — updates cache in-place with server response */
export async function reopenTask(id) {
  const response = await api.patch(`/api/tasks/${id}/reopen`);
  const updated = response.data;
  if (store.tasks) {
    store.tasks = store.tasks.map(t => t._id === id ? updated : t);
  }
  return updated;
}

/** Delete task — removes from cache in-place */
export async function deleteTask(id) {
  const response = await api.delete(`/api/tasks/${id}/delete`);
  if (store.tasks) {
    store.tasks = store.tasks.filter(t => t._id !== id);
  }
  return response.data;
}

// Keep backwards compat
export function invalidateTasksCache() { store.tasks = null; }

export default api;
