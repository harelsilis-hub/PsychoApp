import apiClient from './client';

export const reviewAPI = {
  getReviewSession: async (limit = 20, language = 'en') => {
    const response = await apiClient.get('/v1/review/session', { params: { limit, language } });
    return response.data;
  },

  submitReview: async (wordId, quality, isDailyReview = false) => {
    const response = await apiClient.post('/v1/review/submit', {
      word_id: wordId,
      quality,
      is_daily: isDailyReview,
    });
    return response.data;
  },

  getReviewStats: async () => {
    const response = await apiClient.get('/v1/review/stats');
    return response.data;
  },

  getUnitWords: async (unit, limit = 50, language = 'en') => {
    const response = await apiClient.get(`/v1/review/unit/${unit}`, { params: { limit, language } });
    return response.data;
  },

  getFilterWords: async (unit, language = 'en') => {
    const response = await apiClient.get(`/v1/review/unit/${unit}/filter`, { params: { language, limit: 500 } });
    return response.data;
  },

  getLearnedWords: async (unit, language = 'en') => {
    const response = await apiClient.get(`/v1/review/unit/${unit}/learned`, { params: { language } });
    return response.data;
  },

  getAllLearningWords: async (language = 'en') => {
    const response = await apiClient.get('/v1/review/learning/all', { params: { language } });
    return response.data;
  },

  getAllLearnedWords: async (language = 'en') => {
    const response = await apiClient.get('/v1/review/learned/all', { params: { language } });
    return response.data;
  },

  flagWord: async (wordId) => {
    const response = await apiClient.post(`/v1/admin/flag/${wordId}`);
    return response.data;
  },

  // ── Phase 2: Global Daily Review ──────────────────────────────────────────
  getDailyCount: async (language = 'en') => {
    const response = await apiClient.get('/v1/review/daily/count', { params: { language } });
    return response.data;
  },

  getDailyReview: async (limit = 20, language = 'en') => {
    const response = await apiClient.get('/v1/review/daily', { params: { limit, language } });
    return response.data;
  },

  // ── Cram Mode (stateless extra practice) ─────────────────────────────────
  getCramWords: async (limit = 20, language = 'en') => {
    const response = await apiClient.get('/v1/review/cram', { params: { limit, language } });
    return response.data;
  },

  submitCram: async (wordId, quality) => {
    const response = await apiClient.post('/v1/review/cram/submit', {
      word_id: wordId,
      quality,
    });
    return response.data;
  },

  // ── Phase 1: Unit Acquisition Quiz ───────────────────────────────────────
  getAcquisitionWords: async (unit, language = 'en') => {
    const response = await apiClient.get(`/v1/review/unit/${unit}/acquisition`, { params: { language } });
    return response.data;
  },

  submitAcquisition: async (wordId, quality) => {
    const response = await apiClient.post('/v1/review/acquisition/submit', {
      word_id: wordId,
      quality,
    });
    return response.data;
  },
};
