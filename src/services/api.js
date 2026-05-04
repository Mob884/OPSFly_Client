import axios from 'axios';

const api = axios.create({
  baseURL: '', 
  timeout: 60000, 
  headers: {
    Accept: 'application/json',
  }
});

// Interceptor for errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

/**
 * Transcribe an audio blob (Placeholder)
 */
export async function transcribeAudio(audioBlob) {
  return { transcript: "" };
}

/**
 * Analyze a transcript via BACKEND API Route
 */
export async function analyzeNote(transcript) {
  const response = await api.post('/api/notes/analyze', { transcript });
  return response.data;
}

/**
 * Save a note to the database via BACKEND API Route
 */
export async function saveNote(data) {
  const response = await api.post('/api/notes/save', data);
  return response.data;
}

/**
 * Fetch all notes
 */
export async function getNotes() {
  const response = await api.get('/api/notes');
  return response.data;
}

/**
 * Delete a specific note
 */
export async function deleteNote(id) {
  const response = await api.delete(`/api/notes/${id}`);
  return response.data;
}

export default api;
