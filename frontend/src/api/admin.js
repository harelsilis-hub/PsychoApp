import apiClient from './client';

export const adminAPI = {
  getUsers: async () => {
    const res = await apiClient.get('/v1/admin/users');
    return res.data;
  },

  getStats: async () => {
    const res = await apiClient.get('/v1/admin/stats');
    return res.data;
  },

  getFlagged: async () => {
    const res = await apiClient.get('/v1/admin/flagged');
    return res.data;
  },

  searchWords: async (q) => {
    const res = await apiClient.get('/v1/admin/words/search', { params: { q } });
    return res.data;
  },

  editWord: async (wordId, { english, hebrew }) => {
    const res = await apiClient.patch(`/v1/admin/words/${wordId}`, { english, hebrew });
    return res.data;
  },

  deleteWord: async (wordId) => {
    const res = await apiClient.delete(`/v1/admin/words/${wordId}`);
    return res.data;
  },

  addWord: async ({ english, hebrew, unit }) => {
    const res = await apiClient.post('/v1/admin/words', { english, hebrew, unit });
    return res.data;
  },

  submitFeedback: async ({ message, category }) => {
    const res = await apiClient.post('/v1/admin/feedback', { message, category });
    return res.data;
  },

  getFeedback: async () => {
    const res = await apiClient.get('/v1/admin/feedback');
    return res.data;
  },

  markFeedbackRead: async (id) => {
    const res = await apiClient.patch(`/v1/admin/feedback/${id}/read`);
    return res.data;
  },
};
