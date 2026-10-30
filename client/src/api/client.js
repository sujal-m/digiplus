import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthRoute) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('token', data.data.token);
          error.config.headers.Authorization = `Bearer ${data.data.token}`;
          return api(error.config);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.patch(`/users/${id}`, data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Meetings API
export const meetingsAPI = {
  list: (params) => api.get('/meetings', { params }),
  create: (data) => api.post('/meetings', data),
  get: (id) => api.get(`/meetings/${id}`),
  update: (id, data) => api.patch(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`),
  complete: (id) => api.post(`/meetings/${id}/complete`),
  addParticipants: (id, data) => api.post(`/meetings/${id}/participants`, data),
  addAgendaItem: (id, data) => api.post(`/meetings/${id}/agenda`, data),
  addDecision: (id, data) => api.post(`/meetings/${id}/decisions`, data),
  updateNotes: (id, notes) => api.post(`/meetings/${id}/notes`, { notes }),
  carryForward: (id, taskIds) => api.post(`/meetings/${id}/carry-forward`, { taskIds }),
};

// Handovers API
export const handoversAPI = {
  list: (params) => api.get('/handovers', { params }),
  create: (data) => api.post('/handovers', data),
  get: (id) => api.get(`/handovers/${id}`),
  update: (id, data) => api.patch(`/handovers/${id}`, data),
  submit: (id) => api.post(`/handovers/${id}/submit`),
  accept: (id, notes) => api.post(`/handovers/${id}/accept`, { notes }),
  reject: (id, reason) => api.post(`/handovers/${id}/reject`, { reason }),
  complete: (id) => api.post(`/handovers/${id}/complete`),
  carryForward: (id, taskIds) => api.post(`/handovers/${id}/carry-forward`, { taskIds }),
};

// Tasks API
export const tasksAPI = {
  list: (params) => api.get('/tasks', { params }),
  create: (data) => api.post('/tasks', data),
  getMyTasks: (params) => api.get('/tasks/my', { params }),
  get: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  reassign: (id, assignedTo) => api.patch(`/tasks/${id}/reassign`, { assignedTo }),
  recordOutcome: (id, outcome) => api.post(`/tasks/${id}/outcome`, outcome),
  addComment: (id, content) => api.post(`/tasks/${id}/comments`, { content }),
  getHistory: (id) => api.get(`/tasks/${id}/history`),
};

// Decisions API
export const decisionsAPI = {
  list: (params) => api.get('/decisions', { params }),
  create: (data) => api.post('/decisions', data),
  get: (id) => api.get(`/decisions/${id}`),
  update: (id, data) => api.patch(`/decisions/${id}`, data),
};

// Knowledge API
export const knowledgeAPI = {
  listDocuments: (params) => api.get('/knowledge/documents', { params }),
  uploadDocument: (formData) => api.post('/knowledge/documents', formData),
  getDocument: (id) => api.get(`/knowledge/documents/${id}`),
  downloadDocument: (id) => api.get(`/knowledge/documents/${id}/download`, { responseType: 'blob' }),
  deleteDocument: (id) => api.delete(`/knowledge/documents/${id}`),
  search: (params) => api.get('/knowledge/search', { params }),
  suggestLinks: (data) => api.post('/knowledge/suggest-links', data),
  getLinks: (params) => api.get('/knowledge/links', { params }),
  createLink: (data) => api.post('/knowledge/links', data),
  confirmLink: (id) => api.patch(`/knowledge/links/${id}/confirm`),
};

// Notifications API
export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// AI API
export const aiAPI = {
  extract: (data) => api.post('/ai/extract', data),
  recap: (data) => api.post('/ai/recap', data),
  brief: (data) => api.post('/ai/brief', data),
  handoverSummary: (data) => api.post('/ai/handover-summary', data),
  contextScore: (data) => api.post('/ai/context-score', data),
};

// Activity API
export const activityAPI = {
  list: (params) => api.get('/activity', { params }),
};

export default api;
