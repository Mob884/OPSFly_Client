import axios from 'axios';

// ── Simple in-memory cache ───────────────────────────────────────────────────
const cache = {
  notes: null,
  tasks: null,
};

export function invalidateNotesCache() { cache.notes = null; }
export function invalidateTasksCache() { cache.tasks = null; }

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

/** Save note — auto-creates tasks internally, returns { note, tasks } */
export async function saveNote(data) {
  const response = await api.post('/api/notes/save', data);
  invalidateNotesCache();
  invalidateTasksCache(); // tasks may have been created
  return response.data;
}

export async function getNotes(force = false) {
  if (!force && cache.notes !== null) return cache.notes;
  const response = await api.get('/api/notes');
  cache.notes = response.data;
  return cache.notes;
}

export async function deleteNote(id) {
  const response = await api.delete(`/api/notes/${id}`);
  invalidateNotesCache();
  return response.data;
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function getTasks(force = false) {
  if (!force && cache.tasks !== null) return cache.tasks;
  const response = await api.get('/api/tasks');
  cache.tasks = response.data;
  return cache.tasks;
}

export async function createTask(data) {
  const response = await api.post('/api/tasks/create', data);
  invalidateTasksCache();
  return response.data;
}

export async function completeTask(id) {
  const response = await api.patch(`/api/tasks/${id}/complete`);
  invalidateTasksCache();
  return response.data;
}

export async function reopenTask(id) {
  const response = await api.patch(`/api/tasks/${id}/reopen`);
  invalidateTasksCache();
  return response.data;
}

export async function deleteTask(id) {
  const response = await api.delete(`/api/tasks/${id}/delete`);
  invalidateTasksCache();
  return response.data;
}

export default api;
